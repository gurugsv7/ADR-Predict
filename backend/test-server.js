import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from root directory
dotenv.config({ path: resolve(__dirname, '../.env') });

// Test environment variables
console.log('\nTesting environment variables:');
console.log('- SUPABASE_URL:', process.env.SUPABASE_URL ? '✓ Set' : '✗ Missing');
console.log('- SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✓ Set' : '✗ Missing');
console.log('- GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? '✓ Set' : '✗ Missing');
console.log('- GEMINI_PREDICT_API_KEY:', process.env.GEMINI_PREDICT_API_KEY ? '✓ Set' : '✗ Missing');

// Test module imports
try {
  console.log('\nTesting module imports:');
  
  const imports = [
    import('@supabase/supabase-js'),
    import('@google/generative-ai'),
    import('express'),
    import('cors'),
    import('multer')
  ];

  await Promise.all(imports);
  console.log('✓ All modules imported successfully');
} catch (error) {
  console.error('✗ Module import error:', error);
  process.exit(1);
}

console.log('\n✓ Configuration test passed\n');
console.log('Next steps:');
console.log('1. Deploy to Vercel using:');
console.log('   vercel --prod');
console.log('2. Set environment variables in Vercel dashboard');
console.log('3. Test the deployed API using:');
console.log('   curl https://your-app.vercel.app/health\n');