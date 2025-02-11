import express from 'express';
import { Prediction } from '../models/Prediction.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const predictRouter = express.Router();

const genAI = new GoogleGenerativeAI('AIzaSyCBuKB0mRZP8pnKFdEgN-taYDpbRLxzxsc');

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Validate medical conditions using Gemini
const validateMedicalConditions = async (conditions) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const prompt = `
      You are a medical term validator. For the following medical conditions, determine if each is a valid medical condition.
      Only respond with "valid" or "invalid" followed by a brief explanation for invalid entries.
      
      Medical conditions to validate:
      ${conditions.join('\n')}
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text().toLowerCase();
    
    // If the response contains "invalid", consider validation failed
    const isValid = !text.includes('invalid');
    const explanation = isValid ? '' : text.split('\n').find(line => line.includes('invalid'));
    
    return {
      isValid,
      explanation: explanation || ''
    };
  } catch (error) {
    console.error('Medical condition validation error:', error);
    // In case of API error, accept the conditions to avoid blocking the flow
    return { isValid: true, explanation: '' };
  }
};

// Validate drug name using Gemini
const validateDrugInfo = async (drugName) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const prompt = `
      You are a pharmaceutical validator. Determine if this is a valid medication:
      Drug Name: ${drugName}
      
      Respond in this format:
      Valid: [yes/no]
      Explanation: [brief explanation if invalid]
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text().toLowerCase();
    
    const isValid = text.includes('valid: yes');
    const explanation = text.split('\n').find(line => line.toLowerCase().includes('explanation:'));
    
    return {
      isValid,
      explanation: explanation ? explanation.replace(/^explanation:\s*/i, '').trim() : ''
    };
  } catch (error) {
    console.error('Drug validation error:', error);
    // In case of API error, accept the drug info to avoid blocking the flow
    return { isValid: true, explanation: '' };
  }
};

