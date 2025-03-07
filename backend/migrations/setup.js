import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from root directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const setupDatabase = async () => {
  try {
    // Create tables using the Dashboard SQL Editor instead
    console.log('Please run the following SQL commands in your Supabase Dashboard SQL Editor:');
    
    console.log(`
-- Create predictions table
CREATE TABLE IF NOT EXISTS predictions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_info JSONB NOT NULL,
  drug_info JSONB NOT NULL,
  prediction JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_predictions_created_at ON predictions(created_at);
CREATE INDEX IF NOT EXISTS idx_drug_info ON predictions USING GIN (drug_info);
CREATE INDEX IF NOT EXISTS idx_patient_info ON predictions USING GIN (patient_info);

-- Create chats table
CREATE TABLE IF NOT EXISTS chats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_message TEXT NOT NULL,
  bot_response TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chats_session_id ON chats(session_id);
CREATE INDEX IF NOT EXISTS idx_chats_created_at ON chats(created_at);

-- Add function for cleaning up old chats
CREATE OR REPLACE FUNCTION cleanup_old_chats() RETURNS trigger AS $$
BEGIN
  DELETE FROM chats
  WHERE created_at < NOW() - INTERVAL '30 minutes';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for automatic cleanup
DROP TRIGGER IF EXISTS trigger_cleanup_old_chats ON chats;
CREATE TRIGGER trigger_cleanup_old_chats
  AFTER INSERT ON chats
  EXECUTE FUNCTION cleanup_old_chats();
    `);

    console.log('\nℹ️ Please copy and run these SQL commands in your Supabase Dashboard SQL Editor');
    console.log('1. Go to https://app.supabase.com');
    console.log('2. Select your project');
    console.log('3. Go to SQL Editor');
    console.log('4. Paste the SQL commands and run them');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
};

// Run the setup
setupDatabase().catch(console.error);