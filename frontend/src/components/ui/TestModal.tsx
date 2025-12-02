// frontend/src/components/ui/TestModal.tsx
import React, { useState, useEffect } from 'react';
import apiService, { Document, DocumentTest, TestAttempt } from '../../services/api';
import { X, Clock, CheckCircle, XCircle, Award, ChevronLeft, ChevronRight, Loader } from 'lucide-react';

interface TestModalProps {
  document: Document;
  onClose: () => void;
  darkMode?: boolean;
}

type TestScreen = 'start' | 'test' | 'results';

const TestModal: React.FC<TestModalProps> = ({ document, onClose, darkMode = false }) => {
  // Screen state
  const [currentScreen, setCurrentScreen] = useState<TestScreen>('start');
  
  // Test data
  const [test, setTest] = useState<DocumentTest | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  
  // Test taking state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [questionId: string]: string }>({});
  const [startTime, setStartTime] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Results state
  const [testAttempt, setTestAttempt] = useState<TestAttempt | null>(null);

  // Timer state
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Timer effect
  useEffect(() => {
    if (currentScreen === 'test' && startTime) {
      const interval = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [currentScreen, startTime]);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Generate test
  const handleGenerateTest = async () => {
    setIsGenerating(true);
    setGenerateError(null);

    try {
      console.log('📝 Generating test for document:', document.id);
      const generatedTest = await apiService.generateTest(document.id);
      console.log('✅ Test generated:', generatedTest);
      
      setTest(generatedTest);
      setCurrentScreen('test');
      setStartTime(Date.now());
      setAnswers({});
      setCurrentQuestionIndex(0);
    } catch (error: any) {
      console.error('❌ Failed to generate test:', error);
      setGenerateError(
        error.response?.data?.error || 
        error.response?.data?.message || 
        'Failed to generate test. Please try again.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle answer selection
  const handleAnswerSelect = (questionId: number, answer: 'A' | 'B' | 'C') => {
    setAnswers(prev => ({
      ...prev,
      [questionId.toString()]: answer
    }));
  };

  // Navigation
  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleNextQuestion = () => {
    if (test && currentQuestionIndex < test.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  // Submit test
  const handleSubmitTest = async () => {
    if (!test) return;

    const unansweredCount = test.questions.filter(
      q => !answers[q.id.toString()]
    ).length;

    if (unansweredCount > 0) {
      const confirm = window.confirm(
        `You have ${unansweredCount} unanswered question(s). Submit anyway?`
      );
      if (!confirm) return;
    }

    const confirmSubmit = window.confirm(
      'Are you sure you want to submit your test? You cannot change your answers after submission.'
    );
    if (!confirmSubmit) return;

    setIsSubmitting(true);

    try {
      const timeTaken = startTime ? Math.floor((Date.now() - startTime) / 1000) : undefined;
      
      console.log('📤 Submitting test:', {
        testId: test.id,
        answers,
        timeTaken
      });

      const result = await apiService.submitTest(test.id, answers, timeTaken);
      console.log('✅ Test submitted, results:', result);
      
      setTestAttempt(result);
      setCurrentScreen('results');
    } catch (error: any) {
      console.error('❌ Failed to submit test:', error);
      alert('Failed to submit test. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get grade color
  const getGradeColor = (grade: string): string => {
    switch (grade) {
      case 'A': return 'text-green-600';
      case 'B': return 'text-blue-600';
      case 'C': return 'text-yellow-600';
      case 'D': return 'text-orange-600';
      case 'F': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getGradeBgColor = (grade: string): string => {
    if (darkMode) {
      switch (grade) {
        case 'A': return 'bg-green-900/50 border-green-700';
        case 'B': return 'bg-blue-900/50 border-blue-700';
        case 'C': return 'bg-yellow-900/50 border-yellow-700';
        case 'D': return 'bg-orange-900/50 border-orange-700';
        case 'F': return 'bg-red-900/50 border-red-700';
        default: return 'bg-gray-800 border-gray-700';
      }
    }
    switch (grade) {
      case 'A': return 'bg-green-50 border-green-300';
      case 'B': return 'bg-blue-50 border-blue-300';
      case 'C': return 'bg-yellow-50 border-yellow-300';
      case 'D': return 'bg-orange-50 border-orange-300';
      case 'F': return 'bg-red-50 border-red-300';
      default: return 'bg-gray-50 border-gray-300';
    }
  };

  // Get current question
  const currentQuestion = test?.questions[currentQuestionIndex];
  const currentAnswer = currentQuestion ? answers[currentQuestion.id.toString()] : undefined;

  // Calculate progress
  const answeredCount = test ? Object.keys(answers).length : 0;
  const totalQuestions = test?.questions.length || 20;
  const progress = (answeredCount / totalQuestions) * 100;

  // ============================================================================
  // SCREEN 1: START SCREEN
  // ============================================================================
  
  const renderStartScreen = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className={`rounded-2xl shadow-2xl p-8 w-full max-w-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Create Practice Test
          </h2>
          <button
            onClick={onClose}
            className={`transition-colors p-2 rounded-full ${
              darkMode 
                ? 'text-gray-400 hover:text-white hover:bg-gray-700' 
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
            }`}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Document Info */}
        <div className={`rounded-xl p-4 mb-6 ${darkMode ? 'bg-gray-700 border border-gray-600' : 'bg-gray-50 border border-gray-200'}`}>
          <p className={`text-sm mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Document:</p>
          <p className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{document.title}</p>
          {document.page_count && (
            <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {document.page_count} pages • {document.file_type.toUpperCase()}
            </p>
          )}
        </div>

        {/* Test Info */}
        <div className={`rounded-xl p-5 mb-6 ${darkMode ? 'bg-blue-900/30 border border-blue-800' : 'bg-blue-50 border border-blue-200'}`}>
          <h3 className={`text-lg font-semibold mb-3 ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>Test Details:</h3>
          <ul className={`space-y-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2 font-bold">•</span>
              <span><strong>20 questions</strong> generated from your document</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2 font-bold">•</span>
              <span>Each question has <strong>3 options</strong> (A, B, C)</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2 font-bold">•</span>
              <span><strong>60% or higher</strong> required to pass</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2 font-bold">•</span>
              <span>Review answers with <strong>detailed explanations</strong></span>
            </li>
          </ul>
        </div>

        {/* Error Display */}
        {generateError && (
          <div className={`rounded-xl p-4 mb-6 ${darkMode ? 'bg-red-900/50 border border-red-700' : 'bg-red-50 border border-red-200'}`}>
            <p className={darkMode ? 'text-red-200' : 'text-red-700'}>{generateError}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={onClose}
            className={`flex-1 font-semibold py-4 px-6 rounded-xl transition-all text-lg ${
              darkMode 
                ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={handleGenerateTest}
            disabled={isGenerating}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg text-lg flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <span>Start Test</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  // ============================================================================
  // SCREEN 2: TEST SCREEN
  // ============================================================================
  
  const renderTestScreen = () => {
    if (!test || !currentQuestion) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className={`rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          {/* Header - Fixed */}
          <div className={`p-6 border-b ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Question {currentQuestionIndex + 1} of {totalQuestions}
                </h2>
                <p className={`text-sm mt-1 truncate max-w-md ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{document.title}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
                  darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                }`}>
                  <Clock className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                  <span className={`font-mono text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{formatTime(elapsedSeconds)}</span>
                </div>
                <button
                  onClick={onClose}
                  className={`transition-colors p-2 rounded-full ${
                    darkMode 
                      ? 'text-gray-400 hover:text-white hover:bg-gray-700' 
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4">
              <div className={`flex justify-between text-sm mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                <span>Progress</span>
                <span className="font-medium">{answeredCount} / {totalQuestions} answered</span>
              </div>
              <div className={`w-full rounded-full h-3 overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Question Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Question */}
            <div className={`rounded-xl p-6 mb-6 border ${
              darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
            }`}>
              <p className={`text-xl leading-relaxed font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {currentQuestion.question}
              </p>
            </div>

            {/* Options */}
            <div className="space-y-4">
              {(['A', 'B', 'C'] as const).map((option) => {
                const isSelected = currentAnswer === option;
                return (
                  <button
                    key={option}
                    onClick={() => handleAnswerSelect(currentQuestion.id, option)}
                    className={`w-full text-left p-5 rounded-xl border-2 transition-all ${
                      isSelected
                        ? 'bg-blue-600/20 border-blue-500 shadow-md'
                        : darkMode
                          ? 'bg-gray-700 border-gray-600 hover:bg-gray-600 hover:border-gray-500'
                          : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : darkMode
                            ? 'bg-gray-600 text-gray-200'
                            : 'bg-gray-200 text-gray-700'
                      }`}>
                        {option}
                      </div>
                      <p className={`text-lg pt-1.5 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {currentQuestion.options[option]}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Navigation - Fixed */}
          <div className={`p-6 border-t ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <button
                onClick={handlePreviousQuestion}
                disabled={currentQuestionIndex === 0}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed text-lg ${
                  darkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                }`}
              >
                <ChevronLeft className="w-5 h-5" />
                <span>Previous</span>
              </button>

              <div className={`font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {answeredCount === totalQuestions ? (
                  <span className="text-green-500 font-semibold">All questions answered!</span>
                ) : (
                  <span>{totalQuestions - answeredCount} remaining</span>
                )}
              </div>

              {currentQuestionIndex === totalQuestions - 1 ? (
                <button
                  onClick={handleSubmitTest}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-8 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg text-lg"
                >
                  {isSubmitting ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <span>Submit Test</span>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleNextQuestion}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all text-lg"
                >
                  <span>Next</span>
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // SCREEN 3: RESULTS SCREEN
  // ============================================================================
  
  const renderResultsScreen = () => {
    if (!testAttempt) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
        <div className={`rounded-2xl shadow-2xl w-full max-w-4xl my-8 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          {/* Header */}
          <div className={`p-6 border-b rounded-t-2xl ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Test Results</h2>
              <button
                onClick={onClose}
                className={`transition-colors p-2 rounded-full ${
                  darkMode 
                    ? 'text-gray-400 hover:text-white hover:bg-gray-700' 
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200'
                }`}
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="p-6">
            {/* Results Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {/* Score Card */}
              <div className={`rounded-xl border-2 p-6 ${getGradeBgColor(testAttempt.grade)}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Score</span>
                  <Award className={`w-6 h-6 ${getGradeColor(testAttempt.grade)}`} />
                </div>
                <p className={`text-5xl font-bold ${getGradeColor(testAttempt.grade)}`}>
                  {testAttempt.score.toFixed(0)}%
                </p>
                <p className={`mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {testAttempt.correct_count} / {totalQuestions} correct
                </p>
              </div>

              {/* Grade Card */}
              <div className={`rounded-xl border-2 p-6 ${getGradeBgColor(testAttempt.grade)}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Grade</span>
                </div>
                <p className={`text-5xl font-bold ${getGradeColor(testAttempt.grade)}`}>
                  {testAttempt.grade}
                </p>
                <p className={`mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {testAttempt.grade === 'A' && 'Excellent'}
                  {testAttempt.grade === 'B' && 'Good'}
                  {testAttempt.grade === 'C' && 'Average'}
                  {testAttempt.grade === 'D' && 'Passing'}
                  {testAttempt.grade === 'F' && 'Failed'}
                </p>
              </div>

              {/* Pass/Fail Card */}
              <div className={`rounded-xl border-2 p-6 ${
                testAttempt.passed 
                  ? darkMode ? 'bg-green-900/50 border-green-700' : 'bg-green-50 border-green-300'
                  : darkMode ? 'bg-red-900/50 border-red-700' : 'bg-red-50 border-red-300'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Status</span>
                  {testAttempt.passed ? (
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-500" />
                  )}
                </div>
                <p className={`text-3xl font-bold ${
                  testAttempt.passed ? 'text-green-500' : 'text-red-500'
                }`}>
                  {testAttempt.passed ? 'PASSED' : 'FAILED'}
                </p>
                <p className={`mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {testAttempt.time_taken_seconds 
                    ? `Time: ${formatTime(testAttempt.time_taken_seconds)}`
                    : 'No time recorded'
                  }
                </p>
              </div>
            </div>

            {/* Review Section */}
            <div className="mb-6">
              <h3 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Answer Review</h3>
              <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {testAttempt.results_detail.map((result, index) => (
                  <div
                    key={result.question_id}
                    className={`rounded-xl border-2 p-5 ${
                      result.is_correct
                        ? darkMode ? 'bg-green-900/30 border-green-800' : 'bg-green-50 border-green-200'
                        : darkMode ? 'bg-red-900/30 border-red-800' : 'bg-red-50 border-red-200'
                    }`}
                  >
                    {/* Question Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                          result.is_correct
                            ? 'bg-green-600 text-white'
                            : 'bg-red-600 text-white'
                        }`}>
                          {index + 1}
                        </div>
                        <p className={`font-medium flex-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {result.question}
                        </p>
                      </div>
                      {result.is_correct ? (
                        <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 ml-2" />
                      ) : (
                        <XCircle className="w-6 h-6 text-red-500 flex-shrink-0 ml-2" />
                      )}
                    </div>

                    {/* User's Answer */}
                    <div className="ml-11 space-y-2 mb-3">
                      <p className={`font-medium ${
                        result.is_correct ? 'text-green-600' : 'text-red-600'
                      }`}>
                        Your answer: {result.user_answer || 'No answer'} 
                        {result.user_answer && ` - ${result.options[result.user_answer as 'A' | 'B' | 'C']}`}
                      </p>
                      {!result.is_correct && (
                        <p className="text-green-600 font-medium">
                          Correct answer: {result.correct_answer} 
                          {` - ${result.options[result.correct_answer as 'A' | 'B' | 'C']}`}
                        </p>
                      )}
                    </div>

                    {/* Explanation */}
                    {result.explanation && (
                      <div className={`ml-11 rounded-lg p-4 border ${
                        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                      }`}>
                        <p className={`text-sm mb-1 font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Explanation:</p>
                        <p className={darkMode ? 'text-gray-300' : 'text-gray-700'}>{result.explanation}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className={`flex flex-col sm:flex-row gap-4 pt-6 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <button
                onClick={onClose}
                className={`flex-1 font-semibold py-4 px-6 rounded-xl transition-all text-lg ${
                  darkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                }`}
              >
                Close
              </button>
              <button
                onClick={() => {
                  setCurrentScreen('start');
                  setTest(null);
                  setTestAttempt(null);
                  setAnswers({});
                  setCurrentQuestionIndex(0);
                  setStartTime(null);
                  setElapsedSeconds(0);
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-xl transition-all shadow-lg text-lg"
              >
                Take Another Test
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  
  return (
    <>
      {currentScreen === 'start' && renderStartScreen()}
      {currentScreen === 'test' && renderTestScreen()}
      {currentScreen === 'results' && renderResultsScreen()}
    </>
  );
};

export default TestModal;