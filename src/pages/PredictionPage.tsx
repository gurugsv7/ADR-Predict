import React, { useState } from 'react';
import { AlertCircle, User, Pill } from 'lucide-react';
import PatientForm from '../components/PatientForm';
import DrugForm from '../components/DrugForm';
import { useNavigate } from 'react-router-dom';
import backgroundImage from '../assets/predict background.jpg';

const PredictionPage: React.FC = () => {
  const navigate = useNavigate();
  const [patientInfo, setPatientInfo] = useState({
    age: 0,
    gender: '',
    weight: 0,
    height: 0,
    medicalHistory: []
  });
  const [drugInfo, setDrugInfo] = useState({
    name: '',
    dosage: 0,
    unit: '',
    duration: 0,
    previousADR: false,
  });
  const [prediction, setPrediction] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    // Add validation before submission
    if (!patientInfo.age || !patientInfo.gender || !patientInfo.weight || !patientInfo.height) {
      setError('Please fill in all patient information fields');
      return;
    }
    if (!drugInfo.name || !drugInfo.dosage || !drugInfo.unit || !drugInfo.duration) {
      setError('Please fill in all drug information fields');
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('http://localhost:5000/api/predict', { // full URL with backend port
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientInfo, drugInfo }),
      });
      if (res.ok) {
        const data = await res.json();
        navigate('/results', { state: { prediction: data } });
      } else {
        setError('Prediction API error');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-cover bg-center bg-no-repeat bg-fixed" style={{ backgroundImage: `url(${backgroundImage})` }}>
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="relative">
              <PatientForm
                patientInfo={patientInfo}
                setPatientInfo={setPatientInfo}
              />
            </div>

            <div className="relative">
              <DrugForm
                drugInfo={drugInfo}
                setDrugInfo={setDrugInfo}
              />
            </div>
          </div>

          {/* Sticky Submit Button */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-sm border-t border-gray-200 lg:relative lg:mt-8 lg:bg-transparent lg:border-0">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col space-y-4">
                {error && (
                  <div className="w-full bg-red-50 border-l-4 border-red-400 p-4 rounded-lg animate-slide-in">
                    <div className="flex items-center">
                      <AlertCircle className="h-5 w-5 text-red-400" />
                      <div className="ml-3">
                        <p className="text-sm text-red-700">{error}</p>
                      </div>
                    </div>
                  </div>
                )}
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full lg:w-auto lg:mx-auto px-8 py-3 text-lg font-medium text-white bg-gradient-to-r from-[#4A90E2] to-[#5C6BC0] rounded-xl hover:from-[#357ABD] hover:to-[#4A5AAA] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4A90E2] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-in-out shadow-lg hover:shadow-xl"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Processing...
                    </div>
                  ) : (
                    'Predict Adverse Drug Reactions'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PredictionPage;