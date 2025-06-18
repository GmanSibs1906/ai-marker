'use client';

import { useState, useEffect } from 'react';
import { Prompt } from '../lib/types';
import { getPromptsByType } from '../lib/storage';

interface PromptSelectorProps {
  assessmentType: 'assessment' | 'project';
  selectedPrompt: Prompt | null;
  onPromptSelect: (prompt: Prompt | null) => void;
}

export default function PromptSelector({
  assessmentType,
  selectedPrompt,
  onPromptSelect
}: PromptSelectorProps) {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadedPrompts = getPromptsByType(assessmentType);
    setPrompts(loadedPrompts);
    setIsLoaded(true);
    
    // Auto-select the first prompt if none selected
    if (!selectedPrompt && loadedPrompts.length > 0) {
      onPromptSelect(loadedPrompts[0]);
    }
  }, [assessmentType, selectedPrompt, onPromptSelect]);

  if (!isLoaded) {
    return (
      <div className="animate-pulse">
        <div className="h-6 bg-gray-300 rounded w-32 mb-3"></div>
        <div className="h-4 bg-gray-300 rounded w-48 mb-2"></div>
        <div className="h-10 bg-gray-300 rounded w-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">Marking Prompt</h3>
      <p className="text-gray-600 text-sm">
        Select the marking guidelines that will be used by AI to evaluate the submissions.
      </p>
      
      {prompts.length > 0 ? (
        <div className="space-y-2">
          {prompts.map((prompt) => (
            <div
              key={prompt.id}
              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                selectedPrompt?.id === prompt.id
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => onPromptSelect(prompt)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900">{prompt.name}</span>
                    {selectedPrompt?.id === prompt.id && (
                      <span className="px-2 py-1 bg-primary-600 text-white text-xs rounded">
                        Selected
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    Type: {prompt.type} • Created: {prompt.createdAt.toLocaleDateString()}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Preview: {prompt.content.substring(0, 100)}...
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-gray-500">
          <svg className="mx-auto h-12 w-12 mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p>No prompts available for {assessmentType}s</p>
          <p className="text-sm">Default prompts should be automatically loaded</p>
        </div>
      )}
      
      {selectedPrompt && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <h4 className="font-medium text-green-900 mb-2">✓ Selected Prompt</h4>
          <p className="text-sm text-green-800">
            <strong>{selectedPrompt.name}</strong> - This prompt will guide the AI marking process.
          </p>
        </div>
      )}
    </div>
  );
} 