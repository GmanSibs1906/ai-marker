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
  detectedStudentName?: string;
  detectedSubject?: string;
  originalFileName: string;
  fileType: string;
}

export interface MarkingResult {
  studentName: string;
  assignmentTitle: string;
  markingContent: string;
  totalMarks?: number;
  percentage?: number;
  createdAt: Date;
  subject?: string;
  classId?: string;
  originalFileName: string;
  markedFileName: string;
  memoUsed?: string;
  promptUsed?: string;
}

export interface MarkingSession {
  id: string;
  promptId: string;
  assessmentType: 'assessment' | 'project';
  files: UploadedFile[];
  results: MarkingResult[];
  status: 'setup' | 'processing' | 'completed';
  createdAt: Date;
  classId?: string;
  batchId?: string;
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

export interface ClassDetails {
  id: string;
  className: string;
  subject: string;
  teacher: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BatchJob {
  id: string;
  classId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalFiles: number;
  processedFiles: number;
  failedFiles: number;
  createdAt: Date;
  completedAt?: Date;
  downloadUrl?: string;
}

export interface DocumentMetadata {
  studentName?: string;
  subject?: string;
  assignmentType?: string;
  dateSubmitted?: Date;
  confidence: {
    studentName: number;
    subject: number;
  };
}

export interface DashboardStats {
  totalClasses: number;
  totalDocuments: number;
  documentsMarked: number;
  pendingJobs: number;
}

export interface ClassSummary extends ClassDetails {
  documentCount: number;
  markedCount: number;
  lastActivity: Date;
} 