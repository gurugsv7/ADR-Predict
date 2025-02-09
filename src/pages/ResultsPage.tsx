import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PredictionResults from '../components/PredictionResults';
import backgroundImage from '../assets/predict background.jpg';

const ResultsPage: React.FC = () => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const location = useLocation();
  const navigate = useNavigate();
  const prediction = location.state?.prediction;

  if (!prediction) {
    navigate('/');
    return null;
  }

  return (
    <div className="min-h-screen w-full bg-cover bg-center bg-no-repeat bg-fixed" style={{ backgroundImage: `url(${backgroundImage})` }}>
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
          <button
            onClick={() => navigate('/')}
            className="mb-8 px-6 py-3 text-blue-600 hover:text-blue-700 transition-colors"
          >
            ← Back to Form
          </button>
          <PredictionResults prediction={prediction} />
        </div>
      </div>
    </div>
  );
};

export default ResultsPage;
