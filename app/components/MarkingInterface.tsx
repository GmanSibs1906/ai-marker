'use client';

import { useState, useEffect, useCallback } from 'react';
import { Prompt, UploadedFile, MarkingResult, Memo } from '../lib/types';
import { getProcessingTimeEstimate, getDocumentSizeCategory } from '../lib/document-utils';
import { getBatchRecommendation } from '../lib/batch-utils';

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
  const [markingMode, setMarkingMode] = useState<'local' | 'ai'>('local');
  // Remove unused results state

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    setProgress(prev => ({
      ...prev,
      logs: [...prev.logs, logMessage]
    }));
  }, []);

  const startMarking = useCallback(async () => {
    if (!prompt) {
      addLog('ERROR: No prompt selected');
      return;
    }

    if (markingMode === 'local') {
      addLog('🚀 Starting LOCAL marking process (Zero AI tokens used)...');
    } else {
      addLog('🚀 Starting AI marking process...');
    }
    addLog(`📝 Configuration: ${assessmentType} marking`);
    addLog(`🎯 Prompt: ${prompt.name}`);
    addLog(`📋 Memo: ${memo ? memo.fileName : 'None (using prompt only)'}`);
    addLog(`📄 Files to process: ${files.length}`);

    setProgress(prev => ({ ...prev, status: 'processing' }));
    onMarkingStart();

    const markingResults: MarkingResult[] = [];

    // Process files with better resource management
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      setProgress(prev => ({
        ...prev,
        currentFile: i + 1,
        currentStudent: file.studentName
      }));

      addLog(`📝 Processing file ${i + 1}/${files.length}: ${file.studentName} - ${file.assignmentTitle}`);

      // Add AbortController for request timeout and cleanup
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        addLog(`⏰ Request timeout for ${file.studentName} - will retry`);
      }, 120000); // 2 minute timeout

      try {
        if (markingMode === 'local') {
          // Use local marking (zero tokens)
          addLog(`🏠 Processing locally for ${file.studentName} (No AI tokens used)...`);
          addLog(`📊 Document length: ${file.extractedText.length} characters`);
          
          const response = await fetch('/api/local-mark', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              documentContent: file.extractedText,
              studentName: file.studentName,
              assignmentTitle: file.assignmentTitle,
              memo: memo?.content || undefined
            })
          });
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
            throw new Error(errorData.error || `HTTP ${response.status}`);
          }
          
          const data = await response.json();
          addLog(`✅ Local marking completed for ${file.studentName}`);
          addLog(`💰 AI Tokens saved: ~${data.tokensSaved} tokens`);
          
          const result: MarkingResult = {
            studentName: file.studentName,
            assignmentTitle: file.assignmentTitle,
            markingContent: data.markingResult,
            totalMarks: data.totalMarks,
            percentage: data.percentage,
            memoUsed: memo?.fileName || 'None',
            promptUsed: `${prompt.name} (Local Analysis)`,
            createdAt: new Date(),
            originalFileName: file.originalFileName,
            markedFileName: `LOCAL_MARKED_${file.studentName}_${file.assignmentTitle}.pdf`,
          };

          markingResults.push(result);
          addLog(`✅ Completed local marking for ${file.studentName} (${data.percentage}%)`);
          
        } else {
          // Use AI marking (consumes tokens)
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
          
          // Add retry logic with exponential backoff for network issues
          let retryCount = 0;
          const maxRetries = 3;
          let finalResponse: Response | undefined;
          
          while (retryCount <= maxRetries) {
            try {
              const response = await fetch('/api/openai', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Connection': 'keep-alive', // Optimize connection reuse
                },
                body: JSON.stringify(requestData),
                signal: controller.signal,
              });
              
              if (response.ok) {
                finalResponse = response;
                break; // Success, exit retry loop
              } else if (response.status === 429) {
                // Rate limit - wait longer
                const waitTime = Math.pow(2, retryCount) * 2000 + Math.random() * 1000;
                addLog(`⏳ Rate limited, waiting ${Math.round(waitTime/1000)}s before retry ${retryCount + 1}/${maxRetries}`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
              } else {
                // Other HTTP error
                const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
                throw new Error(errorData.error || `HTTP ${response.status}`);
              }
            } catch (fetchError: unknown) {
              const error = fetchError as Error;
              if (error.name === 'AbortError') {
                throw new Error('Request timeout - document may be too large');
              }
              
              if (retryCount === maxRetries) {
                throw fetchError;
              }
              
              addLog(`⚠️ Network error (attempt ${retryCount + 1}/${maxRetries + 1}): ${error.message || 'Unknown error'}`);
              const waitTime = Math.pow(2, retryCount) * 1000;
              await new Promise(resolve => setTimeout(resolve, waitTime));
            }
            
            retryCount++;
          }

          clearTimeout(timeoutId);

          if (!finalResponse) {
            throw new Error('No response received after retries');
          }

          const data = await finalResponse.json();
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
            originalFileName: file.originalFileName,
            markedFileName: `MARKED_${file.studentName}_${file.assignmentTitle}.pdf`,
          };

          markingResults.push(result);
          addLog(`✅ Completed marking for ${file.studentName} ${percentage ? `(${percentage}%)` : '(Score processed)'}`);

          // Clear response data to free memory
          finalResponse = undefined;
        }

      } catch (error) {
        clearTimeout(timeoutId);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        addLog(`❌ Error marking ${file.studentName}: ${errorMessage}`);
        
        // Provide more specific error guidance
        let errorGuidance = '';
        if (errorMessage.includes('Document too large') || errorMessage.includes('timeout')) {
          errorGuidance = '\n\n💡 Suggestion: Try using a shorter document or break it into smaller parts.';
        } else if (errorMessage.includes('Rate limit')) {
          errorGuidance = '\n\n💡 Suggestion: The system automatically retries with delays. Please wait.';
        } else if (errorMessage.includes('API key')) {
          errorGuidance = '\n\n💡 Suggestion: Check your OpenAI API key configuration.';
        } else if (errorMessage.includes('Failed to fetch') || errorMessage.includes('ERR_INSUFFICIENT_RESOURCES')) {
          errorGuidance = '\n\n💡 Suggestion: Browser resource limit reached. Try processing fewer files at once.';
        } else {
          errorGuidance = '\n\n💡 The system includes automatic retry logic for temporary issues.';
        }
        
        // Add error result
        const errorResult: MarkingResult = {
          studentName: file.studentName,
          assignmentTitle: file.assignmentTitle,
          markingContent: `❌ Error occurred during marking: ${errorMessage}${errorGuidance}`,
          memoUsed: memo?.fileName || 'None',
          promptUsed: prompt.name,
          createdAt: new Date(),
          originalFileName: file.originalFileName,
          markedFileName: `ERROR_${file.studentName}_${file.assignmentTitle}.pdf`,
        };
        
        markingResults.push(errorResult);
      }

      // Longer delay between requests + garbage collection hint
      if (i < files.length - 1) {
        addLog('⏳ Waiting 5 seconds before next request (resource management)...');
        
        // Force garbage collection if available (development only)
        if (typeof window !== 'undefined' && 'gc' in window) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (window as any).gc();
          } catch {
            // Ignore if gc is not available
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 10000)); // Increased to 10 seconds to account for chunk processing
      }
    }

    addLog(`🎉 Marking completed! Successfully processed ${markingResults.length} files`);
    setProgress(prev => ({ ...prev, status: 'completed' }));
    onMarkingComplete(markingResults);
  }, [prompt, memo, files, assessmentType, onMarkingComplete, onMarkingStart, addLog, markingMode]);

  useEffect(() => {
    // Auto-start marking when component mounts
    if (files.length > 0 && prompt) {
      setTimeout(() => {
        startMarking();
      }, 500); // Small delay to show the interface first
    }
  }, [files.length, prompt, startMarking]);

  return (
    <div className="space-y-6">
      {/* Marking Mode Selector */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Choose Marking Method</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div 
            className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
              markingMode === 'local' 
                ? 'border-green-500 bg-green-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setMarkingMode('local')}
          >
            <div className="flex items-center mb-2">
              <input
                type="radio"
                checked={markingMode === 'local'}
                onChange={() => setMarkingMode('local')}
                className="mr-2"
              />
              <h4 className="font-medium text-gray-900">🏠 Local Marking</h4>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              Rule-based analysis using keyword detection and rubric matching
            </p>
            <div className="text-xs space-y-1">
              <div className="flex items-center text-green-600">
                <span className="mr-1">✅</span>
                <span>Zero OpenAI tokens used</span>
              </div>
              <div className="flex items-center text-green-600">
                <span className="mr-1">⚡</span>
                <span>Instant processing</span>
              </div>
              <div className="flex items-center text-green-600">
                <span className="mr-1">💰</span>
                <span>No API costs</span>
              </div>
              <div className="flex items-center text-orange-600">
                <span className="mr-1">⚠️</span>
                <span>Basic analysis only</span>
              </div>
            </div>
          </div>
          
          <div 
            className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
              markingMode === 'ai' 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setMarkingMode('ai')}
          >
            <div className="flex items-center mb-2">
              <input
                type="radio"
                checked={markingMode === 'ai'}
                onChange={() => setMarkingMode('ai')}
                className="mr-2"
              />
              <h4 className="font-medium text-gray-900">🤖 AI Marking</h4>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              Advanced OpenAI GPT-3.5-turbo analysis with detailed feedback
            </p>
            <div className="text-xs space-y-1">
              <div className="flex items-center text-blue-600">
                <span className="mr-1">✅</span>
                <span>Detailed analysis</span>
              </div>
              <div className="flex items-center text-blue-600">
                <span className="mr-1">🧠</span>
                <span>Context understanding</span>
              </div>
              <div className="flex items-center text-red-600">
                <span className="mr-1">💸</span>
                <span>Consumes OpenAI tokens</span>
              </div>
              <div className="flex items-center text-red-600">
                <span className="mr-1">⏱️</span>
                <span>Slower processing</span>
              </div>
            </div>
          </div>
        </div>
        
        {markingMode === 'local' && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              <strong>💰 Cost Savings:</strong> Using local marking will save approximately{' '}
              <strong>{files.reduce((total, file) => total + Math.ceil(file.extractedText.length / 4), 0) + (files.length * 2000)}</strong>{' '}
              OpenAI tokens (estimated ${((files.reduce((total, file) => total + Math.ceil(file.extractedText.length / 4), 0) + (files.length * 2000)) * 0.000002).toFixed(4)} USD).
            </p>
          </div>
        )}
      </div>
      
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {markingMode === 'local' ? '🏠 Local Marking in Progress' : '🤖 AI Marking in Progress'}
        </h2>
        <p className="text-gray-600">
          {markingMode === 'local' 
            ? `Processing ${files.length} student file(s) using local rule-based analysis (Zero AI tokens used)...`
            : `Processing ${files.length} student file(s) with OpenAI GPT-3.5-turbo (with smart chunking for large documents)...`
          }
        </p>
        
        {/* Info about chunking for large documents */}
        {files.some(file => getDocumentSizeCategory(file.extractedText).willChunk) && (
          <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm">
                <p className="font-medium text-yellow-800 mb-1">📄 Large Document Processing</p>
                            <p className="text-yellow-700">
              Some of your documents are large and will be processed in chunks for better accuracy. 
              This may take a bit longer but ensures comprehensive marking within OpenAI&apos;s limits.
            </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Batch recommendation */}
        {(() => {
          const batchRec = getBatchRecommendation(files);
          const shouldShowRecommendation = batchRec.riskLevel !== 'low' || files.length > batchRec.recommendedBatchSize;
          
          if (!shouldShowRecommendation) return null;
          
          const bgColor = batchRec.riskLevel === 'high' ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200';
          const textColor = batchRec.riskLevel === 'high' ? 'text-red-700' : 'text-orange-700';
          const titleColor = batchRec.riskLevel === 'high' ? 'text-red-800' : 'text-orange-800';
          const iconColor = batchRec.riskLevel === 'high' ? 'text-red-600' : 'text-orange-600';
          
          return (
            <div className={`mt-3 ${bgColor} rounded-lg p-3`}>
              <div className="flex items-start">
                <svg className={`w-5 h-5 ${iconColor} mr-2 mt-0.5`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div className="text-sm">
                  <p className={`font-medium ${titleColor} mb-1`}>
                    {batchRec.riskLevel === 'high' ? '🚨 High Resource Risk' : '⚠️ Batch Size Recommendation'}
                  </p>
                  <p className={textColor}>
                    {batchRec.reason}
                  </p>
                  <p className={`${textColor} mt-1 font-medium`}>
                    💡 Recommended: Process {batchRec.recommendedBatchSize} files at a time ({batchRec.totalBatches} batches total)
                  </p>
                </div>
              </div>
            </div>
          );
        })()}
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
          <p>• OpenAI Model: <strong>GPT-3.5-turbo</strong></p>
          <p>• Estimated time: <strong>{getProcessingTimeEstimate(files)}</strong></p>
        </div>
        
        {/* Document size analysis */}
        {files.length > 0 && (
          <div className="mt-3 pt-3 border-t border-blue-200">
            <h5 className="font-medium text-blue-900 mb-2">📊 Document Analysis</h5>
            <div className="text-sm text-blue-800 space-y-1">
              {files.map((file, index) => {
                const sizeInfo = getDocumentSizeCategory(file.extractedText);
                return (
                  <div key={index} className="flex justify-between items-center">
                    <span>{file.studentName}:</span>
                    <span className={`font-medium ${
                      sizeInfo.category === 'large' || sizeInfo.category === 'very-large' 
                        ? 'text-orange-700' 
                        : 'text-blue-800'
                    }`}>
                      {sizeInfo.description} {sizeInfo.willChunk && '(will chunk)'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
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