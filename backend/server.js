import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { predictRouter } from './routes/predict.js';
import chatRouter from './routes/chat.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/predict', predictRouter);
app.use('/api/chat', chatRouter);

// MongoDB Connection
mongoose.connect('mongodb+srv://gurugsv777:guruhari713@adrpredict.bwhks.mongodb.net/adr-prediction?retryWrites=true&w=majority&appName=adrpredict')
  .then(() => console.log('MongoDB connected successfully'))
  .catch((err) => console.error('MongoDB connection error:', err));

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});