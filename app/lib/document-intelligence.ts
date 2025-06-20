import { DocumentMetadata } from './types';
import { markDocument } from './openai';

// Common patterns for extracting information from documents
const NAME_PATTERNS = [
  /name:\s*([a-zA-Z\s]+)/i,
  /student:\s*([a-zA-Z\s]+)/i,
  /by:\s*([a-zA-Z\s]+)/i,
  /author:\s*([a-zA-Z\s]+)/i,
  /submitted by:\s*([a-zA-Z\s]+)/i,
];

const SUBJECT_PATTERNS = [
  /subject:\s*([a-zA-Z\s]+)/i,
  /course:\s*([a-zA-Z\s]+)/i,
  /module:\s*([a-zA-Z\s]+)/i,
  /class:\s*([a-zA-Z\s]+)/i,
  /assignment for:\s*([a-zA-Z\s]+)/i,
];

// Common subjects for better matching
const COMMON_SUBJECTS = [
  'mathematics', 'math', 'english', 'science', 'physics', 'chemistry', 'biology',
  'history', 'geography', 'computer science', 'programming', 'web development',
  'data structures', 'algorithms', 'database', 'software engineering',
  'business studies', 'economics', 'accounting', 'marketing', 'psychology',
  'sociology', 'philosophy', 'art', 'music', 'physical education', 'pe'
];

export async function extractDocumentMetadata(
  documentText: string, 
  fileName?: string
): Promise<DocumentMetadata> {
  const metadata: DocumentMetadata = {
    confidence: {
      studentName: 0,
      subject: 0,
    }
  };

  // Extract student name using patterns
  const studentName = extractStudentName(documentText, fileName);
  if (studentName) {
    metadata.studentName = studentName.name;
    metadata.confidence.studentName = studentName.confidence;
  }

  // Extract subject using patterns
  const subject = extractSubject(documentText, fileName);
  if (subject) {
    metadata.subject = subject.name;
    metadata.confidence.subject = subject.confidence;
  }

  // If confidence is low, try AI-assisted extraction
  if (metadata.confidence.studentName < 0.7 || metadata.confidence.subject < 0.7) {
    try {
      const aiMetadata = await extractMetadataWithAI(documentText);
      
      // Use AI results if confidence is higher
      if (!metadata.studentName || aiMetadata.studentName) {
        metadata.studentName = aiMetadata.studentName;
        metadata.confidence.studentName = Math.max(metadata.confidence.studentName, 0.8);
      }
      
      if (!metadata.subject || aiMetadata.subject) {
        metadata.subject = aiMetadata.subject;
        metadata.confidence.subject = Math.max(metadata.confidence.subject, 0.8);
      }
    } catch (error) {
      console.warn('AI metadata extraction failed:', error);
    }
  }

  return metadata;
}

function extractStudentName(text: string, fileName?: string): { name: string; confidence: number } | null {
  // Try filename first (highest confidence)
  if (fileName) {
    const fileNameMatch = fileName.match(/^([a-zA-Z\s]+)_/);
    if (fileNameMatch) {
      return {
        name: fileNameMatch[1].trim(),
        confidence: 0.9
      };
    }
  }

  // Try document content patterns
  for (const pattern of NAME_PATTERNS) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const name = match[1].trim();
      if (isValidName(name)) {
        return {
          name: formatName(name),
          confidence: 0.8
        };
      }
    }
  }

  // Try to find name at the beginning of document
  const lines = text.split('\n').slice(0, 10); // Check first 10 lines
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 2 && trimmed.length < 50 && isValidName(trimmed)) {
      return {
        name: formatName(trimmed),
        confidence: 0.6
      };
    }
  }

  return null;
}

function extractSubject(text: string, fileName?: string): { name: string; confidence: number } | null {
  // Try document content patterns first
  for (const pattern of SUBJECT_PATTERNS) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const subject = match[1].trim().toLowerCase();
      if (isValidSubject(subject)) {
        return {
          name: formatSubject(subject),
          confidence: 0.9
        };
      }
    }
  }

  // Try to find subject keywords in text
  const textLower = text.toLowerCase();
  for (const subject of COMMON_SUBJECTS) {
    if (textLower.includes(subject)) {
      return {
        name: formatSubject(subject),
        confidence: 0.7
      };
    }
  }

  // Try filename
  if (fileName) {
    const fileNameLower = fileName.toLowerCase();
    for (const subject of COMMON_SUBJECTS) {
      if (fileNameLower.includes(subject)) {
        return {
          name: formatSubject(subject),
          confidence: 0.6
        };
      }
    }
  }

  return null;
}

async function extractMetadataWithAI(documentText: string): Promise<Partial<DocumentMetadata>> {
  const prompt = `Extract the following information from this document:
1. Student name (if mentioned)
2. Subject/course name (if mentioned)

Return only the extracted information in this format:
Student Name: [name or "Not found"]
Subject: [subject or "Not found"]

Document text (first 1000 characters):
${documentText.substring(0, 1000)}`;

  try {
    const response = await markDocument(
      prompt,
      '',
      'assessment'
    );

    const studentMatch = response.match(/Student Name:\s*(.+)/i);
    const subjectMatch = response.match(/Subject:\s*(.+)/i);

    return {
      studentName: studentMatch?.[1]?.trim() !== 'Not found' ? studentMatch?.[1]?.trim() : undefined,
      subject: subjectMatch?.[1]?.trim() !== 'Not found' ? subjectMatch?.[1]?.trim() : undefined,
    };
  } catch (error) {
    console.error('AI metadata extraction error:', error);
    return {};
  }
}

function isValidName(name: string): boolean {
  // Basic name validation
  const trimmed = name.trim();
  return (
    trimmed.length >= 2 &&
    trimmed.length <= 50 &&
    /^[a-zA-Z\s'-]+$/.test(trimmed) &&
    !trimmed.toLowerCase().includes('assignment') &&
    !trimmed.toLowerCase().includes('project') &&
    !trimmed.toLowerCase().includes('document')
  );
}

function isValidSubject(subject: string): boolean {
  return subject.length >= 2 && subject.length <= 50;
}

function formatName(name: string): string {
  return name.split(' ')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function formatSubject(subject: string): string {
  return subject.charAt(0).toUpperCase() + subject.slice(1).toLowerCase();
}

export function generateSmartFileName(
  originalFileName: string,
  studentName?: string,
  subject?: string,
  prefix: string = 'MARKED'
): string {
  const extension = originalFileName.split('.').pop() || 'pdf';
  
  if (studentName && subject) {
    return `${prefix}_${studentName.replace(/\s+/g, '')}_${subject.replace(/\s+/g, '')}.${extension}`;
  } else if (studentName) {
    return `${prefix}_${studentName.replace(/\s+/g, '')}_Assignment.${extension}`;
  } else if (subject) {
    return `${prefix}_Student_${subject.replace(/\s+/g, '')}.${extension}`;
  } else {
    return `${prefix}_${originalFileName}`;
  }
} 