import mongoose from 'mongoose';

const PredictionSchema = new mongoose.Schema({
  patientInfo: {
    age: { type: Number, required: true },
    gender: { type: String, required: true },
    weight: { type: Number, required: true },
    height: { type: Number, required: true },
    medicalHistory: [{ type: String }]
  },
  drugInfo: {
    name: { type: String, required: true },
    dosage: { type: Number, required: true },
    unit: { type: String, required: true },
    drugClass: { type: String, required: true },
    duration: { type: Number, required: true },
    previousADR: { type: Boolean, required: true }
  },
  prediction: {
    riskLevel: { type: String, required: true },
    predictions: [{
      name: { type: String, required: true },
      likelihood: { type: Number, required: true },
      description: { type: String, required: true }
    }],
    createdAt: { type: Date, default: Date.now }
  }
});

export const Prediction = mongoose.model('Prediction', PredictionSchema);