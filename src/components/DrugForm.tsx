import React, { useState } from 'react';
import { HelpCircle, AlertCircle, Camera } from 'lucide-react';

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
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const finalValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setDrugInfo({ ...drugInfo, [name]: finalValue });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingImage(true);
    const formData = new FormData();
    formData.append('image', file);

    setImageError(null);
    try {
      console.log('Uploading image...', file.name);
      const response = await fetch('/api/predict/extract-text', {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        }
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);
      
      if (data.text) {
        setDrugInfo({ ...drugInfo, name: data.text });
      } else {
        setImageError('No medicine name found in the image. Please ensure the image is clear and contains a medicine name.');
      }
    } catch (error) {
      console.error('Error processing image:', error);
      setImageError('Failed to process image. Please ensure the image is clear and try again.');
    } finally {
      setIsProcessingImage(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-white p-8 rounded-lg shadow-lg">
      <h1 className="text-center text-3xl font-bold mb-6 text-blue-700">Drug Information</h1>
      <div className="bg-white rounded-xl p-6 border border-blue-100 shadow-sm">
        <div className="space-y-6">
          <div className="border border-gray-300 p-4 rounded-xl">
            <label className="block text-sm font-medium text-gray-700">
              Drug Name
              <div className="mt-1 relative">
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="name"
                    value={drugInfo.name}
                    onChange={handleChange}
                    required
                    className="block w-full px-4 py-3 rounded-xl border-gray-200 focus:border-blue-500 focus:ring focus:ring-blue-200 focus:outline-none transition-shadow duration-200"
                    placeholder="Enter drug name"
                  />
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="image-upload"
                      disabled={isProcessingImage}
                    />
                    <label
                      htmlFor="image-upload"
                      className={`inline-flex items-center px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-700 cursor-pointer hover:bg-gray-50 ${
                        isProcessingImage ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <Camera className="h-5 w-5" />
                    </label>
                  </div>
                </div>
                {isProcessingImage && (
                  <div className="absolute right-16 top-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                  </div>
                )}
                {imageError && (
                  <div className="mt-2 text-sm text-red-600">
                    <span className="flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {imageError}
                    </span>
                  </div>
                )}
              </div>
            </label>
          </div>
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