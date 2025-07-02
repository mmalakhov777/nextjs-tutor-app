const { neon } = require('@neondatabase/serverless');
const sharp = require('sharp');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Get database connection
const chatDbConnectionString = process.env.CHAT_DATABASE_URL;
if (!chatDbConnectionString) {
  console.error('❌ CHAT_DATABASE_URL environment variable is not set!');
  process.exit(1);
}

const sql = neon(chatDbConnectionString);

// Helper function to convert image to WebP
async function convertToWebP(base64Image, inputMimeType) {
  try {
    // Convert base64 to buffer
    const imageBuffer = Buffer.from(base64Image, 'base64');
    
    // Convert to WebP with high quality
    const webpBuffer = await sharp(imageBuffer)
      .webp({ 
        quality: 85, // High quality WebP
        effort: 4    // Good compression effort
      })
      .toBuffer();
    
    // Get image metadata
    const metadata = await sharp(webpBuffer).metadata();
    
    // Convert back to base64
    const webpBase64 = webpBuffer.toString('base64');
    
    return {
      success: true,
      base64: webpBase64,
      width: metadata.width || 1536,
      height: metadata.height || 1024,
      originalSize: imageBuffer.length,
      webpSize: webpBuffer.length,
      compressionRatio: ((imageBuffer.length - webpBuffer.length) / imageBuffer.length * 100).toFixed(1)
    };
  } catch (error) {
    console.error('Error converting to WebP:', error);
    return { success: false, error: error.message };
  }
}

async function convertAllImagesToWebP() {
  console.log('🚀 Starting WebP conversion for all slide images...\n');
  
  try {
    // First, get count of non-WebP images
    const countResult = await sql`
      SELECT COUNT(*) as count
      FROM slide_images 
      WHERE image_mime_type != 'image/webp'
    `;
    
    const totalCount = parseInt(countResult[0].count);
    console.log(`📊 Found ${totalCount} images to convert\n`);
    
    if (totalCount === 0) {
      console.log('✅ All images are already in WebP format!');
      return;
    }
    
    let successCount = 0;
    let failCount = 0;
    let totalOriginalSize = 0;
    let totalWebpSize = 0;
    
    // Process images in small batches to avoid database response size limits
    const batchSize = 5; // Smaller batch size for large images
    const totalBatches = Math.ceil(totalCount / batchSize);
    
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const offset = batchIndex * batchSize;
      
      console.log(`\n📦 Processing batch ${batchIndex + 1} of ${totalBatches} (images ${offset + 1}-${Math.min(offset + batchSize, totalCount)})...`);
      
      // Fetch a small batch of images
      const images = await sql`
        SELECT 
          id,
          slide_id,
          slide_number,
          session_id,
          title,
          image_mime_type,
          image_data,
          provider,
          generation_metadata
        FROM slide_images 
        WHERE image_mime_type != 'image/webp'
        ORDER BY created_at DESC
        LIMIT ${batchSize}
        OFFSET ${offset}
      `;
      
      console.log(`   📥 Fetched ${images.length} images from database`);
      
      // Process each image in the batch
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        const imageNumber = offset + i + 1;
        
        console.log(`\n🖼️  [${imageNumber}/${totalCount}] Converting image ${image.id}...`);
        console.log(`   📍 Slide: ${image.title || 'Untitled'} (Session: ${image.session_id || 'No session'})`);
        console.log(`   📄 Original format: ${image.image_mime_type}`);
        
        const result = await convertToWebP(image.image_data, image.image_mime_type);
        
        if (result.success) {
          // Update generation metadata
          let metadata = {};
          try {
            metadata = typeof image.generation_metadata === 'string' 
              ? JSON.parse(image.generation_metadata) 
              : image.generation_metadata || {};
          } catch (e) {
            metadata = {};
          }
          
          // Add conversion info to metadata
          metadata.webpConversion = {
            convertedAt: new Date().toISOString(),
            originalFormat: image.image_mime_type,
            originalSizeBytes: result.originalSize,
            webpSizeBytes: result.webpSize,
            compressionRatio: result.compressionRatio + '%'
          };
          
          // Preserve original format info if not already present
          if (!metadata.originalFormat) {
            metadata.originalFormat = image.image_mime_type.replace('image/', '');
          }
          
          // Update the database record
          try {
            await sql`
              UPDATE slide_images 
              SET 
                image_data = ${result.base64},
                image_mime_type = 'image/webp',
                image_width = ${result.width},
                image_height = ${result.height},
                generation_metadata = ${JSON.stringify(metadata)},
                updated_at = NOW()
              WHERE id = ${image.id}
            `;
            
            console.log(`   ✅ Success! Compressed by ${result.compressionRatio}% (${(result.originalSize / 1024).toFixed(1)}KB → ${(result.webpSize / 1024).toFixed(1)}KB)`);
            successCount++;
            totalOriginalSize += result.originalSize;
            totalWebpSize += result.webpSize;
          } catch (dbError) {
            console.error(`   ❌ Database update failed:`, dbError.message);
            failCount++;
          }
        } else {
          console.error(`   ❌ Conversion failed:`, result.error);
          failCount++;
        }
        
        // Small delay between images to avoid overwhelming the system
        if (i < images.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      // Add a delay between batches
      if (batchIndex < totalBatches - 1) {
        console.log(`\n⏳ Waiting before next batch...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 CONVERSION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successfully converted: ${successCount} images`);
    console.log(`❌ Failed conversions: ${failCount} images`);
    
    if (successCount > 0) {
      const totalCompressionRatio = ((totalOriginalSize - totalWebpSize) / totalOriginalSize * 100).toFixed(1);
      console.log(`\n💾 Storage savings:`);
      console.log(`   Original total size: ${(totalOriginalSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   WebP total size: ${(totalWebpSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   Space saved: ${((totalOriginalSize - totalWebpSize) / 1024 / 1024).toFixed(2)} MB (${totalCompressionRatio}%)`);
    }
    
    console.log('\n✨ WebP conversion completed!');
    
  } catch (error) {
    console.error('\n❌ Fatal error during conversion:', error);
    process.exit(1);
  }
}

// Add confirmation prompt for safety
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('⚠️  WARNING: This script will convert all slide images in the database to WebP format.');
console.log('This is a one-way operation. Make sure you have a database backup!\n');

rl.question('Do you want to continue? (yes/no): ', (answer) => {
  if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
    rl.close();
    convertAllImagesToWebP().then(() => {
      process.exit(0);
    });
  } else {
    console.log('\n❌ Conversion cancelled.');
    rl.close();
    process.exit(0);
  }
}); 