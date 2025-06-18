'use client';

import { useState, useRef, useEffect } from 'react';
import { Memo } from '../lib/types';
import { addMemo, getMemosByType, deleteMemo } from '../lib/storage';
import { Button } from './ui/Button';

interface MemoUploaderProps {
  assessmentType: 'assessment' | 'project';
  selectedMemo: Memo | null;
  onMemoSelect: (memo: Memo | null) => void;
}

export default function MemoUploader({ assessmentType, selectedMemo, onMemoSelect }: MemoUploaderProps) {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load memos on client side only to prevent SSR hydration issues
  useEffect(() => {
    const loadedMemos = getMemosByType(assessmentType);
    setMemos(loadedMemos);
    setIsLoaded(true);
  }, [assessmentType]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('memo', file);
      formData.append('assessmentType', assessmentType);

      const response = await fetch('/api/upload-memo', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload memo');
      }

      // Save memo to local storage
      const newMemo = addMemo(data.memo);
      const updatedMemos = getMemosByType(assessmentType);
      setMemos(updatedMemos);

      // Auto-select the uploaded memo
      onMemoSelect(newMemo);

    } catch (error) {
      console.error('Memo upload error:', error);
      setError(error instanceof Error ? error.message : 'Failed to upload memo');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteMemo = (memoId: string) => {
    if (deleteMemo(memoId)) {
      const updatedMemos = getMemosByType(assessmentType);
      setMemos(updatedMemos);
      
      // If the deleted memo was selected, clear selection
      if (selectedMemo?.id === memoId) {
        onMemoSelect(null);
      }
    }
  };

  // formatFileSize function removed as it was unused

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Marking Memo</h3>
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          loading={isUploading}
          size="sm"
        >
          Upload New Memo
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        onChange={handleFileUpload}
        className="hidden"
      />

      {error && (
        <div className="p-3 bg-red-100 border border-red-300 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">📋 MEMO UPLOAD GUIDELINES</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Upload the marking memo/rubric as a PDF file</li>
          <li>• The memo should contain expected answers and marking criteria</li>
          <li>• AI will use this memo as the primary reference for marking</li>
          <li>• Maximum file size: 10MB</li>
          <li>• Only PDF files are accepted</li>
        </ul>
      </div>

      {!isLoaded ? (
        <div className="text-center py-6 text-gray-500">
          <div className="animate-pulse">
            <div className="h-12 w-12 bg-gray-300 rounded mx-auto mb-4"></div>
            <div className="h-4 bg-gray-300 rounded w-32 mx-auto mb-2"></div>
            <div className="h-3 bg-gray-300 rounded w-24 mx-auto"></div>
          </div>
        </div>
      ) : memos.length > 0 ? (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900">Available Memos:</h4>
          {memos.map((memo) => (
            <div
              key={memo.id}
              className={`p-3 border rounded-lg transition-colors cursor-pointer ${
                selectedMemo?.id === memo.id
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => onMemoSelect(memo)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900">{memo.fileName}</span>
                    {selectedMemo?.id === memo.id && (
                      <span className="px-2 py-1 bg-primary-600 text-white text-xs rounded">
                        Selected
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    Uploaded: {memo.uploadedAt.toLocaleDateString()} at {memo.uploadedAt.toLocaleTimeString()}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Preview: {memo.content.substring(0, 100)}...
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteMemo(memo.id);
                  }}
                  className="ml-2 p-1 text-red-600 hover:text-red-800 transition-colors"
                  title="Delete memo"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-gray-500">
          <svg className="mx-auto h-12 w-12 mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p>No memos uploaded yet for {assessmentType}s</p>
          <p className="text-sm">Upload a marking memo to get started</p>
        </div>
      )}
    </div>
  );
} 