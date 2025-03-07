import { useState } from 'react';

// Get API URL from environment variables with fallback
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface PatientInfo {
  age: number;
  gender: string;
  weight: number;
  height: number;
  medicalHistory: string[];
}

interface DrugInfo {
  name: string;
  dosage: number;
  unit: string;
  duration: number;
  previousADR: boolean;
}

interface PredictionResponse {
  riskLevel: string;
  predictions: Array<{
    name: string;
    likelihood: number;
    description: string;
  }>;
  recommendedCheckUps: string[];
  alternativeTreatments: Array<{
    treatment: string;
    description: string;
  }>;
  symptomsToMonitor: Array<{
    symptom: string;
    description: string;
  }>;
  doctorsAdvice: string;
  dosageAssessment: {
    safety: string;
    recommendedRange: string;
    weightBasedAdjustments: string;
    reasoning: string;
  };
  dosageAlerts: string[];
}

interface ErrorResponse {
  error: string;
  message: string;
  details?: string;
}

export const usePrediction = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);

  const getPrediction = async (patientInfo: PatientInfo, drugInfo: DrugInfo): Promise<PredictionResponse> => {
    setLoading(true);
    setError(null);

    try {
      console.log(`Making prediction request to: ${API_URL}/predict`);
      
      const response = await fetch(`${API_URL}/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ patientInfo, drugInfo }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorData = data as ErrorResponse;
        throw new Error(errorData.message || errorData.details || 'Failed to get prediction');
      }

      const predictionData = data as PredictionResponse;
      setPrediction(predictionData);
      return predictionData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      console.error('Prediction error:', err);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    prediction,
    loading,
    error,
    getPrediction,
  };
};