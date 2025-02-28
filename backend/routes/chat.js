import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

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
- Serves as a support tool for healthcare professionals, not a replacement

Maintain a professional tone and always clarify that ADR Predict is a tool for healthcare providers to use in their decision-making process.`;

// Store chat instances for each session
const chatSessions = new Map();

router.post('/', async (req, res) => {
  try {
    const { message, sessionId = 'default' } = req.body;
    
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

    res.json({
      response: response.text(),
      confidence: 0.95
    });

  } catch (error) {
    console.error('Chat API Error:', error);
    res.status(500).json({
      response: "I'm having trouble processing your request. Please try again.",
      confidence: 0.3
    });
  }
});

export default router;