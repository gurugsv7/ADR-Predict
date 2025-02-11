import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { predictRouter } from './routes/predict.js';
import chatRouter from './routes/chat.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const CHAT_PORT = process.env.CHAT_PORT || 5001; // Separate port for chat

// Middleware
app.use(cors());
app.use(express.json());

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Routes with error handling
app.use('/api/predict', (req, res, next) => {
  try {
    predictRouter(req, res, next);
  } catch (error) {
    next(error);
  }
});

app.use('/api/chat', (req, res, next) => {
  try {
    chatRouter(req, res, next);
  } catch (error) {
    next(error);
  }
});

// MongoDB Connection with retry logic
const connectDB = async (retries = 5) => {
  try {
    await mongoose.connect('mongodb+srv://gurugsv777:guruhari713@adrpredict.bwhks.mongodb.net/adr-prediction?retryWrites=true&w=majority&appName=adrpredict');
    console.log('MongoDB connected successfully');
  } catch (err) {
    if (retries > 0) {
      console.log(`MongoDB connection retry (${retries} attempts remaining)...`);
      setTimeout(() => connectDB(retries - 1), 5000);
    } else {
      console.error('MongoDB connection failed:', err);
      process.exit(1);
    }
  }
};

// Start server only after DB connection
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Main server running on port ${PORT}`);
  });
});

// Create separate server for chat if needed
if (process.env.SEPARATE_CHAT_SERVER === 'true') {
  const chatApp = express();
  chatApp.use(cors());
  chatApp.use(express.json());
  chatApp.use('/api/chat', chatRouter);
  
  chatApp.listen(CHAT_PORT, () => {
    console.log(`Chat server running on port ${CHAT_PORT}`);
  });
}

// Handle process termination gracefully
process.on('SIGTERM', () => {
  console.log('Received SIGTERM. Performing graceful shutdown...');
  mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT. Performing graceful shutdown...');
  mongoose.connection.close();
  process.exit(0);
});