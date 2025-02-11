import React from 'react';
import { HelpCircle, AlertCircle } from 'lucide-react';

interface DrugFormProps {
  drugInfo: {
    name: string;
    dosage: number;
    unit: string;
    duration: number;
    previousADR: boolean;
  };
  setDrugInfo: (info: any) => void;
}

const DrugForm: React.FC<DrugFormProps> = ({ drugInfo, setDrugInfo }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const finalValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setDrugInfo({ ...drugInfo, [name]: finalValue });
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-white p-8 rounded-lg shadow-lg">
      {/* New Header */}
      <h1 className="text-center text-3xl font-bold mb-6 text-blue-700">Drug Information</h1>
      <div className="bg-white rounded-xl p-6 border border-blue-100 shadow-sm">
        <div className="space-y-6">
          {/* Wrap Drug Name Section */}
          <div className="border border-gray-300 p-4 rounded-xl">
            <label className="block text-sm font-medium text-gray-700">
              Drug Name
              <div className="mt-1">
                <input
                  type="text"
                  name="name"
                  value={drugInfo.name}
                  onChange={handleChange}
                  required
                  className="block w-full px-4 py-3 rounded-xl border-gray-200 focus:border-blue-500 focus:ring focus:ring-blue-200 focus:outline-none transition-shadow duration-200"
                  placeholder="Enter drug name"
                />
              </div>
            </label>
          </div>
          {/* Wrap Dosage and Unit Sections */}
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-gray-300 p-4 rounded-xl">
              <label className="block text-sm font-medium text-gray-700">
                Dosage
                <div className="mt-1">
                  <input
                    type="number"
                    name="dosage"
                    value={drugInfo.dosage}
                    onChange={handleChange}
                    required
                    className="block w-full px-4 py-3 rounded-xl border-gray-200 focus:border-blue-500 focus:ring focus:ring-blue-200 focus:outline-none transition-shadow duration-200"
                    placeholder="Enter dosage"
                    min="0"
                  />
                </div>
              </label>
            </div>
            <div className="border border-gray-300 p-4 rounded-xl">
              <label className="block text-sm font-medium text-gray-700">
                Unit
                <div className="mt-1">
                  <select
                    name="unit"
                    value={drugInfo.unit}
                    onChange={handleChange}
                    required
                    className="block w-full px-4 py-3 rounded-xl border-gray-200 focus:border-blue-500 focus:ring focus:ring-blue-200 focus:outline-none transition-shadow duration-200"
                  >
                    <option value="">Select unit</option>
                    <option value="mg">mg</option>
                    <option value="g">g</option>
                    <option value="ml">ml</option>
                    <option value="mcg">mcg</option>
                  </select>
                </div>
              </label>
            </div>
          </div>
          {/* Wrap Duration Section */}
          <div className="border border-gray-300 p-4 rounded-xl">
            <label className="block text-sm font-medium text-gray-700">
              Duration (days)
              <div className="mt-1">
                <input
                  type="number"
                  name="duration"
                  value={drugInfo.duration}
                  onChange={handleChange}
                  required
                  className="block w-full px-4 py-3 rounded-xl border-gray-200 focus:border-blue-500 focus:ring focus:ring-blue-200 focus:outline-none transition-shadow duration-200"
                  placeholder="Enter duration in days"
                  min="1"
                />
              </div>
            </label>
          </div>
          {/* Previous ADR Section remains unchanged */}
          <div className="bg-yellow-50 rounded-xl p-4">
            <label className="flex items-start space-x-3">
              <div className="flex items-center h-5">
                <input
                  type="checkbox"
                  name="previousADR"
                  checked={drugInfo.previousADR}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </div>
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-900">Previous ADR History</span>
                <p className="mt-1 text-sm text-gray-500">
                  Check this if the patient has experienced adverse drug reactions in the past
                </p>
              </div>
              <AlertCircle className="h-5 w-5 text-yellow-400 flex-shrink-0" />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DrugForm;