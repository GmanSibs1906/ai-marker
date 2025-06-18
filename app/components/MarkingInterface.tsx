'use client';

import { useState, useEffect } from 'react';
import { Prompt, UploadedFile, MarkingResult, Memo } from '../lib/types';

interface MarkingInterfaceProps {
  prompt: Prompt | null;
  memo: Memo | null;
  files: UploadedFile[];
  assessmentType: 'assessment' | 'project';
  onMarkingComplete: (results: MarkingResult[]) => void;
  onMarkingStart: () => void;
}

interface MarkingProgress {
  currentFile: number;
  totalFiles: number;
  currentStudent: string;
  status: 'idle' | 'processing' | 'completed' | 'error';
  logs: string[];
  error?: string;
}

export default function MarkingInterface({
  prompt,
  memo,
  files,
  assessmentType,
  onMarkingComplete,
  onMarkingStart
}: MarkingInterfaceProps) {
  const [progress, setProgress] = useState<MarkingProgress>({
    currentFile: 0,
    totalFiles: files.length,
    currentStudent: '',
    status: 'idle',
    logs: []
  });
  const [results, setResults] = useState<MarkingResult[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    setProgress(prev => ({
      ...prev,
      logs: [...prev.logs, logMessage]
    }));
  };

  const startMarking = async () => {
    if (!prompt) {
      addLog('ERROR: No prompt selected');
      return;
    }

    addLog('🚀 Starting real AI marking process...');
    addLog(`📝 Configuration: ${assessmentType} marking`);
    addLog(`🎯 Prompt: ${prompt.name}`);
    addLog(`📋 Memo: ${memo ? memo.fileName : 'None (using prompt only)'}`);
    addLog(`📄 Files to process: ${files.length}`);

    setProgress(prev => ({ ...prev, status: 'processing' }));
    onMarkingStart();

    const markingResults: MarkingResult[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      setProgress(prev => ({
        ...prev,
        currentFile: i + 1,
        currentStudent: file.studentName
      }));

      addLog(`📝 Processing file ${i + 1}/${files.length}: ${file.studentName} - ${file.assignmentTitle}`);

      try {
        // Prepare the marking request
        const requestData = {
          prompt: prompt.content,
          documentContent: file.extractedText,
          assessmentType,
          memo: memo?.content || undefined,
          studentName: file.studentName,
          assignmentTitle: file.assignmentTitle
        };

        addLog(`🤖 Sending request to OpenAI API for ${file.studentName}...`);
        addLog(`📊 Document length: ${file.extractedText.length} characters`);
        
        const response = await fetch('/api/openai', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const data = await response.json();
        addLog(`✅ Received response from OpenAI for ${file.studentName}`);
        addLog(`📝 Response length: ${data.markingResult.length} characters`);

        // Extract marks and percentage from the response if possible
        const markingContent = data.markingResult;
        let totalMarks: number | undefined;
        let percentage: number | undefined;

        // Try to extract percentage from the response
        const percentageMatch = markingContent.match(/(\d+)%/);
        if (percentageMatch) {
          percentage = parseInt(percentageMatch[1]);
          addLog(`📊 Extracted percentage: ${percentage}%`);
        }

        // Try to extract total marks
        const marksMatch = markingContent.match(/(\d+)\/(\d+)/);
        if (marksMatch) {
          totalMarks = parseInt(marksMatch[1]);
          addLog(`📊 Extracted marks: ${totalMarks}/${marksMatch[2]}`);
        }

        const result: MarkingResult = {
          studentName: file.studentName,
          assignmentTitle: file.assignmentTitle,
          markingContent,
          totalMarks,
          percentage,
          memoUsed: memo?.fileName || 'None',
          promptUsed: prompt.name,
          createdAt: new Date(),
        };

        markingResults.push(result);
        addLog(`✅ Completed marking for ${file.studentName} ${percentage ? `(${percentage}%)` : '(Score processed)'}`);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        addLog(`❌ Error marking ${file.studentName}: ${errorMessage}`);
        
        // Add error result
        const errorResult: MarkingResult = {
          studentName: file.studentName,
          assignmentTitle: file.assignmentTitle,
          markingContent: `❌ Error occurred during marking: ${errorMessage}\n\nPlease check your OpenAI API key and try again.`,
          memoUsed: memo?.fileName || 'None',
          promptUsed: prompt.name,
          createdAt: new Date(),
        };
        
        markingResults.push(errorResult);
      }

      // Small delay between requests to avoid rate limiting
      if (i < files.length - 1) {
        addLog('⏳ Waiting 1 second before next request (rate limiting)...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    addLog(`🎉 Marking completed! Successfully processed ${markingResults.length} files`);
    setProgress(prev => ({ ...prev, status: 'completed' }));
    setResults(markingResults);
    onMarkingComplete(markingResults);
  };

  useEffect(() => {
    // Auto-start marking when component mounts
    if (files.length > 0 && prompt) {
      setTimeout(() => {
        startMarking();
      }, 500); // Small delay to show the interface first
    }
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">🤖 AI Marking in Progress</h2>
        <p className="text-gray-600">Processing {files.length} student file(s) with OpenAI GPT-4...</p>
      </div>

      {/* Progress indicator */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <span className="text-sm text-gray-500">
            {progress.currentFile}/{progress.totalFiles} files
          </span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
          <div 
            className="bg-primary-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(progress.currentFile / progress.totalFiles) * 100}%` }}
          ></div>
        </div>
        
        {progress.status === 'processing' && progress.currentStudent && (
          <div className="flex items-center text-sm text-gray-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600 mr-2"></div>
            Currently marking: <strong className="ml-1">{progress.currentStudent}</strong>
          </div>
        )}
        
        {progress.status === 'completed' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center text-sm text-green-600 mb-2">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <strong>🎉 Marking completed successfully!</strong>
            </div>
            <div className="text-sm text-green-700">
              <p>✅ Processed {progress.totalFiles} file(s)</p>
              <p>📄 Results are ready for download</p>
              <p>⏳ Redirecting to results page in a moment...</p>
            </div>
          </div>
        )}
        
        {progress.status === 'error' && (
          <div className="flex items-center text-sm text-red-600">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Error occurred during marking
          </div>
        )}
      </div>

      {/* Configuration summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">📋 Marking Configuration</h4>
        <div className="text-sm text-blue-800 space-y-1">
          <p>• Assessment Type: <strong>{assessmentType}</strong></p>
          <p>• Prompt: <strong>{prompt?.name || 'None selected'}</strong></p>
          <p>• Memo: <strong>{memo?.fileName || 'None (using prompt only)'}</strong></p>
          <p>• Files to mark: <strong>{files.length}</strong></p>
          <p>• OpenAI Model: <strong>GPT-4</strong></p>
        </div>
      </div>

      {/* Live logs */}
      <div className="bg-gray-900 text-green-400 rounded-lg p-4 max-h-64 overflow-y-auto">
        <h4 className="font-medium text-green-300 mb-2 flex items-center">
          <span className="mr-2">🔍</span>
          Live Marking Logs
        </h4>
        <div className="text-sm font-mono space-y-1">
          {progress.logs.length === 0 ? (
            <p className="text-gray-500">Initializing marking process...</p>
          ) : (
            progress.logs.map((log, index) => (
              <div key={index} className={`${
                log.includes('ERROR') || log.includes('❌') ? 'text-red-400' :
                log.includes('✅') || log.includes('🎉') ? 'text-green-400' :
                log.includes('🤖') || log.includes('📝') ? 'text-blue-400' :
                log.includes('⏳') ? 'text-yellow-400' :
                'text-gray-300'
              }`}>
                {log}
              </div>
            ))
          )}
        </div>
        {progress.logs.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-700">
            <div className="text-xs text-gray-500">
              Scroll up to see earlier logs • Auto-refreshing
            </div>
          </div>
        )}
      </div>

      {/* Manual start button (in case auto-start fails) */}
      {progress.status === 'idle' && (
        <div className="text-center">
          <button
            onClick={startMarking}
            disabled={!prompt}
            className="w-full py-3 px-4 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-lg"
          >
            🚀 Start Real AI Marking with OpenAI
          </button>
          {!prompt && (
            <p className="text-red-600 text-sm mt-2">Please select a prompt to start marking</p>
          )}
        </div>
      )}
    </div>
  );
} 