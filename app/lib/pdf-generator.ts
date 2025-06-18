import jsPDF from 'jspdf';
import { MarkingResult } from './types';

export function generateMarkingPDF(
  markingResult: MarkingResult, 
  assessmentType: 'assessment' | 'project'
): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 20;
  const maxWidth = pageWidth - 2 * margin;
  let yPosition = 30;
  
  // Header
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`${assessmentType === 'assessment' ? 'Assessment' : 'Project'} Marking Results`, margin, yPosition);
  
  yPosition += 20;
  
  // Student Information
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Student: ${markingResult.studentName}`, margin, yPosition);
  yPosition += 10;
  doc.text(`Assignment: ${markingResult.assignmentTitle}`, margin, yPosition);
  yPosition += 10;
  doc.text(`Date: ${markingResult.createdAt.toLocaleDateString()}`, margin, yPosition);
  yPosition += 10;
  
  if (markingResult.percentage) {
    doc.text(`Final Score: ${markingResult.percentage}%`, margin, yPosition);
    yPosition += 15;
  }
  
  // Add a line separator
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 15;
  
  // Content
  doc.setFontSize(10);
  const lines = doc.splitTextToSize(markingResult.markingContent, maxWidth);
  
  for (const line of lines) {
    if (yPosition > pageHeight - 30) {
      doc.addPage();
      yPosition = 30;
    }
    doc.text(line, margin, yPosition);
    yPosition += 6;
  }
  
  return doc;
}

export function downloadPDF(doc: jsPDF, fileName: string): void {
  doc.save(`MARKED_${fileName}.pdf`);
}

export function generateBatchPDFs(results: MarkingResult[], assessmentType: 'assessment' | 'project'): void {
  results.forEach((result) => {
    const doc = generateMarkingPDF(result, assessmentType);
    downloadPDF(doc, `${result.studentName}_${result.assignmentTitle}`);
  });
} 