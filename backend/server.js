import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { predictRouter } from './routes/predict.js';
import chatRouter from './routes/chat.js';
import { supabase } from './config/supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from root directory
console.log('Loading environment variables...');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

console.log('Environment check:', {
  hasSupabaseUrl: !!process.env.SUPABASE_URL,
  hasSupabaseKey: !!process.env.SUPABASE_ANON_KEY,
  port: process.env.PORT
});

const app = express();
const port = process.env.PORT || 5000;

// CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:5173',                 // Local development
    'https://adr-predict.vercel.app',        // Vercel production
    /\.vercel\.app$/,                        // Any Vercel preview deployments
  ],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400 // 24 hours
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Test Supabase connection
const testConnection = async () => {
  try {
    console.log('Testing Supabase connection...');
    console.log('Supabase URL:', process.env.SUPABASE_URL);
    
    const { data, error } = await supabase
      .from('predictions')
      .select('id')
      .limit(1);

    if (error) {
      console.error('Supabase connection error:', error);
      throw error;
    }
    
    console.log('✅ Successfully connected to Supabase');
    console.log('Database tables:');
    console.log('- predictions');
    console.log('- chats');
  } catch (error) {
    console.error('❌ Error connecting to Supabase:', error);
    process.exit(1);
  }
};

// Routes
app.use('/api/predict', predictRouter);
app.use('/api/chat', chatRouter);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const { error } = await supabase
      .from('predictions')
      .select('id')
      .limit(1);

    if (error) throw error;
    
    res.json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      status: 'error',
      message: 'Database connection issue',
      timestamp: new Date().toISOString()
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
  });
});

// Start server
const startServer = async () => {
  console.log('Starting server...');
  try {
    await testConnection();
    app.listen(port, () => {
      console.log(`
🚀 Server is running on port ${port}
📝 API endpoints:
   - POST /api/predict
   - POST /api/chat
   - GET /health
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Catch any unhandled promise rejections
process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
  process.exit(1);
});

console.log('Initializing server...');
startServer();