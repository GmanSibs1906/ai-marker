'use client';

import { useState } from 'react';
import { Prompt, UploadedFile, MarkingResult, Memo } from './lib/types';
import MemoUploader from './components/MemoUploader';
import FileUploader from './components/FileUploader';
import MarkingInterface from './components/MarkingInterface';
import PromptSelector from './components/PromptSelector';
import { generateMarkingPDF, downloadPDF, generateBatchPDFs } from './lib/pdf-generator';

export default function Home() {
  const [currentStep, setCurrentStep] = useState<'setup' | 'upload' | 'marking' | 'results'>('setup');
  const [assessmentType, setAssessmentType] = useState<'assessment' | 'project'>('assessment');
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [selectedMemo, setSelectedMemo] = useState<Memo | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [markingResults, setMarkingResults] = useState<MarkingResult[]>([]);
  const [viewingResult, setViewingResult] = useState<MarkingResult | null>(null);
  const [isMarkingInProgress, setIsMarkingInProgress] = useState(false);

  const steps = [
    { id: 'setup', name: 'Setup', description: 'Choose assessment type and prompt' },
    { id: 'upload', name: 'Upload', description: 'Upload student files' },
    { id: 'marking', name: 'Marking', description: 'AI marking in progress' },
    { id: 'results', name: 'Results', description: 'View and download results' },
  ];

  const getCurrentStepIndex = () => steps.findIndex(step => step.id === currentStep);
  const canProceed = () => {
    switch (currentStep) {
      case 'setup':
        return selectedPrompt !== null; // Note: memo is optional
      case 'upload':
        return uploadedFiles.length > 0 && uploadedFiles.every(f => f.status === 'completed');
      case 'marking':
        return markingResults.length > 0 && !isMarkingInProgress; // Can't proceed while marking
      default:
        return true;
    }
  };

  const goToNextStep = () => {
    const currentIndex = getCurrentStepIndex();
    if (currentIndex < steps.length - 1 && canProceed()) {
      setCurrentStep(steps[currentIndex + 1].id as 'setup' | 'upload' | 'marking' | 'results');
    }
  };

  const goToPreviousStep = () => {
    const currentIndex = getCurrentStepIndex();
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].id as 'setup' | 'upload' | 'marking' | 'results');
    }
  };

  const handleDownloadPDF = (result: MarkingResult) => {
    try {
      const doc = generateMarkingPDF(result, assessmentType);
      downloadPDF(doc, `${result.studentName}_${result.assignmentTitle}`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const handleDownloadAllPDFs = () => {
    try {
      generateBatchPDFs(markingResults, assessmentType);
    } catch (error) {
      console.error('Error generating batch PDFs:', error);
      alert('Failed to generate PDFs. Please try again.');
    }
  };

  const handleViewFull = (result: MarkingResult) => {
    setViewingResult(result);
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold text-white mb-4 text-shadow">
          Melsoft Academy AI Marker
        </h1>
        <p className="text-xl text-white/80 max-w-2xl mx-auto text-shadow">
          Professional automated marking system for assessments and projects. 
          Upload your files, select your marking criteria, and get detailed feedback instantly.
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex justify-center mb-12">
        <div className="glass-card rounded-full p-2">
          <div className="flex items-center space-x-2">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-all duration-300 ${
                    currentStep === step.id
                      ? 'step-active'
                      : steps.findIndex(s => s.id === currentStep) > index
                      ? 'step-completed'
                      : 'step-inactive'
                  }`}
                >
                  <span className="text-lg">
                    {step.id === 'setup' && '⚙️'}
                    {step.id === 'upload' && '📄'}
                    {step.id === 'marking' && '🤖'}
                    {step.id === 'results' && '📊'}
                  </span>
                  <span className="font-medium">{step.name}</span>
                  {isMarkingInProgress && currentStep === 'marking' && step.id === 'marking' && (
                    <div className="spinner w-4 h-4 ml-2"></div>
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div className="w-8 h-0.5 bg-white/20 mx-2"></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Warning Banner */}
      {isMarkingInProgress && (
        <div className="glass-card rounded-lg p-4 mb-8 border-l-4 border-yellow-400">
          <div className="flex items-center">
            <div className="spinner w-5 h-5 mr-3"></div>
            <div>
              <h3 className="text-white font-medium">Marking in Progress</h3>
              <p className="text-white/70 text-sm">
                Please wait while we process your files. This may take a few minutes.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="glass-card rounded-2xl p-8 card-hover fade-in">
        {currentStep === 'setup' && (
          <div className="space-y-8">
            {/* Assessment Type Selection */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-4 text-shadow">
                Choose Assessment Type
              </h2>
              <p className="text-white/70 mb-6">
                Select the type of content you want to mark
              </p>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => {
                    setAssessmentType('assessment');
                    setSelectedMemo(null);
                  }}
                  className={`px-8 py-4 rounded-xl font-medium transition-all duration-300 ${
                    assessmentType === 'assessment'
                      ? 'bg-white text-gray-900 shadow-lg'
                      : 'bg-white/10 text-white border border-white/30 hover:bg-white/20'
                  }`}
                >
                  <div className="text-2xl mb-2">📝</div>
                  <div className="font-semibold">Assessment</div>
                  <div className="text-sm opacity-70">Exams, quizzes, tests</div>
                </button>
                <button
                  onClick={() => {
                    setAssessmentType('project');
                    setSelectedMemo(null);
                  }}
                  className={`px-8 py-4 rounded-xl font-medium transition-all duration-300 ${
                    assessmentType === 'project'
                      ? 'bg-white text-gray-900 shadow-lg'
                      : 'bg-white/10 text-white border border-white/30 hover:bg-white/20'
                  }`}
                >
                  <div className="text-2xl mb-2">🚀</div>
                  <div className="font-semibold">Project</div>
                  <div className="text-sm opacity-70">Assignments, portfolios</div>
                </button>
              </div>
            </div>

            {/* Memo upload section */}
            <div className="glass rounded-xl p-6">
              <MemoUploader
                assessmentType={assessmentType}
                selectedMemo={selectedMemo}
                onMemoSelect={setSelectedMemo}
              />
            </div>

            {/* Prompt selection */}
            <div className="glass rounded-xl p-6">
              <PromptSelector
                assessmentType={assessmentType}
                selectedPrompt={selectedPrompt}
                onPromptSelect={setSelectedPrompt}
              />
            </div>

            {/* Summary section */}
            {(selectedPrompt || selectedMemo) && (
              <div className="glass rounded-xl p-6 border border-white/30">
                <h4 className="font-medium text-white mb-4 text-shadow">📋 Setup Summary</h4>
                <div className="text-sm text-white/80 space-y-2">
                  <p>• Assessment Type: <strong className="text-white">{assessmentType}</strong></p>
                  <p>• Marking Memo: {selectedMemo ? `✓ ${selectedMemo.fileName}` : '❌ None selected (optional)'}</p>
                  <p>• Marking Prompt: {selectedPrompt ? `✓ ${selectedPrompt.name}` : '❌ None selected'}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {currentStep === 'upload' && (
          <div>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-4 text-shadow">
                Upload Files
              </h2>
              <p className="text-white/70">
                Upload your {assessmentType} files for marking
              </p>
            </div>
            <FileUploader
              assessmentType={assessmentType}
              onFilesUploaded={setUploadedFiles}
              uploadedFiles={uploadedFiles}
            />
          </div>
        )}

        {currentStep === 'marking' && (
          <div>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-4 text-shadow">
                AI Marking
              </h2>
              <p className="text-white/70">
                Processing your files with AI-powered marking
              </p>
            </div>
            <MarkingInterface
              prompt={selectedPrompt}
              memo={selectedMemo}
              files={uploadedFiles}
              assessmentType={assessmentType}
              onMarkingComplete={(results) => {
                setMarkingResults(results);
                setIsMarkingInProgress(false);
                // Only advance to results when marking is actually complete
                setTimeout(() => {
                  setCurrentStep('results');
                }, 2000); // Give user time to see completion message
              }}
              onMarkingStart={() => {
                setIsMarkingInProgress(true);
                console.log('Marking process started');
              }}
            />
          </div>
        )}

        {currentStep === 'results' && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-4 text-shadow">
                Marking Results
              </h2>
              <p className="text-white/70">
                Review and download your marked assessments
              </p>
            </div>

            {markingResults.length > 0 ? (
              <div className="space-y-4">
                {markingResults.map((result, index) => (
                  <div key={index} className="glass rounded-xl p-6 card-hover">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold text-white text-shadow">{result.studentName}</h3>
                        <p className="text-sm text-white/70">{result.assignmentTitle}</p>
                        {(result.memoUsed || result.promptUsed) && (
                          <div className="text-xs text-white/60 mt-2">
                            {result.memoUsed && <span>Memo: {result.memoUsed} • </span>}
                            {result.promptUsed && <span>Prompt: {result.promptUsed}</span>}
                          </div>
                        )}
                      </div>
                      {result.percentage && (
                        <div className="text-right">
                          <span className="text-lg font-bold text-white bg-white/20 px-3 py-1 rounded-full">
                            {result.percentage}%
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="text-sm text-white/80 bg-white/10 p-4 rounded-lg max-h-32 overflow-y-auto mb-4">
                      {result.markingContent}
                    </div>
                    <div className="flex space-x-3">
                      <button 
                        onClick={() => handleDownloadPDF(result)}
                        className="btn-primary text-sm"
                      >
                        📄 Download PDF
                      </button>
                      <button 
                        onClick={() => handleViewFull(result)}
                        className="btn-secondary text-sm"
                      >
                        👁️ View Full
                      </button>
                    </div>
                  </div>
                ))}
                
                <div className="pt-6">
                  <button 
                    onClick={handleDownloadAllPDFs}
                    className="w-full py-4 px-6 bg-white text-gray-900 rounded-xl hover:bg-gray-100 transition-colors font-medium text-lg shadow-lg"
                  >
                    📄 Download All PDFs ({markingResults.length} files)
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-white/60">No results available yet.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center mt-8">
        <button
          onClick={goToPreviousStep}
          disabled={getCurrentStepIndex() === 0 || isMarkingInProgress}
          className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
            getCurrentStepIndex() === 0 || isMarkingInProgress
              ? 'bg-white/10 text-white/40 cursor-not-allowed'
              : 'btn-secondary hover:bg-white/20'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>Previous</span>
          {isMarkingInProgress && getCurrentStepIndex() !== 0 && (
            <div className="spinner w-4 h-4 ml-2"></div>
          )}
        </button>

        <div className="flex items-center space-x-2 text-white/60 text-sm">
          <span>Step {getCurrentStepIndex() + 1} of {steps.length}</span>
        </div>

        <button
          onClick={goToNextStep}
          disabled={!canProceed() || getCurrentStepIndex() === steps.length - 1 || isMarkingInProgress}
          className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
            !canProceed() || getCurrentStepIndex() === steps.length - 1 || isMarkingInProgress
              ? 'bg-white/10 text-white/40 cursor-not-allowed'
              : 'btn-primary hover:bg-gray-100'
          }`}
        >
          <span>
            {getCurrentStepIndex() === steps.length - 1 ? 'Complete' : 'Next'}
          </span>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          {isMarkingInProgress && (
            <div className="spinner w-4 h-4 ml-2"></div>
          )}
        </button>
      </div>

      {/* Feature Highlights */}
      <div className="grid md:grid-cols-3 gap-6 mt-16">
        <div className="glass-card rounded-xl p-6 text-center card-hover">
          <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="text-white font-semibold mb-2">Lightning Fast</h3>
          <p className="text-white/70 text-sm">
            Mark multiple assessments in seconds with AI-powered automation
          </p>
        </div>

        <div className="glass-card rounded-xl p-6 text-center card-hover">
          <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-white font-semibold mb-2">Accurate Marking</h3>
          <p className="text-white/70 text-sm">
            Consistent and fair marking based on your custom criteria
          </p>
        </div>

        <div className="glass-card rounded-xl p-6 text-center card-hover">
          <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-white font-semibold mb-2">Export Results</h3>
          <p className="text-white/70 text-sm">
            Download professional PDF reports with detailed feedback
          </p>
        </div>
      </div>

      {/* Full View Modal */}
      {viewingResult && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-white/20">
              <div>
                <h3 className="text-lg font-semibold text-white text-shadow">{viewingResult.studentName}</h3>
                <p className="text-sm text-white/70">{viewingResult.assignmentTitle}</p>
              </div>
              <div className="flex items-center space-x-2">
                {viewingResult.percentage && (
                  <span className="px-3 py-1 bg-white/20 text-white rounded-full text-sm font-medium">
                    {viewingResult.percentage}%
                  </span>
                )}
                <button
                  onClick={() => setViewingResult(null)}
                  className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition-all duration-300"
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="mb-4 text-xs text-white/60 bg-white/10 p-3 rounded-lg">
                <strong>Marking Details:</strong> 
                {viewingResult.memoUsed && ` Memo: ${viewingResult.memoUsed} •`}
                {viewingResult.promptUsed && ` Prompt: ${viewingResult.promptUsed} •`}
                {` Date: ${viewingResult.createdAt.toLocaleDateString()}`}
              </div>
              
              <div className="prose max-w-none">
                <pre className="whitespace-pre-wrap text-sm text-white/90 font-sans leading-relaxed">
                  {viewingResult.markingContent}
                </pre>
              </div>
            </div>
            
            <div className="flex justify-between items-center p-6 border-t border-white/20">
              <div className="text-sm text-white/60">
                Generated on {viewingResult.createdAt.toLocaleDateString()} at {viewingResult.createdAt.toLocaleTimeString()}
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => handleDownloadPDF(viewingResult)}
                  className="btn-primary"
                >
                  📄 Download PDF
                </button>
                <button
                  onClick={() => setViewingResult(null)}
                  className="btn-secondary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
