// Client-side file validation and parsing utilities
// Server-side document parsing is handled in API routes

export function parseFileName(fileName: string): { studentName: string; assignmentTitle: string } {
  // Remove file extension (supports .pdf, .doc, .docx)
  const nameWithoutExtension = fileName.replace(/\.(pdf|docx?|PDF|DOCX?|Doc)$/, '');
  const parts = nameWithoutExtension.split('_');
  
  if (parts.length < 2) {
    throw new Error('Invalid file name format. Use: StudentName_AssignmentTitle.pdf/doc/docx');
  }
  
  const studentName = parts[0];
  const assignmentTitle = parts.slice(1).join('_');
  
  return { studentName, assignmentTitle };
}

export function validateFileName(fileName: string): boolean {
  const lowerFileName = fileName.toLowerCase();
  
  // Check if file has supported extension
  if (!lowerFileName.match(/\.(pdf|docx?|PDF|DOCX?|Doc)$/)) {
    return false;
  }
  
  // Check naming convention
  const nameWithoutExtension = fileName.replace(/\.(pdf|docx?|PDF|DOCX?|Doc)$/, '');
  const parts = nameWithoutExtension.split('_');
  
  return parts.length >= 2 && parts[0].length > 0 && parts[1].length > 0;
}

export function getSupportedFileTypes(): string[] {
  return ['.pdf', '.doc', '.docx'];
}

export function getFileTypeDescription(): string {
  return 'PDF, DOC, or DOCX files';
}

export function validateFileSize(file: File, maxSizeInMB: number = 10): boolean {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  return file.size <= maxSizeInBytes;
}

export function getFileExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() || '';
} 