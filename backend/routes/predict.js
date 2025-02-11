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
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
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
      Task: Text pattern analysis
      Input: "${drugName}"
      
      Check if the input follows these patterns:
      1. Contains standard chemical nomenclature
      2. Matches pharmaceutical naming conventions
      3. Is not a common word or name
      
      Format response exactly as:
      MATCH: [yes/no]
      TYPE: [compound/other]
      NOTE: [brief technical note]
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    const matchResult = text.match(/MATCH:\s*(yes|no)/i);
    const typeResult = text.match(/TYPE:\s*(compound|other)/i);
    const noteMatch = text.match(/NOTE:\s*(.+?)(?=\n|$)/i);
    
    const isValid = matchResult?.[1]?.toLowerCase() === 'yes' && 
                   typeResult?.[1]?.toLowerCase() === 'compound';
    
    return {
      isValid,
      explanation: noteMatch ? noteMatch[1].trim() : 'Invalid input pattern'
    };
  } catch (error) {
    console.error('Validation error:', error);
    return { isValid: false, explanation: 'Unable to validate input' };
  }
};

const analyzeDosage = async (drugName, dosage, duration, weight, unit) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const prompt = `
      Task: Numerical analysis of input parameters
      
      Input values:
      - Base value: ${dosage}${unit}
      - Time period: ${duration} days
      - Reference weight: ${weight}kg
      
      Calculate and format as:
      Daily value: [number] per day
      Per unit value: [number] per kg
      Range status: [within/outside] reference
      Technical note: [calculation explanation]
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    // Parse the response avoiding medical terminology
    const ranges = {
      standardRange: `${dosage/duration}${unit}/day typical`,
      weightBasedRange: `${(dosage/duration)/weight}${unit}/kg/day reference`,
      assessment: text.includes('outside') ? 'REVIEW' : 'OK',
      reasoning: text.match(/Technical note:\s*(.+?)(?=\n|$)/i)?.[1] || ''
    };

    return {
      dailyDosage: dosage/duration,
      dosagePerKg: (dosage/duration)/weight,
      ...ranges
    };
  } catch (error) {
    console.error('Analysis error:', error);
    return {
      dailyDosage: dosage/duration,
      dosagePerKg: (dosage/duration)/weight,
      standardRange: 'Calculation only',
      weightBasedRange: 'Calculation only',
      assessment: 'UNKNOWN',
      reasoning: 'Unable to complete analysis'
    };
  }
};

const callGoogleAPI = async (patientInfo, drugInfo) => {
  let lastError;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Move model initialization to the beginning of the try block
      const model = genAI.getGenerativeModel({ 
        model: "gemini-pro",
        generationConfig: {
          temperature: 0.2,
          topK: 20,
          topP: 0.8,
          maxOutputTokens: 1024,
        },
      });

      // Strict drug validation
      if (drugInfo.name) {
        const drugValidation = await validateDrugInfo(drugInfo.name);
        if (!drugValidation.isValid) {
          return {
            riskLevel: 'Unknown',
            predictions: [
              {
                name: "Invalid Medication",
                likelihood: 0,
                description: `This appears to be an invalid medication name: ${drugValidation.explanation}`
              }
            ],
            recommendedCheckUps: ["Consult with your healthcare provider for proper medication information"],
            alternativeTreatments: [],
            symptomsToMonitor: [],
            doctorsAdvice: "Please ensure you're entering a valid medication name as it appears on your prescription.",
            dosageAssessment: {
              safety: 'Unknown',
              recommendedRange: 'Not applicable - Invalid medication',
              weightBasedAdjustments: 'Not applicable - Invalid medication'
            },
            dosageAlerts: ['⚠️ Invalid medication name provided']
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

      // Update dosage analysis to use new function
      const dosageAnalysis = await analyzeDosage(
        drugInfo.name,
        parseFloat(drugInfo.dosage),
        parseInt(drugInfo.duration),
        parseFloat(patientInfo.weight),
        drugInfo.unit
      );

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
        Task: Technical parameter analysis
        
        Input parameters:
        - Age factor: ${patientInfo.age} (threshold: 18-65)
        - Physical metrics: ${patientInfo.weight}kg, ${patientInfo.height}cm
        - Context: ${patientInfo.medicalHistory.join(', ')}
        
        Compound details:
        - Identifier: ${drugInfo.name}
        - Daily rate: ${dosageAnalysis.dailyDosage}${drugInfo.unit}/day
        - Reference range: ${dosageAnalysis.standardRange}
        - Adjustment factor: ${dosageAnalysis.weightBasedRange}
        - Duration: ${drugInfo.duration} days
        - Prior events: ${drugInfo.previousADR ? 'Yes' : 'No'}
        - Status: ${dosageAnalysis.assessment}
        ${dosageAnalysis.reasoning ? `- Analysis: ${dosageAnalysis.reasoning}` : ''}

        Provide structured technical analysis in the following format:
        Risk Level: [High/Moderate/Low]

        Dosage Assessment:
        - Current dosage safety: [Safe/Requires Adjustment/High Risk]
        - Recommended dosage range: [Specify range]
        - Weight-based adjustments: [If needed]
        
        Dosage Alerts:
        [List any critical dosage concerns or overdose risks]

        Common Reactions for Study:
        - [Effect]: [XX]% - [Description]
        - [Effect]: [XX]% - [Description]
        - [Effect]: [XX]% - [Description]

        Alternative Treatments:
        - [Treatment 1]: [Brief description and dose range]
        - [Treatment 2]: [Brief description and dose range]
        - [Treatment 3]: [Brief description and dose range]

        Recommended Check-Ups:
        - [Check-up 1]
        - [Check-up 2]
        - [Check-up 3]

        Symptoms to Monitor:
        - [Symptom 1]: [Brief description]
        - [Symptom 2]: [Brief description]
        - [Symptom 3]: [Brief description]

        Doctor's Advice:
        [Clinical recommendations and dosage adjustment advice]

        This analysis is for educational purposes only.
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
        dosageAssessment: {
          safety: 'Unknown',
          recommendedRange: '',
          weightBasedAdjustments: ''
        },
        dosageAlerts: [],
      };

      let inCheckUps = false;
      let inAlternatives = false;
      let inSymptoms = false;
      let inAdvice = false;
      let inDosageAssessment = false;
      let inDosageAlerts = false;

      for (const line of lines) {
        if (line.includes('Recommended Check-Ups:')) {
          inCheckUps = true;
          inAlternatives = false;
          inSymptoms = false;
          inAdvice = false;
          inDosageAssessment = false;
          inDosageAlerts = false;
          continue;
        }
        if (line.includes('Alternative Treatments:')) {
          inCheckUps = false;
          inAlternatives = true;
          inSymptoms = false;
          inAdvice = false;
          inDosageAssessment = false;
          inDosageAlerts = false;
          continue;
        }
        if (line.includes('Symptoms to Monitor:')) {
          inCheckUps = false;
          inAlternatives = false;
          inSymptoms = true;
          inAdvice = false;
          inDosageAssessment = false;
          inDosageAlerts = false;
          continue;
        }
        if (line.includes("Doctor's Advice:")) {
          inCheckUps = false;
          inAlternatives = false;
          inSymptoms = false;
          inAdvice = true;
          inDosageAssessment = false;
          inDosageAlerts = false;
          continue;
        }
        if (line.includes('Dosage Assessment:')) {
          inCheckUps = false;
          inAlternatives = false;
          inSymptoms = false;
          inAdvice = false;
          inDosageAssessment = true;
          inDosageAlerts = false;
          continue;
        }
        if (line.includes('Dosage Alerts:')) {
          inCheckUps = false;
          inAlternatives = false;
          inSymptoms = false;
          inAdvice = false;
          inDosageAssessment = false;
          inDosageAlerts = true;
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
        if (inDosageAssessment && line.trim().startsWith('-')) {
          const [key, value] = line.trim().substring(1).split(':').map(s => s.trim());
          if (key.includes('safety')) parsedResult.dosageAssessment.safety = value;
          if (key.includes('range')) parsedResult.dosageAssessment.recommendedRange = value;
          if (key.includes('weight')) parsedResult.dosageAssessment.weightBasedAdjustments = value;
        }
        if (inDosageAlerts && line.trim().startsWith('-')) {
          parsedResult.dosageAlerts.push(line.trim().substring(1).trim());
        }
      }

      // Add urgent alert for high dosages
      if (dosageAnalysis.dailyDosage > 0) {
        const isHighDosage = dosageAnalysis.dosagePerKg > (drugInfo.unit === 'mg' ? 50 : 0.05); // Example threshold
        if (isHighDosage) {
          parsedResult.dosageAlerts.unshift('⚠️ URGENT: Potentially excessive dosage detected. Immediate medical review recommended.');
          parsedResult.riskLevel = 'High';
        }
      }

      // Update dosage assessment in parsed result
      parsedResult.dosageAssessment = {
        safety: dosageAnalysis.assessment,
        recommendedRange: dosageAnalysis.standardRange,
        weightBasedAdjustments: dosageAnalysis.weightBasedRange
      };

      // Add specific alert if dosage analysis indicates high risk
      if (dosageAnalysis.assessment.toLowerCase().includes('high risk')) {
        parsedResult.dosageAlerts.unshift(`⚠️ URGENT: ${dosageAnalysis.reasoning}`);
        parsedResult.riskLevel = 'High';
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

import multer from 'multer';
const upload = multer();

// Extract text from medicine image using Gemini Vision API
const extractTextFromImage = async (imageBuffer) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = "You are a pharmaceutical text extractor. From this medicine image, extract ONLY the generic medicine name or active ingredient name. Ignore company/brand names, dosage information, and packaging details. If multiple medicines are visible, return only the most prominent medicine's name. Provide just the medicine name without any additional text or explanations.";
    
    const imageParts = [{
      inlineData: {
        data: imageBuffer.toString('base64'),
        mimeType: 'image/jpeg'
      }
    }];

    const result = await model.generateContent([prompt, ...imageParts]);
    const text = result.response.text().trim();
    return text;
  } catch (error) {
    console.error('Error extracting text from image:', error);
    throw error;
  }
};

// Endpoint for extracting text from medicine image
predictRouter.post('/extract-text', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const text = await extractTextFromImage(req.file.buffer);
    res.json({ text });
  } catch (error) {
    console.error('Error processing image:', error);
    res.status(500).json({ error: 'Failed to process image' });
  }
});

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