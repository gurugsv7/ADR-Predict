import express from 'express';
import { Prediction } from '../models/Prediction.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

export const predictRouter = express.Router();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

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

const predictWithGPT = async (patientInfo, drugInfo, dosageAnalysis) => {
  try {
    const prompt = `
      You are an advanced ADR (Adverse Drug Reaction) prediction system. Using the provided patient data and medication details, analyze potential reactions and provide a comprehensive safety assessment.

      Patient Profile:
      - Age: ${patientInfo.age} years
      - Weight: ${patientInfo.weight}kg
      - Height: ${patientInfo.height}cm
      - Medical History: ${patientInfo.medicalHistory.join(', ')}
      
      Medication Details:
      - Drug: ${drugInfo.name}
      - Dosage: ${drugInfo.dosage}${drugInfo.unit}
      - Duration: ${drugInfo.duration} days
      - Prior ADR History: ${drugInfo.previousADR ? 'Yes' : 'No'}

      Current Analysis:
      - Daily Dose: ${dosageAnalysis.dailyDosage}${drugInfo.unit}/day
      - Weight-based Dose: ${dosageAnalysis.dosagePerKg}${drugInfo.unit}/kg/day
      - Safety Assessment: ${dosageAnalysis.assessment}
      ${dosageAnalysis.reasoning ? `- Clinical Notes: ${dosageAnalysis.reasoning}` : ''}

      Required Format:

      1. Risk Level Assessment:
      Specify as [High/Moderate/Low] with brief justification

      2. Specific ADR Predictions:
      List each predicted reaction in format:
      - [Reaction Name]: [X]% - [Brief explanation of why]
      (Minimum 3 predictions, each with percentage and rationale)

      3. Required Monitoring Protocol:
      List specific checkups and tests, each with rationale:
      - [Checkup/Test] - [Why it's needed]
      (Minimum 4 specific monitoring requirements)

      4. Alternative Considerations:
      [Only if risk level is Moderate or High]

      5. Critical Symptoms for Monitoring:
      [List with descriptions]

      6. Clinical Guidelines:
      [Specific recommendations]

      Note: Ensure all predictions and recommendations are evidence-based and specific to this patient's profile, medical history, and medication details. Focus on clinical accuracy and actionable insights.

      Note: All predictions should be evidence-based while maintaining patient safety as the top priority.
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an advanced Adverse Drug reaction prediction system that analyzes patient data and medication details to predict potential adverse drug reactions. Focus on evidence-based predictions and patient safety."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1, // Lower temperature for more consistent, focused responses
      max_tokens: 2048, // Increased token limit for more detailed responses
      presence_penalty: 0.1, // Slight penalty to encourage specificity
      frequency_penalty: 0.1 // Slight penalty to encourage diverse predictions
    });

    const response = completion.choices[0].message.content;

    // Parse GPT response into structured format
    const riskLevel = response.match(/Risk Level.*?(?:High|Moderate|Low)/i)?.[0].split(/:\s*/)[1] || 'Moderate';
    
    // Parse the entire response
    const sections = response.split(/\n\d+\.|(?=Risk Level)/i);
    
    // Extract predictions
    const predictions = [];
    let predictionSection = sections.find(s =>
      /specific adr|potential reactions|likely reactions|predicted effects/i.test(s)
    ) || '';

    // First try to extract structured predictions
    const predictionLines = predictionSection
      .split('\n')
      .filter(line => line.trim() && /[-•\d]/.test(line));

    for (const line of predictionLines) {
      // Try different formats of prediction lines
      const patterns = [
        // "Headache: 70% - Description"
        /([^:]+):\s*(\d+)%\s*(?:-|\s–\s)*\s*(.*)/i,
        // "70% likelihood of headache - Description"
        /(\d+)%\s*(?:chance|risk|likelihood)\s*of\s*([^-\n]+)(?:-|\s–\s)*\s*(.*)/i,
        // "- Headache (70%) - Description"
        /[-•]\s*([^(]+)\s*\((\d+)%\)\s*(?:-|\s–\s)*\s*(.*)/i,
        // "Headache - 70% - Description"
        /([^-]+)\s*-\s*(\d+)%\s*(?:-|\s–\s)*\s*(.*)/i
      ];

      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match) {
          let name, likelihood, description;
          if (pattern === patterns[0]) {
            [, name, likelihood, description] = match;
          } else if (pattern === patterns[1]) {
            [, likelihood, name, description] = match;
          } else if (pattern === patterns[2]) {
            [, name, likelihood, description] = match;
          } else {
            [, name, likelihood, description] = match;
          }

          predictions.push({
            name: name.trim(),
            likelihood: parseInt(likelihood),
            description: description.trim() || `${likelihood}% likelihood based on patient profile and medication interactions`
          });
          break;
        }
      }
    }

    // Extract monitoring recommendations
    const checkUpsSection = sections.find(s =>
      /monitoring|check[- ]?ups?|recommended monitoring/i.test(s)
    ) || '';

    const recommendedCheckUps = checkUpsSection
      .split('\n')
      .filter(line => line.trim() && /[-•\d]/.test(line))
      .map(line => {
        // Remove leading markers and clean up
        return line
          .replace(/^[\d\s.•-]+/, '')
          .replace(/^[:\s]+/, '')
          .trim();
      })
      .filter(line => line.length > 0);

    // Extract alternative treatments
    const alternativeTreatments = [];
    const altMatch = response.match(/alternative[^]*?:([^]*?)(?:\n\n|\n[A-Z]|$)/i)?.[1];
    if (altMatch) {
      const altLines = altMatch.split('\n').filter(line => line.trim());
      for (const line of altLines) {
        const [treatment, ...desc] = line.replace(/^-\s*/, '').split(/:\s*/);
        if (treatment) {
          alternativeTreatments.push({
            treatment: treatment.trim(),
            description: desc.join(':').trim() || 'Alternative option to consider'
          });
        }
      }
    }

    // Extract symptoms to monitor
    const symptomsToMonitor = [];
    const symptomsMatch = response.match(/symptoms[^]*?:([^]*?)(?:\n\n|\n[A-Z]|$)/i)?.[1];
    if (symptomsMatch) {
      const symptomLines = symptomsMatch.split('\n').filter(line => line.trim());
      for (const line of symptomLines) {
        const [symptom, ...desc] = line.replace(/^-\s*/, '').split(/:\s*/);
        if (symptom) {
          symptomsToMonitor.push({
            symptom: symptom.trim(),
            description: desc.join(':').trim() || 'Monitor for changes'
          });
        }
      }
    }

    // Extract doctor's advice from clinical recommendations
    const doctorsAdvice = response
      .match(/clinical[^]*?:([^]*?)(?:\n\n|\n[A-Z]|$)/i)?.[1]
      ?.split('\n')
      .filter(line => line.trim())
      .map(line => line.replace(/^-\s*/, '').trim())
      .join(' ') || 'Monitor patient closely and adjust treatment as needed.';

    // Verify we have valid predictions and monitoring recommendations
    if (predictions.length === 0 || recommendedCheckUps.length === 0) {
      console.error('GPT response parsing failed to extract required predictions or checkups:', response);
      throw new Error('Failed to generate specific predictions and monitoring protocol. Please try again.');
    }

    // Ensure risk level reflects high dosage concerns
    const finalRiskLevel = dosageAnalysis.isHighDosage ? 'High' :
                         dosageAnalysis.assessment === 'REVIEW' ?
                           Math.max(riskLevel === 'High' ? 2 : riskLevel === 'Moderate' ? 1 : 0, 1) === 2 ? 'High' : 'Moderate'
                           : riskLevel;

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

        // Use GPT-3.5 Turbo for the main prediction
        return await predictWithGPT(patientInfo, drugInfo, dosageAnalysis);

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
    const predictionResult = await processRequest(patientInfo, drugInfo);
    
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