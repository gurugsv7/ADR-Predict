import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

// Validate required environment variables
if (!process.env.GEMINI_API_KEY) {
  throw new Error('Missing required environment variable: GEMINI_API_KEY');
}

const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SYSTEM_PROMPT = `You are ADR Predict's AI assistant. Your role is to explain ADR Predict's capabilities and features, NOT to provide medical advice.

Key guidelines:
1. DO NOT provide specific medical advice or evaluate medications
2. DO NOT make recommendations about drug usage or alternatives
3. ALWAYS redirect medication-specific questions to healthcare providers
4. Focus ONLY on explaining ADR Predict's features and capabilities

When users ask about specific medications or conditions:
- Explain that you cannot provide medical advice
- Describe how ADR Predict can help healthcare providers analyze such cases
- Emphasize that medical decisions should be made by healthcare professionals

Key information about ADR Predict:
- It's an advanced analysis tool for predicting potential Adverse Drug Reactions (ADRs)
- Uses machine learning to analyze patient data and medication details
- Provides risk assessments to help healthcare providers make informed decisions
- Features include real-time prediction and drug interaction analysis
- Serves as a support tool for healthcare providers, not a replacement

Maintain a professional tone and always clarify that ADR Predict is a tool for healthcare providers to use in their decision-making process.`;

// Store chat instances for each session with TTL
const chatSessions = new Map();
const SESSION_TTL = 30 * 60 * 1000; // 30 minutes

// Clean up expired sessions periodically
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, session] of chatSessions) {
    if (now - session.lastAccess > SESSION_TTL) {
      chatSessions.delete(sessionId);
    }
  }
}, 5 * 60 * 1000); // Clean up every 5 minutes

router.post('/', async (req, res) => {
  try {
    const { message, sessionId = 'default' } = req.body;

    // Validate request
    if (!message) {
      return res.status(400).json({
        error: 'Missing required field',
        details: 'Message is required'
      });
    }

    // Update session last access time
    if (chatSessions.has(sessionId)) {
      chatSessions.get(sessionId).lastAccess = Date.now();
    } else {
      chatSessions.set(sessionId, {
        lastAccess: Date.now(),
        messageCount: 0
      });
    }

    // Rate limiting
    const session = chatSessions.get(sessionId);
    session.messageCount++;
    if (session.messageCount > 50) { // 50 messages per session limit
      return res.status(429).json({
        error: 'Rate limit exceeded',
        details: 'Please start a new session'
      });
    }
    
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.7,
        topK: 20,
        topP: 0.8,
        maxOutputTokens: 250,
      },
    });

    // Generate response with system prompt
    const result = await model.generateContent([
      { text: SYSTEM_PROMPT + "\n\n" },
      { text: message || '' }
    ]);
    const response = result.response;

    if (!response || !response.text()) {
      throw new Error('Empty response from Gemini API');
    }

    // Filter out any potential medical advice
    const responseText = response.text();
    if (responseText.toLowerCase().includes('you should take') || 
        responseText.toLowerCase().includes('i recommend')) {
      return res.status(400).json({
        error: 'Invalid response',
        message: 'Our AI assistant cannot provide medical advice. Please consult with your healthcare provider.'
      });
    }

    res.json({
      response: responseText,
      confidence: 0.95
    });

  } catch (error) {
    console.error('Chat API Error:', error);
    
    // Handle different types of errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Invalid input',
        details: error.message
      });
    }
    
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        error: 'Service unavailable',
        message: 'The chat service is temporarily unavailable. Please try again later.'
      });
    }

    res.status(500).json({
      error: 'Chat service error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred',
      confidence: 0.3
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    activeSessions: chatSessions.size
  });
});

export default router;