// Server-side document parsing utilities
// This file contains Node.js-specific code and should only be used in API routes

import pdf from 'pdf-parse';
import mammoth from 'mammoth';

// Generic function to extract text from various document formats
export async function extractTextFromDocument(buffer: Buffer, fileName: string): Promise<string> {
  const lowerFileName = fileName.toLowerCase();
  
  if (lowerFileName.endsWith('.pdf')) {
    return extractTextFromPDF(buffer);
  } else if (lowerFileName.endsWith('.docx')) {
    return extractTextFromDOCX(buffer);
  } else if (lowerFileName.endsWith('.doc')) {
    return extractTextFromDOC(buffer);
  } else {
    throw new Error('Unsupported file format. Please use PDF, DOC, or DOCX files.');
  }
}

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const data = await pdf(buffer);
    return data.text;
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

export async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    console.error('DOCX parsing error:', error);
    throw new Error('Failed to extract text from DOCX');
  }
}

export async function extractTextFromDOC(buffer: Buffer): Promise<string> {
  try {
    // For older DOC files, mammoth can still handle them
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    console.error('DOC parsing error:', error);
    throw new Error('Failed to extract text from DOC file. Please convert to DOCX or PDF format.');
  }
} 