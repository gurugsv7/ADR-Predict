import React from 'react';
import { ArrowRight, Shield, Brain, Heart, BarChart as ChartBar } from 'lucide-react';
import { motion } from 'framer-motion';
import Chatbot from '../components/Chatbot';
import heroBackground from '../assets/hero background.jpg';

interface HomePageProps {
  onStartPredict: () => void;
}

const HomePage: React.FC<HomePageProps> = ({ onStartPredict }) => {
  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat bg-fixed" style={{ backgroundImage: `url(${heroBackground})` }}>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="w-full">
            <div className="max-w-4xl mx-auto text-center">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <span className="block text-base font-semibold text-blue-600">
                  Introducing ADR Predict
                </span>
                <span className="mt-3 block text-5xl tracking-tight font-extrabold sm:text-6xl xl:text-7xl">
                  <span className="block text-gray-900">Predict Drug Reactions</span>
                  <span className="block text-blue-600 mt-2">Before They Happen</span>
                </span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="mt-6 text-xl text-black sm:text-2xl max-w-3xl mx-auto font-semibold"
              >
                Our advanced AI system analyzes patient data and medication information to predict potential adverse drug reactions with unprecedented accuracy, helping healthcare providers make safer prescription decisions.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="mt-10"
              >
                <motion.button
                  onClick={onStartPredict}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="group inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 ease-in-out shadow-lg"
                >
                  Start Prediction
                  <ArrowRight className="ml-3 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </motion.button>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Why Choose ADR Predict?
            </h2>
            <p className="mt-4 text-xl text-black font-semibold">
              Our comprehensive solution offers multiple benefits for healthcare providers
            </p>
          </div>

          <div className="mt-16">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <motion.div 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="pt-6"
              >
                <div className="flow-root bg-white/90 backdrop-blur-sm rounded-lg px-6 pb-8 shadow-xl">
                  <div className="-mt-6">
                    <div>
                      <span className="inline-flex items-center justify-center p-3 bg-blue-600 rounded-md shadow-lg">
                        <Shield className="h-6 w-6 text-white" />
                      </span>
                    </div>
                    <h3 className="mt-8 text-lg font-medium text-gray-900 tracking-tight">Enhanced Safety</h3>
                    <p className="mt-5 text-base text-gray-500">
                      Predict potential adverse reactions before they occur, ensuring patient safety and reducing medical complications.
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="pt-6"
              >
                <div className="flow-root bg-white/90 backdrop-blur-sm rounded-lg px-6 pb-8 shadow-xl">
                  <div className="-mt-6">
                    <div>
                      <span className="inline-flex items-center justify-center p-3 bg-blue-600 rounded-md shadow-lg">
                        <Brain className="h-6 w-6 text-white" />
                      </span>
                    </div>
                    <h3 className="mt-8 text-lg font-medium text-gray-900 tracking-tight">AI-Powered Analysis</h3>
                    <p className="mt-5 text-base text-gray-500">
                      Advanced machine learning algorithms analyze complex medical data to provide accurate predictions.
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="pt-6"
              >
                <div className="flow-root bg-white/90 backdrop-blur-sm rounded-lg px-6 pb-8 shadow-xl">
                  <div className="-mt-6">
                    <div>
                      <span className="inline-flex items-center justify-center p-3 bg-blue-600 rounded-md shadow-lg">
                        <ChartBar className="h-6 w-6 text-white" />
                      </span>
                    </div>
                    <h3 className="mt-8 text-lg font-medium text-gray-900 tracking-tight">Data-Driven Insights</h3>
                    <p className="mt-5 text-base text-gray-500">
                      Comprehensive analytics and visualizations help make informed decisions about patient care.
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Centered Heading with glow effect */}
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold text-gray-900">
              Our Mission
            </h2>
            <p className="mt-6 text-xl text-black font-semibold max-w-3xl mx-auto">
              ADR Predict was created by three passionate students for an IIT hackathon with the goal of revolutionizing healthcare through artificial intelligence.
            </p>
          </div>

          {/* Mission Highlights */}
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="pt-6"
            >
              <div className="flow-root bg-white/90 backdrop-blur-sm rounded-lg px-6 pb-8 shadow-xl">
                <div className="-mt-6">
                  <div>
                    <span className="inline-flex items-center justify-center p-3 bg-blue-600 rounded-md shadow-lg">
                      <Brain className="h-6 w-6 text-white" />
                    </span>
                  </div>
                  <h3 className="mt-8 text-lg font-medium text-gray-900 tracking-tight">Innovation Focus</h3>
                  <p className="mt-5 text-base text-gray-500">
                    Developing cutting-edge AI solutions to revolutionize healthcare and improve patient safety.
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="pt-6"
            >
              <div className="flow-root bg-white/90 backdrop-blur-sm rounded-lg px-6 pb-8 shadow-xl">
                <div className="-mt-6">
                  <div>
                    <span className="inline-flex items-center justify-center p-3 bg-blue-600 rounded-md shadow-lg">
                      <Heart className="h-6 w-6 text-white" />
                    </span>
                  </div>
                  <h3 className="mt-8 text-lg font-medium text-gray-900 tracking-tight">Student-Led Initiative</h3>
                  <p className="mt-5 text-base text-gray-500">
                    Created by students participating in an IIT hackathon to solve healthcare challenges.
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="pt-6"
            >
              <div className="flow-root bg-white/90 backdrop-blur-sm rounded-lg px-6 pb-8 shadow-xl">
                <div className="-mt-6">
                  <div>
                    <span className="inline-flex items-center justify-center p-3 bg-blue-600 rounded-md shadow-lg">
                      <Shield className="h-6 w-6 text-white" />
                    </span>
                  </div>
                  <h3 className="mt-8 text-lg font-medium text-gray-900 tracking-tight">Healthcare Impact</h3>
                  <p className="mt-5 text-base text-gray-500">
                    Making medication safer by predicting and preventing adverse drug reactions.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8 lg:flex lg:items-center lg:justify-between">
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            <span className="block">Ready to get started?</span>
            <span className="block text-blue-200">Try our prediction system today.</span>
          </h2>
          <div className="mt-8 flex lg:mt-0 lg:flex-shrink-0">
            <div className="inline-flex rounded-md shadow">
              <motion.button
                onClick={onStartPredict}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50 transition-colors"
              >
                Get started
                <ArrowRight className="ml-3 h-5 w-5" />
              </motion.button>
            </div>
          </div>
        </div>
      </section>
      <Chatbot />
    </div>
  );
};

export default HomePage;
