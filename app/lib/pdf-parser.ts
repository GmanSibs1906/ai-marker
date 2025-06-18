import pdf from 'pdf-parse';

export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const data = await pdf(buffer);
    return data.text;
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

export function parseFileName(fileName: string): { studentName: string; assignmentTitle: string } {
  const nameWithoutExtension = fileName.replace('.pdf', '');
  const parts = nameWithoutExtension.split('_');
  
  if (parts.length < 2) {
    throw new Error('Invalid file name format. Use: StudentName_AssignmentTitle.pdf');
  }
  
  const studentName = parts[0];
  const assignmentTitle = parts.slice(1).join('_');
  
  return { studentName, assignmentTitle };
}

export function validateFileName(fileName: string): boolean {
  // Check if file is PDF
  if (!fileName.toLowerCase().endsWith('.pdf')) {
    return false;
  }
  
  // Check naming convention
  const nameWithoutExtension = fileName.replace('.pdf', '');
  const parts = nameWithoutExtension.split('_');
  
  return parts.length >= 2 && parts[0].length > 0 && parts[1].length > 0;
} 