const callGoogleAPI = async (patientInfo, drugInfo) => {
  let lastError;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // First validate drug information
      if (drugInfo.name) {
        const drugValidation = await validateDrugInfo(drugInfo.name);
        if (!drugValidation.isValid) {
          return {
            riskLevel: 'Unknown',
            predictions: [
              {
                name: "Invalid Drug Information",
                likelihood: 0,
                description: `The provided drug information appears to be invalid: ${drugValidation.explanation}`
              }
            ],
            recommendedCheckUps: ["Consult with your healthcare provider to verify drug information"],
            alternativeTreatments: [
              { 
                treatment: "Verification Needed",
                description: "Please ensure you're entering the correct medication details as prescribed"
              }
            ],
            symptomsToMonitor: [
              {
                symptom: "Not Available",
                description: "Valid drug information is required to provide monitoring guidelines"
              }
            ],
            doctorsAdvice: "Please verify the medication details with your prescription or healthcare provider."
          };
        }
      }

      // Then validate medical conditions if provided
      if (patientInfo.medicalHistory && patientInfo.medicalHistory.length > 0) {
        const medicalValidation = await validateMedicalConditions(patientInfo.medicalHistory);
        if (!medicalValidation.isValid) {
          return {
            riskLevel: 'Unknown',
            predictions: [
              {
                name: "Medical History Needs Review",
                likelihood: 0,
                description: medicalValidation.explanation || "Some medical conditions need verification"
              }
            ],
            recommendedCheckUps: ["Consult with your healthcare provider to verify your medical conditions"],
            alternativeTreatments: [
              {
                treatment: "Medical History Review",
                description: "Please ensure medical conditions are entered accurately from your health records"
              }
            ],
            symptomsToMonitor: [
              {
                symptom: "Not Available",
                description: "Valid medical history is required for proper monitoring guidelines"
              }
            ],
            doctorsAdvice: "Please verify your medical conditions with your healthcare provider or medical records."
          };
        }
      }

      const model = genAI.getGenerativeModel({ 
        model: "gemini-pro",
        generationConfig: {
          temperature: 0.2,
          topK: 20,
          topP: 0.8,
          maxOutputTokens: 1024,
        },
      });
      
      // Handle missing information cases
      if (!drugInfo.name) {
        return {
          riskLevel: 'Unknown',
          predictions: [
            {
              name: "Drug Information Required",
              likelihood: 0,
              description: "Please provide drug name for prediction."
            }
          ],
          recommendedCheckUps: ["Consult with your healthcare provider to verify drug information"],
          alternativeTreatments: [],
          symptomsToMonitor: [],
          doctorsAdvice: "Please provide complete drug information for accurate assessment."
        };
      }

      if (!patientInfo.medicalHistory || patientInfo.medicalHistory.length === 0) {
        return {
          riskLevel: 'Caution',
          predictions: [
            {
              name: "Limited Medical History",
              likelihood: 50,
              description: "Predictions may be less accurate without complete medical history."
            }
          ],
          recommendedCheckUps: [
            "Complete medical history assessment",
            "Initial consultation to document medical background"
          ],
          alternativeTreatments: [],
          symptomsToMonitor: [
            {
              symptom: "General Health",
              description: "Monitor any unusual reactions or symptoms"
            }
          ],
          doctorsAdvice: "Please provide your medical history for more accurate assessment."
        };
      }

      // Main prediction prompt
      const prompt = `
        You are a deterministic medical analysis tool. For consistent results, follow these exact rules:

        Analyze the following case using standardized criteria. Consider ALL medical conditions together
        when determining risk levels, reactions, and alternative treatments:

        PATIENT DATA:
        - Age: ${patientInfo.age} years (Risk increases: <18 or >65)
        - Physical: ${patientInfo.weight}kg, ${patientInfo.height}cm
        - Medical Conditions: ${patientInfo.medicalHistory.join(', ')}
        Note: Consider interactions between all medical conditions when analyzing

        MEDICATION DATA:
        - Name: ${drugInfo.name}
        - Dosage: ${drugInfo.dosage}${drugInfo.unit}
        - Duration: ${drugInfo.duration} days
        - Prior ADRs: ${drugInfo.previousADR ? 'Yes' : 'No'}

        PROVIDE YOUR RESPONSE IN THIS EXACT FORMAT:
        Risk Level: [High/Moderate/Low]

        Common Reactions for Study:
        - [Effect]: [XX]% - [Description]
        - [Effect]: [XX]% - [Description]
        - [Effect]: [XX]% - [Description]

        Alternative Treatments:
        - [Treatment 1]: [Brief description and benefits]
        - [Treatment 2]: [Brief description and benefits]
        - [Treatment 3]: [Brief description and benefits]

        Recommended Check-Ups:
        - [Check-up 1]
        - [Check-up 2]
        - [Check-up 3]

        Symptoms to Monitor:
        - [Symptom 1]: [Brief description]
        - [Symptom 2]: [Brief description]
        - [Symptom 3]: [Brief description]

        Doctor's Advice:
        [Concise medical recommendations and precautions]

        If the drug is not in common use or its interactions are not well documented, emphasize the need
        for careful monitoring and consultation with healthcare providers.

        Use consistent percentages for similar cases.
        This is for educational purposes only.
      `;

      console.log('Sending prompt to Gemini:', prompt);

      const result = await model.generateContent(prompt);
      
      if (!result || !result.response) {
        throw new Error('Empty response from Gemini API');
      }

      const text = result.response.text();
      if (!text) {
        throw new Error('Empty text in Gemini response');
      }

      console.log('Raw Gemini response:', text);

      const lines = text.split('\n').filter(line => line.trim());
      
      const riskLine = lines.find(line => line.toLowerCase().includes('risk level'));
      const riskLevel = riskLine ? 
        (riskLine.toLowerCase().includes('high') ? 'High' :
         riskLine.toLowerCase().includes('moderate') ? 'Moderate' : 'Low')
        : 'Moderate';

      const predictions = [];
      const reactionPatterns = [
        /[-•]\s*([^:]+):\s*(\d+)%\s*[-–]\s*(.*)/,
        /[-•]\s*([^:]+):\s*(\d+)%\s*(.*)/,
        /[-•]\s*([^:]+)\s*[-–]\s*(\d+)%:\s*(.*)/
      ];

      for (const line of lines) {
        if (line.trim().startsWith('-') || line.trim().startsWith('•')) {
          for (const pattern of reactionPatterns) {
            const match = line.match(pattern);
            if (match) {
              predictions.push({
                name: match[1].trim(),
                likelihood: parseFloat(match[2]),
                description: match[3].trim()
              });
              break;
            }
          }
        }
      }

      const parsedResult = {
        riskLevel,
        predictions: predictions.length > 0 ? predictions : [],
        recommendedCheckUps: [],
        alternativeTreatments: [],
        symptomsToMonitor: [],
        doctorsAdvice: '',
      };

      let inCheckUps = false;
      let inAlternatives = false;
      let inSymptoms = false;
      let inAdvice = false;

      for (const line of lines) {
        if (line.includes('Recommended Check-Ups:')) {
          inCheckUps = true;
          inAlternatives = false;
          inSymptoms = false;
          inAdvice = false;
          continue;
        }
        if (line.includes('Alternative Treatments:')) {
          inCheckUps = false;
          inAlternatives = true;
          inSymptoms = false;
          inAdvice = false;
          continue;
        }
        if (line.includes('Symptoms to Monitor:')) {
          inCheckUps = false;
          inAlternatives = false;
          inSymptoms = true;
          inAdvice = false;
          continue;
        }
        if (line.includes("Doctor's Advice:")) {
          inCheckUps = false;
          inAlternatives = false;
          inSymptoms = false;
          inAdvice = true;
          continue;
        }

        if (inCheckUps && line.trim().startsWith('-')) {
          parsedResult.recommendedCheckUps.push(line.trim().substring(1).trim());
        }
        if (inAlternatives && line.trim().startsWith('-')) {
          const [treatment, description] = line.trim().substring(1).split(':').map(s => s.trim());
          parsedResult.alternativeTreatments.push({ treatment, description });
        }
        if (inSymptoms && line.trim().startsWith('-')) {
          const [symptom, description] = line.trim().substring(1).split(':').map(s => s.trim());
          parsedResult.symptomsToMonitor.push({ symptom, description });
        }
        if (inAdvice && line.trim() && !line.includes("Doctor's Advice:")) {
          parsedResult.doctorsAdvice += line.trim() + ' ';
        }
      }

      return parsedResult;

    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error);
      lastError = error;
      
      if (attempt < MAX_RETRIES) {
        await delay(RETRY_DELAY * attempt);
      } else {
        return {
          riskLevel: 'Error',
          predictions: [
            {
              name: "Service Temporarily Unavailable",
              likelihood: 0,
              description: "Unable to generate predictions at this time. Please try again later."
            }
          ],
          recommendedCheckUps: ["Contact support if the issue persists"],
          alternativeTreatments: [],
          symptomsToMonitor: [],
          doctorsAdvice: 'Service temporarily unavailable. Please try again later.'
        };
      }
    }
  }
  
  throw lastError;
};

predictRouter.post('/', async (req, res) => {
  console.log('Request body:', req.body);
  try {
    const { patientInfo, drugInfo } = req.body;
    const predictionResult = await callGoogleAPI(patientInfo, drugInfo);
    
    const prediction = new Prediction({
      patientInfo,
      drugInfo,
      prediction: predictionResult
    });
    
    await prediction.save();
    res.json(predictionResult);
  } catch (error) {
    console.error('Prediction error:', error);
    res.status(500).json({ error: error.message });
  }
});