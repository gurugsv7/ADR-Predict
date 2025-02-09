import { useState } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

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
  drugClass: string;
  duration: number;
  previousADR: boolean;
}

interface Prediction {
  riskLevel: string;
  predictions: Array<{
    name: string;
    likelihood: number;
    description: string;
  }>;
}

export const usePrediction = () => {
  const [patientInfo, setPatientInfo] = useState<PatientInfo>({
    age: 0,
    gender: '',
    weight: 0,
    height: 0,
    medicalHistory: [],
  });

  const [drugInfo, setDrugInfo] = useState<DrugInfo>({
    name: '',
    dosage: 0,
    unit: '',
    drugClass: '',
    duration: 0,
    previousADR: false,
  });

  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePredict = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.post(`${API_URL}/predict`, {
        patientInfo,
        drugInfo,
      });

      setPrediction(response.data);
    } catch (err) {
      setError('An error occurred while making the prediction. Please try again.');
      console.error('Prediction error:', err);
    } finally {
      setLoading(false);
    }
  };

  return {
    patientInfo,
    drugInfo,
    prediction,
    loading,
    error,
    setPatientInfo,
    setDrugInfo,
    handlePredict,
  };
};