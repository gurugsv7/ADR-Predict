import React from 'react';
import { AlertTriangle, ThumbsUp, AlertOctagon, HelpCircle } from 'lucide-react';

interface Prediction {
  name: string;
  likelihood: number;
  description: string;
}

interface PredictionResultsProps {
  prediction: {
    riskLevel: string;
    predictions: Prediction[];
    recommendedCheckUps: string[];
    alternativeTreatments: Array<{ treatment: string; description: string }>;
    symptomsToMonitor: Array<{ symptom: string; description: string }>;
    doctorsAdvice: string;
  };
}

const PredictionResults: React.FC<PredictionResultsProps> = ({ prediction }) => {
  const getRiskLevelInfo = (level: string) => {
    switch (level.toLowerCase()) {
      case 'low':
        return {
          color: 'bg-green-50 text-green-800 ring-green-600/20',
          icon: <ThumbsUp className="h-6 w-6 text-green-600" />,
          description: 'Low risk of adverse reactions. Regular monitoring recommended.'
        };
      case 'moderate':
        return {
          color: 'bg-yellow-50 text-yellow-800 ring-yellow-600/20',
          icon: <AlertTriangle className="h-6 w-6 text-yellow-600" />,
          description: 'Moderate risk. Close monitoring and regular check-ups required.'
        };
      case 'high':
        return {
          color: 'bg-red-50 text-red-800 ring-red-600/20',
          icon: <AlertOctagon className="h-6 w-6 text-red-600" />,
          description: 'High risk. Immediate medical attention and alternative treatments should be considered.'
        };
      case 'unknown':
        return {
          color: 'bg-gray-50 text-gray-800 ring-gray-600/20',
          icon: <HelpCircle className="h-6 w-6 text-gray-600" />,
          description: 'Unable to assess risk level due to missing drug information.'
        };
      case 'caution':
        return {
          color: 'bg-orange-50 text-orange-800 ring-orange-600/20',
          icon: <AlertTriangle className="h-6 w-6 text-orange-600" />,
          description: 'Limited information available. Assessment may not be complete.'
        };
      case 'error':
        return {
          color: 'bg-gray-50 text-gray-800 ring-gray-600/20',
          icon: <AlertOctagon className="h-6 w-6 text-gray-600" />,
          description: 'Service error. Please try again later.'
        };
      default:
        return {
          color: 'bg-gray-50 text-gray-800 ring-gray-600/20',
          icon: <AlertTriangle className="h-6 w-6 text-gray-600" />,
          description: 'Risk level assessment pending.'
        };
    }
  };

  const riskInfo = getRiskLevelInfo(prediction.riskLevel);

  return (
    <div className="mt-4 animate-fade-in">
      <div className="bg-gradient-to-br from-white to-blue-50/50 backdrop-blur-sm shadow-xl rounded-3xl p-8 border border-blue-100">
        <h2 className="text-3xl font-bold text-gray-900 mb-8 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
          Prediction Results
        </h2>
        
        {/* Risk Level Card */}
        <div className="mb-8 transform hover:scale-102 transition-transform">
          <div className={`rounded-2xl p-8 ring-1 ${riskInfo.color} bg-gradient-to-br from-white/80 to-transparent backdrop-blur-sm shadow-lg`}>
            <div className="flex items-center">
              {riskInfo.icon}
              <div className="ml-4">
                <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">
                  {prediction.riskLevel} Risk Level
                </h3>
                <p className="mt-2 text-base">
                  {riskInfo.description}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Predictions and Alternative Treatments Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Predicted Reactions</h3>
            <div className="space-y-4">
              {prediction.predictions.map((pred, index) => {
                // For special messages (like missing drug info), don't show percentage
                const isSpecialMessage = pred.likelihood === 0;
                const severity = isSpecialMessage ? 'special' : 
                  pred.likelihood > 75 ? 'high' : 
                  pred.likelihood > 50 ? 'moderate' : 'low';
                
                const severityColors = {
                  high: 'bg-gradient-to-br from-red-50 to-red-100/50 border-red-100',
                  moderate: 'bg-gradient-to-br from-yellow-50 to-yellow-100/50 border-yellow-100',
                  low: 'bg-gradient-to-br from-green-50 to-green-100/50 border-green-100',
                  special: 'bg-gradient-to-br from-gray-50 to-gray-100/50 border-gray-100'
                };
                
                return (
                  <div
                    key={index}
                    className={`rounded-xl p-6 border ${severityColors[severity]} shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-102`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="text-lg font-semibold text-gray-900">{pred.name}</h4>
                      {!isSpecialMessage && (
                        <span className={`text-lg font-bold px-3 py-1 rounded-full ${
                          severity === 'high' ? 'bg-red-100 text-red-600' :
                          severity === 'moderate' ? 'bg-yellow-100 text-yellow-600' :
                          'bg-green-100 text-green-600'
                        }`}>
                          {pred.likelihood}%
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">{pred.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Alternative Treatments */}
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Alternative Treatments</h3>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl p-6 border border-purple-100 shadow-lg">
              <div className="space-y-6">
                {prediction.alternativeTreatments.map((item, index) => (
                  <div key={index} className="bg-white/80 rounded-lg p-4 shadow-sm">
                    <div className="flex items-center mb-2">
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center mr-3">
                        <span className="text-sm text-purple-600 font-bold">{index + 1}</span>
                      </div>
                      <h4 className="text-lg font-semibold text-purple-900">{item.treatment}</h4>
                    </div>
                    <p className="text-purple-700 ml-11">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Additional Information Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-8">
            <div className="bg-blue-50/50 backdrop-blur-sm rounded-xl p-6 border border-blue-100">
              <h3 className="text-lg font-semibold text-blue-900 mb-4">Recommended Check-Ups</h3>
              <ul className="space-y-3">
                {prediction.recommendedCheckUps.map((checkUp, index) => (
                  <li key={index} className="flex items-start">
                    <div className="flex-shrink-0 h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                      <span className="text-sm text-blue-600 font-medium">{index + 1}</span>
                    </div>
                    <span className="text-blue-800">{checkUp}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-yellow-50/50 backdrop-blur-sm rounded-xl p-6 border border-yellow-100">
              <h3 className="text-lg font-semibold text-yellow-900 mb-4">Symptoms to Monitor</h3>
              <ul className="space-y-3">
                {prediction.symptomsToMonitor.map((item, index) => (
                  <li key={index} className="space-y-1">
                    <div className="flex items-center">
                      <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
                      <span className="font-medium text-yellow-800">{item.symptom}</span>
                    </div>
                    <p className="text-sm text-yellow-700 ml-7">{item.description}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div>
            <div className="bg-green-50/50 backdrop-blur-sm rounded-xl p-6 border border-green-100 h-full">
              <h3 className="text-lg font-semibold text-green-900 mb-4">Doctor's Advice</h3>
              <div className="prose prose-sm text-green-800">
                <p>{prediction.doctorsAdvice}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PredictionResults;