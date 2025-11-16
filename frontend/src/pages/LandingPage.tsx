import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { BookOpen, MessageSquare, Brain, Upload, Zap, Shield } from 'lucide-react';

const LandingPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const features = [
    {
      icon: <Upload className="w-8 h-8 text-red-500" />,
      title: "Upload Documents",
      description: "Support for PDFs, Word docs, and PowerPoint presentations"
    },
    {
      icon: <Brain className="w-8 h-8 text-red-500" />,
      title: "AI-Powered Analysis",
      description: "Advanced AI extracts key concepts and generates summaries"
    },
    {
      icon: <MessageSquare className="w-8 h-8 text-red-500" />,
      title: "Interactive Chat",
      description: "Ask questions and get instant answers about your materials"
    },
    {
      icon: <BookOpen className="w-8 h-8 text-red-500" />,
      title: "Study Materials",
      description: "Generate flashcards, quizzes, and study guides automatically"
    },
    {
      icon: <Zap className="w-8 h-8 text-red-500" />,
      title: "Fast Processing",
      description: "Get results in seconds with our optimized AI pipeline"
    },
    {
      icon: <Shield className="w-8 h-8 text-red-500" />,
      title: "Secure & Private",
      description: "Your documents are encrypted and stored securely"
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <BookOpen className="w-8 h-8 text-red-500 mr-3" />
              <span className="text-2xl font-bold text-black">Learnify AI</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/login"
                className="text-gray-700 hover:text-black px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-black mb-6">
            Learn Smarter with
            <span className="text-red-500 block">AI-Powered Study</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Transform your documents into interactive learning experiences. Upload your study materials 
            and chat with AI to understand concepts faster and retain information better.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="bg-red-500 hover:bg-red-600 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors inline-flex items-center justify-center"
            >
              Start Learning Free
            </Link>
            <Link
              to="/login"
              className="border border-gray-300 hover:border-gray-400 text-gray-700 px-8 py-4 rounded-lg text-lg font-semibold transition-colors inline-flex items-center justify-center"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-black mb-4">
              Powerful Features for Better Learning
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Everything you need to transform static documents into dynamic learning experiences
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <div className="mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-black mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-black mb-4">
              How It Works
            </h2>
            <p className="text-lg text-gray-600">
              Get started in just three simple steps
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-semibold text-black mb-2">1. Upload</h3>
              <p className="text-gray-600">
                Upload your PDFs, Word documents, or PowerPoint presentations
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Brain className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-semibold text-black mb-2">2. Process</h3>
              <p className="text-gray-600">
                Our AI analyzes your content and extracts key information
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-semibold text-black mb-2">3. Learn</h3>
              <p className="text-gray-600">
                Chat with AI about your materials and generate study aids
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-black py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Transform Your Learning?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Join thousands of students who are already learning smarter with Learnify AI
          </p>
          <Link
            to="/register"
            className="bg-red-500 hover:bg-red-600 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors inline-flex items-center"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-red-500 mr-2" />
            <span className="text-lg font-semibold text-black">Learnify AI</span>
          </div>
          <p className="text-center text-gray-600 mt-4">
            © 2025 Learnify AI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;