import express from 'express';
import { supabase } from '../config/supabase.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import multer from 'multer';

dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['GEMINI_API_KEY', 'GEMINI_PREDICT_API_KEY'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

export const predictRouter = express.Router();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const predictionAI = new GoogleGenerativeAI(process.env.GEMINI_PREDICT_API_KEY);

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
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
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
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
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
    
    const dailyDosage = Number((dosage/duration).toFixed(2));
    const dosagePerKg = Number((dailyDosage/weight).toFixed(2));

    // Define dosage thresholds based on unit type
    const thresholds = {
      mg: { daily: 2000, perKg: 50 }, // Example thresholds for mg
      g: { daily: 2, perKg: 0.05 },    // Example thresholds for g
      ml: { daily: 100, perKg: 2.5 },  // Example thresholds for ml
      mcg: { daily: 1000, perKg: 25 }  // Example thresholds for mcg
    };

    // Determine if dosage is high based on unit-specific thresholds
    const threshold = thresholds[unit.toLowerCase()] || thresholds.mg;
    const isHighDosage = dailyDosage > threshold.daily || dosagePerKg > threshold.perKg;

    // Parse the response and determine assessment
    const ranges = {
      standardRange: `${dailyDosage}${unit}/day typical`,
      weightBasedRange: `${dosagePerKg}${unit}/kg/day reference`,
      assessment: isHighDosage ? 'HIGH RISK' : text.includes('outside') ? 'REVIEW' : 'OK',
      reasoning: text.match(/Technical note:\s*(.+?)(?=\n|$)/i)?.[1] ||
                (isHighDosage ? `Daily dosage (${dailyDosage}${unit}) or per kg dosage (${dosagePerKg}${unit}/kg) exceeds recommended limits` : '')
    };

    return {
      dailyDosage,
      dosagePerKg,
      ...ranges,
      isHighDosage
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

const predictWithGemini = async (patientInfo, drugInfo, dosageAnalysis) => {
  try {
    const prompt = `You are an advanced ADR (Adverse Drug Reaction) prediction system. Using the provided data, analyze potential reactions and provide a structured safety assessment.

Patient Data:
Age: ${patientInfo.age} years
Weight: ${patientInfo.weight}kg
Height: ${patientInfo.height}cm
Medical History: ${patientInfo.medicalHistory.join(', ')}

Medication:
Drug: ${drugInfo.name}
Dosage: ${drugInfo.dosage}${drugInfo.unit}
Duration: ${drugInfo.duration} days
Prior ADR History: ${drugInfo.previousADR ? 'Yes' : 'No'}

Analysis:
Daily Dose: ${dosageAnalysis.dailyDosage}${drugInfo.unit}/day
Weight-based: ${dosageAnalysis.dosagePerKg}${drugInfo.unit}/kg/day
Safety: ${dosageAnalysis.assessment}
${dosageAnalysis.reasoning ? `Notes: ${dosageAnalysis.reasoning}` : ''}

Provide your analysis in the following exact format:

RISK_LEVEL: [High/Moderate/Low]
RISK_REASON: [Brief justification]

PREDICTIONS:
1. [Reaction]: [X]% - [Reason]
2. [Reaction]: [X]% - [Reason]
3. [Reaction]: [X]% - [Reason]

MONITORING:
1. [Test/Checkup] - [Reason]
2. [Test/Checkup] - [Reason]
3. [Test/Checkup] - [Reason]
4. [Test/Checkup] - [Reason]

ALTERNATIVES:
[List if risk is Moderate/High]

SYMPTOMS:
1. [Symptom] - [Description]
2. [Symptom] - [Description]
3. [Symptom] - [Description]

GUIDELINES:
[Key clinical recommendations]

Important: The response must be complete and formatted exactly as shown above.`;

    // Use Gemini 1.5 Flash for prediction
    const model = predictionAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.1,
        topK: 20,
        topP: 0.8,
        maxOutputTokens: 2048,
      },
    });

    const result = await model.generateContent(prompt);
    const response = result.response.text();

    // Verify response formatting
    if (!response.includes('RISK_LEVEL:') ||
        !response.includes('PREDICTIONS:') ||
        !response.includes('MONITORING:')) {
      throw new Error('Response format validation failed');
    }

    // Parse the structured response
    const sections = response.split('\n\n');
    
    // Extract risk level and reason
    const riskMatch = sections.find(s => s.includes('RISK_LEVEL:'));
    const riskLevel = riskMatch?.match(/RISK_LEVEL:\s*(High|Moderate|Low)/i)?.[1] || 'Moderate';
    const riskReason = riskMatch?.match(/RISK_REASON:\s*([^\n]+)/)?.[1] || '';

    // Extract predictions
    const predictionsSection = sections.find(s => s.includes('PREDICTIONS:')) || '';
    const predictions = predictionsSection
      .split('\n')
      .filter(line => /^\d+\./.test(line.trim()))
      .map(line => {
        const [name, likelihood, description] = line.replace(/^\d+\.\s*/, '').split(/:\s*|%\s*-\s*/);
        return {
          name: name.trim(),
          likelihood: parseInt(likelihood) || 50,
          description: description?.trim() || 'Based on patient profile and medication data'
        };
      });

    // Extract monitoring recommendations
    const monitoringSection = sections.find(s => s.includes('MONITORING:')) || '';
    const recommendedCheckUps = monitoringSection
      .split('\n')
      .filter(line => /^\d+\./.test(line.trim()))
      .map(line => line.replace(/^\d+\.\s*/, '').trim());

    // Extract alternative treatments
    const alternativesSection = sections.find(s => s.includes('ALTERNATIVES:')) || '';
    const alternativeTreatments = alternativesSection
      .split('\n')
      .filter(line => line.trim() && !/^ALTERNATIVES:/.test(line))
      .map(line => {
        const [treatment, description] = line.split(/\s*-\s*/);
        return {
          treatment: treatment?.trim() || '',
          description: description?.trim() || 'Alternative option to consider'
        };
      });

    // Extract symptoms to monitor
    const symptomsSection = sections.find(s => s.includes('SYMPTOMS:')) || '';
    const symptomsToMonitor = symptomsSection
      .split('\n')
      .filter(line => /^\d+\./.test(line.trim()))
      .map(line => {
        const [symptom, description] = line.replace(/^\d+\.\s*/, '').split(/\s*-\s*/);
        return {
          symptom: symptom?.trim() || '',
          description: description?.trim() || 'Monitor for changes'
        };
      });

    // Extract guidelines
    const guidelinesSection = sections.find(s => s.includes('GUIDELINES:')) || '';
    const doctorsAdvice = guidelinesSection
      .replace(/^GUIDELINES:\s*/i, '')
      .trim() || 'Monitor patient closely and adjust treatment as needed.';

    // Validate required sections
    if (predictions.length < 3 || recommendedCheckUps.length < 4) {
      console.error('Invalid response format:', response);
      throw new Error('Response format validation failed');
    }

    // Determine final risk level based on dosage analysis
    const finalRiskLevel = dosageAnalysis.isHighDosage ? 'High' :
                         dosageAnalysis.assessment === 'REVIEW' ? 'Moderate' :
                         riskLevel;

    return {
      riskLevel: finalRiskLevel,
      predictions,
      recommendedCheckUps,
      alternativeTreatments,
      symptomsToMonitor,
      doctorsAdvice: dosageAnalysis.isHighDosage ?
        `URGENT: High dosage detected. ${doctorsAdvice}` : doctorsAdvice,
      dosageAssessment: {
        safety: dosageAnalysis.assessment,
        recommendedRange: dosageAnalysis.standardRange,
        weightBasedAdjustments: dosageAnalysis.weightBasedRange,
        reasoning: dosageAnalysis.reasoning
      },
      dosageAlerts: dosageAnalysis.isHighDosage ? [
        '⚠️ URGENT: Dosage exceeds recommended limits',
        `Daily dose (${dosageAnalysis.dailyDosage}${drugInfo.unit}) may be too high`,
        `Per kg dose (${dosageAnalysis.dosagePerKg}${drugInfo.unit}/kg) requires review`,
        'Immediate medical consultation recommended'
      ] : dosageAnalysis.assessment === 'REVIEW' ? [
        '⚠️ Dosage needs review',
        dosageAnalysis.reasoning
      ] : []
    };
  } catch (error) {
    console.error('GPT Prediction Error:', error);
    throw error;
  }
};

