'use client';

import { useState } from 'react';
import { UploadedFile, ClassDetails, Prompt, Memo } from '../lib/types';
import { processBatchDocuments, BatchProgress } from '../lib/batch-processor';
import { Button } from './ui/Button';

interface BatchProcessorProps {
  files: UploadedFile[];
  classDetails: ClassDetails;
  selectedPrompt: Prompt;
  selectedMemo?: Memo;
  assessmentType: 'assessment' | 'project';
  onComplete: (downloadUrl: string) => void;
}

export default function BatchProcessor({
  files,
  classDetails,
  selectedPrompt,
  selectedMemo,
  assessmentType,
  onComplete
}: BatchProcessorProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<BatchProgress | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startBatchProcessing = async () => {
    if (files.length === 0) {
      setError('No files to process');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setProgress({
      totalFiles: files.length,
      processedFiles: 0,
      currentFile: '',
      status: 'processing',
      errors: []
    });

    try {
      const url = await processBatchDocuments(files, {
        classDetails,
        prompt: selectedPrompt.content,
        memo: selectedMemo?.content,
        assessmentType,
        onProgress: setProgress,
      });

      setDownloadUrl(url);
      onComplete(url);
    } catch (error) {
      console.error('Batch processing failed:', error);
      setError(error instanceof Error ? error.message : 'Batch processing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadBatch = () => {
    if (downloadUrl) {
      window.open(downloadUrl, '_blank');
    }
  };

  const getProgressPercentage = () => {
    if (!progress) return 0;
    return Math.round((progress.processedFiles / progress.totalFiles) * 100);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Batch Processing</h2>

      {/* Processing Summary */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-gray-900 mb-2">Processing Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Class:</span> {classDetails.className}
          </div>
          <div>
            <span className="font-medium">Subject:</span> {classDetails.subject}
          </div>
          <div>
            <span className="font-medium">Files to Process:</span> {files.length}
          </div>
          <div>
            <span className="font-medium">Assessment Type:</span> {assessmentType}
          </div>
          <div>
            <span className="font-medium">Prompt:</span> {selectedPrompt.name}
          </div>
          <div>
            <span className="font-medium">Memo:</span> {selectedMemo ? selectedMemo.fileName : 'None'}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Progress Display */}
      {progress && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Processing Progress
            </span>
            <span className="text-sm text-gray-500">
              {progress.processedFiles} / {progress.totalFiles} files
            </span>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div 
              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${getProgressPercentage()}%` }}
            ></div>
          </div>

          {/* Current File */}
          {progress.currentFile && (
            <div className="text-sm text-gray-600 mb-2">
              Currently processing: <span className="font-medium">{progress.currentFile}</span>
            </div>
          )}

          {/* Status */}
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${
              progress.status === 'processing' ? 'bg-blue-500 animate-pulse' :
              progress.status === 'completed' ? 'bg-green-500' :
              'bg-red-500'
            }`}></div>
            <span className="text-sm capitalize font-medium">
              {progress.status === 'processing' ? 'Processing...' : 
               progress.status === 'completed' ? 'Completed' : 
               'Error'}
            </span>
          </div>

          {/* Errors */}
          {progress.errors.length > 0 && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <h4 className="text-sm font-medium text-yellow-800 mb-2">
                Processing Errors ({progress.errors.length}):
              </h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                {progress.errors.map((error, index) => (
                  <li key={index} className="truncate">• {error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* File List */}
      <div className="mb-6">
        <h3 className="font-medium text-gray-900 mb-3">Files to Process:</h3>
        <div className="max-h-40 overflow-y-auto space-y-2">
          {files.map((file, index) => (
            <div key={file.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
              <div className="flex-1">
                <div className="font-medium">{file.studentName || 'Unknown Student'}</div>
                <div className="text-gray-600">{file.originalFileName}</div>
              </div>
              <div className={`w-2 h-2 rounded-full ${
                progress && index < progress.processedFiles ? 'bg-green-500' :
                progress && index === progress.processedFiles ? 'bg-blue-500 animate-pulse' :
                'bg-gray-300'
              }`}></div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        {!isProcessing && !downloadUrl && (
          <Button
            onClick={startBatchProcessing}
            disabled={files.length === 0}
            className="w-full"
          >
            Start Batch Processing
          </Button>
        )}

        {isProcessing && (
          <div className="w-full text-center py-3">
            <div className="inline-flex items-center space-x-2 text-primary-600">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
              <span>Processing documents...</span>
            </div>
          </div>
        )}

        {downloadUrl && (
          <div className="w-full space-y-3">
            <div className="text-center text-green-600 font-medium">
              ✅ Batch processing completed successfully!
            </div>
            <Button
              onClick={downloadBatch}
              className="w-full"
              variant="primary"
            >
              Download Marked Documents (ZIP)
            </Button>
            <div className="text-center text-sm text-gray-500">
              The ZIP file contains all marked PDFs with the Melsoft Academy logo and a batch summary.
            </div>
          </div>
        )}
      </div>

      {/* Processing Statistics */}
      {progress && progress.status === 'completed' && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h4 className="font-medium text-green-800 mb-2">Processing Complete</h4>
          <div className="text-sm text-green-700 space-y-1">
            <div>✅ Total files processed: {progress.totalFiles}</div>
            <div>✅ Successfully marked: {progress.totalFiles - progress.errors.length}</div>
            {progress.errors.length > 0 && (
              <div>⚠️ Files with errors: {progress.errors.length}</div>
            )}
            <div>📁 All documents saved to class: {classDetails.className}</div>
          </div>
        </div>
      )}
    </div>
  );
} 