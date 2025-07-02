const { neon } = require('@neondatabase/serverless');
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

async function analyzeSlideImages() {
  console.log('🔍 Analyzing slide images in database...\n');
  
  try {
    // Get statistics about all images
    const stats = await sql`
      SELECT 
        image_mime_type,
        COUNT(*) as count,
        SUM(LENGTH(image_data)) as total_base64_chars,
        AVG(LENGTH(image_data)) as avg_base64_chars,
        MIN(created_at) as oldest,
        MAX(created_at) as newest
      FROM slide_images 
      GROUP BY image_mime_type
      ORDER BY count DESC
    `;
    
    console.log('📊 Image Format Statistics:');
    console.log('═'.repeat(80));
    
    let totalImages = 0;
    let totalSize = 0;
    let webpCount = 0;
    
    stats.forEach(stat => {
      const count = parseInt(stat.count);
      const totalChars = parseInt(stat.total_base64_chars || 0);
      const avgChars = parseInt(stat.avg_base64_chars || 0);
      
      // Estimate actual file size (base64 is ~33% larger than binary)
      const estimatedTotalMB = (totalChars * 0.75 / 1024 / 1024).toFixed(2);
      const estimatedAvgKB = (avgChars * 0.75 / 1024).toFixed(1);
      
      console.log(`\n📷 ${stat.image_mime_type}:`);
      console.log(`   Count: ${count} images`);
      console.log(`   Total size: ~${estimatedTotalMB} MB`);
      console.log(`   Average size: ~${estimatedAvgKB} KB per image`);
      console.log(`   Date range: ${new Date(stat.oldest).toLocaleDateString()} - ${new Date(stat.newest).toLocaleDateString()}`);
      
      totalImages += count;
      totalSize += totalChars * 0.75;
      
      if (stat.image_mime_type === 'image/webp') {
        webpCount = count;
      }
    });
    
    console.log('\n' + '═'.repeat(80));
    console.log('📈 Summary:');
    console.log(`   Total images: ${totalImages}`);
    console.log(`   Total size: ~${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   WebP images: ${webpCount} (${((webpCount / totalImages) * 100).toFixed(1)}%)`);
    console.log(`   Non-WebP images: ${totalImages - webpCount} (${(((totalImages - webpCount) / totalImages) * 100).toFixed(1)}%)`);
    
    // Get sample of non-WebP images to show potential savings
    if (totalImages - webpCount > 0) {
      console.log('\n💡 Conversion Potential:');
      console.log(`   Images to convert: ${totalImages - webpCount}`);
      
      // Estimate savings (typically 60-80% compression)
      const nonWebpSize = stats
        .filter(s => s.image_mime_type !== 'image/webp')
        .reduce((sum, s) => sum + parseInt(s.total_base64_chars || 0) * 0.75, 0);
      
      const estimatedSavings = nonWebpSize * 0.7; // Assume 70% average compression
      console.log(`   Estimated storage savings: ~${(estimatedSavings / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   Estimated final size: ~${((nonWebpSize - estimatedSavings) / 1024 / 1024).toFixed(2)} MB`);
      
      // Show recent non-WebP images
      const recentNonWebP = await sql`
        SELECT 
          id,
          slide_id,
          title,
          session_id,
          image_mime_type,
          LENGTH(image_data) as base64_chars,
          created_at
        FROM slide_images 
        WHERE image_mime_type != 'image/webp'
        ORDER BY created_at DESC
        LIMIT 5
      `;
      
      if (recentNonWebP.length > 0) {
        console.log('\n📋 Recent non-WebP images:');
        recentNonWebP.forEach((img, idx) => {
          const sizeKB = (parseInt(img.base64_chars) * 0.75 / 1024).toFixed(1);
          console.log(`   ${idx + 1}. ${img.title || 'Untitled'} (${sizeKB} KB, ${img.image_mime_type})`);
          console.log(`      Created: ${new Date(img.created_at).toLocaleString()}`);
        });
      }
    } else {
      console.log('\n✅ All images are already in WebP format!');
    }
    
    // Check for any unusual or problematic data
    const problematic = await sql`
      SELECT COUNT(*) as count
      FROM slide_images 
      WHERE image_data IS NULL 
         OR image_data = ''
         OR image_mime_type IS NULL
         OR image_mime_type = ''
    `;
    
    if (parseInt(problematic[0].count) > 0) {
      console.log(`\n⚠️  Warning: Found ${problematic[0].count} images with missing data`);
    }
    
  } catch (error) {
    console.error('\n❌ Error analyzing images:', error);
    process.exit(1);
  }
}

// Run the analysis
analyzeSlideImages().then(() => {
  console.log('\n✨ Analysis complete!');
  process.exit(0);
}); 