const processRequest = async (patientInfo, drugInfo) => {
  try {
    let lastError;
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        // Validate drug name using Gemini 1.5 Flash
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

        // Validate medical conditions using Gemini 1.5 Flash
        if (patientInfo.medicalHistory?.length > 0) {
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

        // Analyze dosage using Gemini
        const dosageAnalysis = await analyzeDosage(
          drugInfo.name,
          parseFloat(drugInfo.dosage),
          parseInt(drugInfo.duration),
          parseFloat(patientInfo.weight),
          drugInfo.unit
        );

        // Basic validation
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

        if (!patientInfo.medicalHistory?.length) {
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

        // Use Gemini 1.5 Flash for the main prediction
        return await predictWithGemini(patientInfo, drugInfo, dosageAnalysis);

      } catch (error) {
        console.error(`Attempt ${attempt} failed:`, error);
        lastError = error;
        
        if (attempt < MAX_RETRIES) {
          await delay(RETRY_DELAY * attempt);
          continue;
        }
        
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
    
    throw lastError;
  } catch (error) {
    console.error('Processing error:', error);
    throw error;
  }
};

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
  try {
    const { patientInfo, drugInfo } = req.body;
    
    if (!patientInfo || !drugInfo) {
      return res.status(400).json({ 
        error: 'Missing required data',
        details: 'Both patientInfo and drugInfo are required'
      });
    }

    const predictionResult = await processRequest(patientInfo, drugInfo);
    
    // Store prediction in Supabase
    const { data, error } = await supabase
      .from('predictions')
      .insert([{
        patient_info: patientInfo,
        drug_info: drugInfo,
        prediction: predictionResult
      }])
      .select();

    if (error) {
      console.error('Supabase insertion error:', error);
      throw error;
    }

    res.json(predictionResult);
  } catch (error) {
    console.error('Prediction error:', error);
    res.status(500).json({ 
      error: 'Prediction failed',
      message: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred'
    });
  }
});