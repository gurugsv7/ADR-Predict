import React from 'react';
import { HelpCircle, Info } from 'lucide-react';

interface PatientFormProps {
  patientInfo: {
    age: number;
    gender: string;
    weight: number;
    height: number;
    medicalHistory: string[];
  };
  setPatientInfo: (info: any) => void;
}

const PatientForm: React.FC<PatientFormProps> = ({ patientInfo, setPatientInfo }) => {
  const [currentCondition, setCurrentCondition] = React.useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'medicalHistory') {
      setCurrentCondition(value);
    } else {
      setPatientInfo({ ...patientInfo, [name]: value });
    }
  };

  const addCondition = (condition: string) => {
    const trimmedCondition = condition.trim();
    if (trimmedCondition) {
      const newConditions = [...patientInfo.medicalHistory];
      // Only add if it's not already in the list and not empty
      if (!newConditions.includes(trimmedCondition) && trimmedCondition !== '') {
        newConditions.push(trimmedCondition);
        setPatientInfo({ ...patientInfo, medicalHistory: newConditions });
        setCurrentCondition(''); // Clear the input
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle comma key
    if (e.key === ',') {
      e.preventDefault();
      addCondition(currentCondition);
    }
    // Handle Enter key
    else if (e.key === 'Enter') {
      e.preventDefault();
      addCondition(currentCondition);
    }
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-white p-8 rounded-lg shadow-lg">
      {/* New Header */}
      <h1 className="text-center text-3xl font-bold mb-6 text-blue-700">Patient Information</h1>
      <div className="bg-white rounded-xl p-6 border border-blue-100 shadow-sm">
        <div className="space-y-6">
          {/* Wrap Age Section */}
          <div className="border border-gray-300 p-4 rounded-xl">
            <div className="relative group">
              <label className="block text-sm font-medium text-gray-700">
                Age
                <div className="mt-1 relative">
                  <input
                    type="number"
                    name="age"
                    value={patientInfo.age}
                    onChange={handleChange}
                    required
                    className="block w-full px-4 py-3 rounded-xl border-gray-200 focus:border-blue-500 focus:ring focus:ring-blue-200 focus:outline-none transition-shadow duration-200"
                    placeholder="Enter age"
                    min="0"
                    max="120"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <Info className="h-4 w-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                  </div>
                </div>
              </label>
              <div className="absolute invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-xs rounded-lg py-2 px-3 right-0 top-0 mt-8">
                Enter patient's age between 0-120 years
              </div>
            </div>
          </div>
          {/* Wrap Gender Section */}
          <div className="border border-gray-300 p-4 rounded-xl">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Gender
                <div className="mt-1">
                  <select
                    name="gender"
                    value={patientInfo.gender}
                    onChange={handleChange}
                    required
                    className="block w-full px-4 py-3 rounded-xl border-gray-200 focus:border-blue-500 focus:ring focus:ring-blue-200 focus:outline-none transition-shadow duration-200"
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </label>
            </div>
          </div>
          {/* Wrap Weight and Height Sections */}
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-gray-300 p-4 rounded-xl">
              <label className="block text-sm font-medium text-gray-700">
                Weight (kg)
                <div className="mt-1">
                  <input
                    type="number"
                    name="weight"
                    value={patientInfo.weight}
                    onChange={handleChange}
                    required
                    className="block w-full px-4 py-3 rounded-xl border-gray-200 focus:border-blue-500 focus:ring focus:ring-blue-200 focus:outline-none transition-shadow duration-200"
                    placeholder="Enter weight"
                    min="0"
                  />
                </div>
              </label>
            </div>
            <div className="border border-gray-300 p-4 rounded-xl">
              <label className="block text-sm font-medium text-gray-700">
                Height (cm)
                <div className="mt-1">
                  <input
                    type="number"
                    name="height"
                    value={patientInfo.height}
                    onChange={handleChange}
                    required
                    className="block w-full px-4 py-3 rounded-xl border-gray-200 focus:border-blue-500 focus:ring focus:ring-blue-200 focus:outline-none transition-shadow duration-200"
                    placeholder="Enter height"
                    min="0"
                  />
                </div>
              </label>
            </div>
          </div>
          <hr className="border-t border-gray-200" />
          {/* Enhanced Medical History Section */}
          <div className="border border-gray-300 p-4 rounded-xl">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Medical History
            </label>
            <div className="space-y-4">
              <div className="relative group">
                <div className="flex items-center">
                  <input
                    type="text"
                    name="medicalHistory"
                    value={currentCondition}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    className="block w-full px-4 py-3 rounded-xl border-gray-200 focus:border-blue-500 focus:ring focus:ring-blue-200 focus:outline-none transition-shadow duration-200"
                    placeholder="Type condition and press Enter or comma to add"
                  />
                  <div className="absolute right-2">
                    <HelpCircle className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
                <div className="absolute invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-xs rounded-lg py-2 px-3 right-0 top-0 mt-12 w-64 z-10">
                  Enter multiple conditions separated by commas
                </div>
              </div>
              
              {/* Display Current Medical History */}
              {patientInfo.medicalHistory.length > 0 && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-700 mb-2">Current Medical Conditions:</h4>
                  <div className="flex flex-wrap gap-2">
                    {patientInfo.medicalHistory.map((condition, index) => (
                      <div
                        key={index}
                        className="inline-flex items-center bg-white px-3 py-1 rounded-full border border-blue-200 text-sm text-blue-700"
                      >
                        {condition}
                        <button
                          type="button"
                          onClick={() => {
                            const newHistory = [...patientInfo.medicalHistory];
                            newHistory.splice(index, 1);
                            setPatientInfo({ ...patientInfo, medicalHistory: newHistory });
                          }}
                          className="ml-2 text-blue-400 hover:text-blue-600"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientForm;