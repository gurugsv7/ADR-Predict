import React from 'react';
import { Activity, ArrowRight, Shield, Brain, Heart, BarChart as ChartBar } from 'lucide-react';
import HomePage from './pages/HomePage';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import PredictionPage from './pages/PredictionPage';
import ResultsPage from './pages/ResultsPage';

const App = () => {
  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
        <header className="bg-white/80 backdrop-blur-sm sticky top-0 z-50 border-b border-blue-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Link to="/" className="flex items-center space-x-3">
                <Activity className="h-8 w-8 text-blue-600 cursor-pointer" />
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                  ADR Predict
                </h1>
              </Link>
              <nav className="flex space-x-8">
                <a 
                  href="/"
                  className="text-sm font-medium transition-colors text-gray-500 hover:text-blue-600"
                >
                  Home
                </a>
                <a 
                  href="/predict"
                  className="text-sm font-medium transition-colors text-gray-500 hover:text-blue-600"
                >
                  Predict
                </a>
              </nav>
            </div>
          </div>
        </header>

        <main>
          <Routes>
            <Route path="/" element={<HomePage onStartPredict={() => window.location.href = '/predict'} />} />
            <Route path="/predict" element={<PredictionPage />} />
            <Route path="/results" element={<ResultsPage />} />
          </Routes>
        </main>

        <footer className="bg-white/80 backdrop-blur-sm border-t border-blue-100">
          <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-blue-600 tracking-wider uppercase">About</h3>
                <p className="text-base text-gray-600 leading-relaxed">
                  Our AI-powered system analyzes patient data and medication information to predict potential adverse drug reactions with high accuracy.
                </p>
              </div>
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-blue-600 tracking-wider uppercase">Legal</h3>
                <ul className="space-y-3">
                  <li>
                    <a href="#" className="text-base text-gray-600 hover:text-blue-600 transition-colors">
                      Privacy Policy
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-base text-gray-600 hover:text-blue-600 transition-colors">
                      Terms of Service
                    </a>
                  </li>
                </ul>
              </div>
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-blue-600 tracking-wider uppercase">Contact</h3>
                <p className="text-base text-gray-600 leading-relaxed">
                  Have questions or feedback? Our support team is here to help you 24/7.
                </p>
              </div>
            </div>
            <div className="mt-12 border-t border-blue-100 pt-8">
              <p className="text-base text-gray-500 text-center">
                &copy; {new Date().getFullYear()} ADR Predict. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
};

export default App;