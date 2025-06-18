export interface Prompt {
  id: string;
  name: string;
  type: 'assessment' | 'project';
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Memo {
  id: string;
  fileName: string;
  content: string;
  assessmentType: 'assessment' | 'project';
  uploadedAt: Date;
}

export interface UploadedFile {
  id: string;
  file: File;
  studentName: string;
  assignmentTitle: string;
  extractedText: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
}

export interface MarkingResult {
  studentName: string;
  assignmentTitle: string;
  markingContent: string;
  totalMarks?: number;
  percentage?: number;
  memoUsed?: string;
  promptUsed?: string;
  createdAt: Date;
}

export interface MarkingSession {
  id: string;
  promptId: string;
  memoId?: string;
  assessmentType: 'assessment' | 'project';
  files: UploadedFile[];
  results: MarkingResult[];
  status: 'setup' | 'processing' | 'completed';
  createdAt: Date;
}

export interface MarkingSection {
  name: string;
  marks: number;
  totalMarks: number;
  feedback: string;
}

export interface MarkingRequest {
  prompt: string;
  memo?: string;
  documentContent: string;
  assessmentType: 'assessment' | 'project';
  studentName: string;
  assignmentTitle: string;
} 