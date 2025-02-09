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

router.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;

    const model = genAI.getGenerativeModel({ 
      model: "gemini-pro",
      generationConfig: {
        temperature: 0.7,
        topK: 20,
        topP: 0.8,
        maxOutputTokens: 250,
      },
    });

    // Initialize chat with history
    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: "You are ADR Predict's AI assistant. Respond as specified in the following system prompt." }]
        },
        {
          role: "model",
          parts: [{ text: "I understand. I will act as ADR Predict's AI assistant and will not provide medical advice." }]
        },
        {
          role: "user",
          parts: [{ text: SYSTEM_PROMPT }]
        },
        {
          role: "model",
          parts: [{ text: "I understand my role completely. I will focus solely on explaining ADR Predict's capabilities while directing all medical questions to healthcare providers." }]
        }
      ]
    });

    // Send user message
    const result = await chat.sendMessage([{ text: message }]);
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