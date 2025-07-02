import { neon } from '@neondatabase/serverless';
import { v4 as uuidv4 } from 'uuid';

const chatDbConnectionString = process.env.CHAT_DATABASE_URL;
if (!chatDbConnectionString) {
  throw new Error('CHAT_DATABASE_URL environment variable is not set!');
}
const sql = neon(chatDbConnectionString);

export async function createChatSession({ userId, title = 'New Chat' }: { userId: string, title?: string }) {
  const id = uuidv4();
  const now = new Date().toISOString();
  await sql`
    INSERT INTO chat_sessions (id, title, user_id, created_at, updated_at)
    VALUES (${id}, ${title}, ${userId}, ${now}, ${now})
  `;
  return { id, title, user_id: userId, created_at: now, updated_at: now };
}

export async function createVectorStore({ userId, chatId }: { userId: string, chatId: string }) {
  const id = 'vs_' + uuidv4();
  const now = new Date().toISOString();
  await sql`
    INSERT INTO vector_stores (id, name, owner_id, created_at)
    VALUES (${id}, ${'Chat ' + chatId}, ${userId}, ${now})
  `;
  return { id, name: 'Chat ' + chatId, owner_id: userId, created_at: now };
}

export async function updateChatSessionVectorStore({ sessionId, vectorStoreId }: { sessionId: string, vectorStoreId: string }) {
  const now = new Date().toISOString();
  await sql`
    UPDATE chat_sessions
    SET vector_store_id = ${vectorStoreId}, updated_at = ${now}
    WHERE id = ${sessionId}
  `;
} 