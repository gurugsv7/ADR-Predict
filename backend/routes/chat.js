import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import multer from 'multer';
import fs from 'fs';

dotenv.config();

const router = express.Router();
const upload = multer();

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

router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { message, sessionId = 'default' } = req.body;
    const image = req.file;

    // Create initial message parts with the text
    const messageParts = [{ text: message || '' }];

    // If an image is uploaded, add it to the message parts
    if (image) {
      messageParts.push({
        inlineData: {
          data: image.buffer.toString('base64'),
          mimeType: image.mimetype
        }
      });
    }

    // Use Gemini 1.5 Flash for both text and image processing
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.7,
        topK: 20,
        topP: 0.8,
        maxOutputTokens: 250,
      },
    });

    // Add system prompt to message parts
    messageParts.unshift({ text: SYSTEM_PROMPT + "\n\n" });

    // For images, add specific guidance
    if (image) {
      messageParts.unshift({
        text: "When analyzing images related to medications or medical documents, focus on:\n" +
              "1. Identifying visible drug names or medical terms\n" +
              "2. Describing how ADR Predict can help analyze such medications\n" +
              "3. Emphasizing that final interpretations should be done by healthcare providers\n" +
              "4. NOT providing specific medical advice about the medication\n\n"
      });
    }

    // Generate response
    const result = await model.generateContent(messageParts);
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