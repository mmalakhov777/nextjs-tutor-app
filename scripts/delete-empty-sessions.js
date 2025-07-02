#!/usr/bin/env node

/**
 * Script to delete all chat sessions with 0 messages
 * This helps clean up empty sessions that were created but never used
 */

const { neon } = require('@neondatabase/serverless');
const path = require('path');

// Load environment variables from .env.local or .env
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

async function deleteEmptySessions() {
  try {
    console.log('🔍 Starting cleanup of empty chat sessions...');
    
    // Get database connection
    const chatDbConnectionString = process.env.CHAT_DATABASE_URL;
    if (!chatDbConnectionString) {
      throw new Error('CHAT_DATABASE_URL environment variable is not set');
    }
    
    const sql = neon(chatDbConnectionString);
    
    // First, find all sessions with 0 messages
    console.log('📊 Finding sessions with 0 messages...');
    
    const emptySessions = await sql`
      SELECT cs.id, cs.title, cs.created_at, cs.user_id,
             COUNT(m.id) as message_count
      FROM chat_sessions cs
      LEFT JOIN messages m ON cs.id = m.chat_session_id
      GROUP BY cs.id, cs.title, cs.created_at, cs.user_id
      HAVING COUNT(m.id) = 0
      ORDER BY cs.created_at DESC
    `;
    
    console.log(`📋 Found ${emptySessions.length} empty sessions`);
    
    if (emptySessions.length === 0) {
      console.log('✅ No empty sessions found. Nothing to delete.');
      return;
    }
    
    // Show details of sessions to be deleted
    console.log('\n📝 Sessions to be deleted:');
    emptySessions.forEach((session, index) => {
      console.log(`   ${index + 1}. ID: ${session.id}`);
      console.log(`      Title: ${session.title || 'Untitled'}`);
      console.log(`      User: ${session.user_id}`);
      console.log(`      Created: ${new Date(session.created_at).toLocaleString()}`);
      console.log('');
    });
    
    // Ask for confirmation (in a real script, you might want to add readline for interactive confirmation)
    console.log('⚠️  WARNING: This will permanently delete these sessions!');
    
    // For automation, we'll proceed. In interactive mode, you'd want confirmation here.
    console.log('🗑️  Proceeding with deletion...');
    
    // Delete the empty sessions
    const sessionIds = emptySessions.map(s => s.id);
    
    // Delete in batches to avoid potential query limits
    const batchSize = 50;
    let deletedCount = 0;
    
    for (let i = 0; i < sessionIds.length; i += batchSize) {
      const batch = sessionIds.slice(i, i + batchSize);
      
      console.log(`🗑️  Deleting batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(sessionIds.length / batchSize)} (${batch.length} sessions)...`);
      
      // Delete related data first (notes, etc.)
      await sql`
        DELETE FROM notes 
        WHERE session_id = ANY(${batch})
      `;
      
      // Delete the sessions themselves
      const result = await sql`
        DELETE FROM chat_sessions 
        WHERE id = ANY(${batch})
      `;
      
      deletedCount += result.count || batch.length;
      console.log(`   ✅ Deleted ${batch.length} sessions from this batch`);
    }
    
    console.log(`\n🎉 Successfully deleted ${deletedCount} empty chat sessions!`);
    console.log('✨ Database cleanup completed.');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Add dry-run option
async function dryRun() {
  try {
    console.log('🔍 DRY RUN: Finding empty chat sessions (no deletion will occur)...');
    
    const chatDbConnectionString = process.env.CHAT_DATABASE_URL;
    if (!chatDbConnectionString) {
      throw new Error('CHAT_DATABASE_URL environment variable is not set');
    }
    
    const sql = neon(chatDbConnectionString);
    
    const emptySessions = await sql`
      SELECT cs.id, cs.title, cs.created_at, cs.user_id,
             COUNT(m.id) as message_count
      FROM chat_sessions cs
      LEFT JOIN messages m ON cs.id = m.chat_session_id
      GROUP BY cs.id, cs.title, cs.created_at, cs.user_id
      HAVING COUNT(m.id) = 0
      ORDER BY cs.created_at DESC
    `;
    
    console.log(`📋 Found ${emptySessions.length} empty sessions that would be deleted:`);
    
    if (emptySessions.length === 0) {
      console.log('✅ No empty sessions found.');
      return;
    }
    
    emptySessions.forEach((session, index) => {
      console.log(`   ${index + 1}. ID: ${session.id}`);
      console.log(`      Title: ${session.title || 'Untitled'}`);
      console.log(`      User: ${session.user_id}`);
      console.log(`      Created: ${new Date(session.created_at).toLocaleString()}`);
      console.log('');
    });
    
    console.log('🔍 DRY RUN COMPLETE - No sessions were deleted.');
    console.log('💡 To actually delete these sessions, run: node scripts/delete-empty-sessions.js --delete');
    
  } catch (error) {
    console.error('❌ Error during dry run:', error);
    process.exit(1);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
📖 Delete Empty Sessions Script

Usage:
  node scripts/delete-empty-sessions.js [options]

Options:
  --delete    Actually delete the empty sessions (default is dry run)
  --dry-run   Show what would be deleted without deleting (default)
  --help, -h  Show this help message

Examples:
  node scripts/delete-empty-sessions.js                    # Dry run (safe)
  node scripts/delete-empty-sessions.js --dry-run          # Dry run (safe)
  node scripts/delete-empty-sessions.js --delete           # Actually delete

⚠️  WARNING: --delete will permanently remove sessions and cannot be undone!
    `);
    return;
  }
  
  if (args.includes('--delete')) {
    await deleteEmptySessions();
  } else {
    // Default to dry run for safety
    await dryRun();
  }
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}

module.exports = { deleteEmptySessions, dryRun }; 