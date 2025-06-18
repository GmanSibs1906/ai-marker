'use client';

import { useState, useRef } from 'react';
import { UploadedFile } from '../lib/types';
import { Button } from './ui/Button';

interface FileUploaderProps {
  assessmentType: 'assessment' | 'project';
  onFilesUploaded: (files: UploadedFile[]) => void;
  uploadedFiles: UploadedFile[];
}

export default function FileUploader({ assessmentType, onFilesUploaded, uploadedFiles }: FileUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload files');
      }

      // Convert API response to UploadedFile format
      const newFiles: UploadedFile[] = data.processedFiles.map((file: any) => ({
        id: file.id,
        file: new File([''], file.fileName || 'unknown.pdf'), // Create dummy file object
        studentName: file.studentName,
        assignmentTitle: file.assignmentTitle,
        extractedText: file.extractedText,
        status: file.status,
        error: file.error,
      }));

      // Combine with existing files
      const allFiles = [...uploadedFiles, ...newFiles];
      onFilesUploaded(allFiles);

      // Show success message if we have successful uploads
      const successCount = data.summary?.successful || 0;
      const failedCount = data.summary?.failed || 0;
      
      if (successCount > 0) {
        console.log(`Successfully uploaded ${successCount} file(s)`);
      }
      if (failedCount > 0) {
        setError(`${failedCount} file(s) failed to upload. Check individual file errors below.`);
      }

    } catch (error) {
      console.error('File upload error:', error);
      setError(error instanceof Error ? error.message : 'Failed to upload files');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(event.target.files);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const removeFile = (fileId: string) => {
    const filteredFiles = uploadedFiles.filter(f => f.id !== fileId);
    onFilesUploaded(filteredFiles);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-100 border border-red-300 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Upload Guidelines */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">📋 FILE UPLOAD GUIDELINES</h3>
        <div className="text-sm text-blue-800 space-y-2">
          <p><strong>For SINGLE STUDENT marking:</strong></p>
          <ul className="list-disc list-inside ml-4">
            <li>Upload 1 PDF file</li>
            <li>File name format: "StudentName_AssignmentTitle.pdf"</li>
            <li>Example: "JohnSmith_WebDevelopmentProject.pdf"</li>
          </ul>
          
          <p><strong>For MULTIPLE STUDENTS marking:</strong></p>
          <ul className="list-disc list-inside ml-4">
            <li>Upload multiple PDF files at once</li>
            <li>Each file must follow naming convention</li>
            <li>Examples: "BusisiweNgwane_CVWebpage.pdf", "JohnDoe_CyberSecurityAssessment.pdf"</li>
          </ul>

          <p><strong>IMPORTANT RULES:</strong></p>
          <ul className="list-disc list-inside ml-4">
            <li>✅ Only PDF files accepted</li>
            <li>✅ Max file size: 10MB per file</li>
            <li>✅ Student name and assignment title MUST be in filename</li>
            <li>✅ Use underscores (_) to separate name and title</li>
            <li>✅ No spaces in filenames</li>
          </ul>
        </div>
      </div>

      {/* File Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive 
            ? 'border-primary-500 bg-primary-50' 
            : 'border-gray-300 hover:border-gray-400'
        } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf"
          onChange={handleFileInput}
          className="hidden"
          disabled={isUploading}
        />
        
        <div className="text-gray-500">
          <svg className="mx-auto h-12 w-12 mb-4" stroke="currentColor" fill="none" viewBox="0 0 48 48">
            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          
          {isUploading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
              <span>Processing files...</span>
            </div>
          ) : (
            <>
              <p className="text-lg mb-2">Drop PDF files here or click to browse</p>
              <p className="text-sm text-gray-400 mb-4">
                Upload student {assessmentType} files following the naming convention
              </p>
              <Button onClick={() => fileInputRef.current?.click()}>
                Choose Files
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">
              Uploaded Files ({uploadedFiles.length})
            </h4>
            <button
              onClick={() => onFilesUploaded([])}
              className="text-sm text-red-600 hover:text-red-800 transition-colors"
            >
              Clear All
            </button>
          </div>
          
          {uploadedFiles.map((file) => (
            <div
              key={file.id}
              className={`flex items-center justify-between p-3 border rounded-lg ${
                file.status === 'completed' 
                  ? 'border-green-200 bg-green-50' 
                  : file.status === 'error'
                  ? 'border-red-200 bg-red-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-gray-900">{file.studentName}</span>
                  <span className="text-gray-500">•</span>
                  <span className="text-gray-600">{file.assignmentTitle}</span>
                </div>
                
                {file.error && (
                  <div className="text-sm text-red-600 mt-1">
                    Error: {file.error}
                  </div>
                )}
                
                {file.status === 'completed' && (
                  <div className="text-xs text-gray-500 mt-1">
                    Text extracted: {file.extractedText.substring(0, 50)}...
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  file.status === 'completed' 
                    ? 'bg-green-100 text-green-800' 
                    : file.status === 'error'
                    ? 'bg-red-100 text-red-800'
                    : file.status === 'processing'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {file.status}
                </span>
                
                <button
                  onClick={() => removeFile(file.id)}
                  className="p-1 text-red-600 hover:text-red-800 transition-colors"
                  title="Remove file"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {uploadedFiles.length > 0 && (
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="text-sm text-gray-600">
            <strong>Summary:</strong> {uploadedFiles.length} file(s) uploaded, {' '}
            {uploadedFiles.filter(f => f.status === 'completed').length} successful, {' '}
            {uploadedFiles.filter(f => f.status === 'error').length} failed
          </div>
        </div>
      )}
    </div>
  );
} 