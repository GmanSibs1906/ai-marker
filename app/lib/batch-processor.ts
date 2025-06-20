import JSZip from 'jszip';
import { UploadedFile, MarkingResult, BatchJob, ClassDetails } from './types';
import { extractDocumentMetadata, generateSmartFileName } from './document-intelligence';
import { markDocument } from './openai';
import { generateBatchPDFs } from './pdf-generator';
import { createBatchJob, updateBatchJob, saveMarkingResult, uploadBatchZip } from './firebase-service';

export interface BatchProcessingOptions {
  classDetails: ClassDetails;
  prompt: string;
  memo?: string;
  assessmentType: 'assessment' | 'project';
  onProgress?: (progress: BatchProgress) => void;
}

export interface BatchProgress {
  totalFiles: number;
  processedFiles: number;
  currentFile: string;
  status: 'processing' | 'completed' | 'error';
  errors: string[];
}

export class BatchProcessor {
  private options: BatchProcessingOptions;
  private batchJob: BatchJob | null = null;

  constructor(options: BatchProcessingOptions) {
    this.options = options;
  }

  async processBatch(files: UploadedFile[]): Promise<string> {
    const progress: BatchProgress = {
      totalFiles: files.length,
      processedFiles: 0,
      currentFile: '',
      status: 'processing',
      errors: []
    };

    try {
      // Create batch job in database
      this.batchJob = await createBatchJob({
        classId: this.options.classDetails.id,
        status: 'processing',
        totalFiles: files.length,
        processedFiles: 0,
        failedFiles: 0,
      });

      this.options.onProgress?.(progress);

      const markingResults: MarkingResult[] = [];

      // Process each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        progress.currentFile = file.originalFileName;
        progress.processedFiles = i;
        this.options.onProgress?.(progress);

        try {
          const result = await this.processIndividualFile(file);
          markingResults.push(result);

          // Save individual result to database
          await saveMarkingResult(result);

        } catch (error) {
          console.error(`Error processing file ${file.originalFileName}:`, error);
          progress.errors.push(`${file.originalFileName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        // Update batch job progress
        await updateBatchJob(this.batchJob.id, {
          processedFiles: i + 1,
          failedFiles: progress.errors.length,
        });
      }

      // Generate ZIP file with all marked documents
      const downloadUrl = await this.createBatchDownload(markingResults);

      // Update batch job as completed
      await updateBatchJob(this.batchJob.id, {
        status: 'completed',
        downloadUrl,
        completedAt: new Date(),
      });

      progress.status = 'completed';
      progress.processedFiles = files.length;
      this.options.onProgress?.(progress);

      return downloadUrl;

    } catch (error) {
      console.error('Batch processing error:', error);
      
      if (this.batchJob) {
        await updateBatchJob(this.batchJob.id, {
          status: 'failed',
        });
      }

      progress.status = 'error';
      progress.errors.push(error instanceof Error ? error.message : 'Unknown batch processing error');
      this.options.onProgress?.(progress);

      throw error;
    }
  }

  private async processIndividualFile(file: UploadedFile): Promise<MarkingResult> {
    // Extract intelligent metadata from document
    const metadata = await extractDocumentMetadata(file.extractedText, file.originalFileName);

    // Use detected metadata or fallback to provided data
    const studentName = metadata.studentName || file.studentName || 'Unknown Student';
    const subject = metadata.subject || this.options.classDetails.subject;

    // Generate smart filename
    const markedFileName = generateSmartFileName(
      file.originalFileName,
      studentName,
      subject,
      'MARKED'
    );

    // Mark the document with AI
    const markingContent = await markDocument(
      this.options.prompt,
      file.extractedText,
      this.options.assessmentType,
      this.options.memo,
      studentName,
      file.assignmentTitle || `${subject} Assignment`
    );

    // Extract marks and percentage if possible
    const { totalMarks, percentage } = this.extractScoreFromMarking(markingContent);

    return {
      studentName,
      assignmentTitle: file.assignmentTitle || `${subject} Assignment`,
      markingContent,
      totalMarks,
      percentage,
      subject,
      classId: this.options.classDetails.id,
      originalFileName: file.originalFileName,
      markedFileName,
      createdAt: new Date(),
    };
  }

  private extractScoreFromMarking(markingContent: string): { totalMarks?: number; percentage?: number } {
    // Try to extract numerical scores from the marking content
    const percentageMatch = markingContent.match(/(\d+)%/);
    const marksMatch = markingContent.match(/(\d+)\s*\/\s*(\d+)/);
    const totalMatch = markingContent.match(/total:\s*(\d+)/i);

    let totalMarks: number | undefined;
    let percentage: number | undefined;

    if (percentageMatch) {
      percentage = parseInt(percentageMatch[1]);
    }

    if (marksMatch) {
      const scored = parseInt(marksMatch[1]);
      const total = parseInt(marksMatch[2]);
      totalMarks = scored;
      if (!percentage) {
        percentage = Math.round((scored / total) * 100);
      }
    } else if (totalMatch) {
      totalMarks = parseInt(totalMatch[1]);
    }

    return { totalMarks, percentage };
  }

  private async createBatchDownload(markingResults: MarkingResult[]): Promise<string> {
    // Generate PDFs for all marking results
    const pdfFiles = await generateBatchPDFs(markingResults, this.options.assessmentType);

    // Create ZIP file
    const zip = new JSZip();

    // Add each PDF to the ZIP
    pdfFiles.forEach(({ fileName, pdfBlob }) => {
      zip.file(fileName, pdfBlob);
    });

    // Add a summary file
    const summary = this.generateBatchSummary(markingResults);
    zip.file('BATCH_SUMMARY.txt', summary);

    // Generate ZIP blob
    const zipBlob = await zip.generateAsync({ type: 'blob' });

    // Upload ZIP to Firebase Storage
    const downloadUrl = await uploadBatchZip(zipBlob, this.batchJob!.id);

    return downloadUrl;
  }

  private generateBatchSummary(markingResults: MarkingResult[]): string {
    const classInfo = this.options.classDetails;
    const totalFiles = markingResults.length;
    const avgPercentage = markingResults
      .filter(r => r.percentage)
      .reduce((sum, r) => sum + (r.percentage || 0), 0) / totalFiles;

    return `
BATCH MARKING SUMMARY
=====================

Class: ${classInfo.className}
Subject: ${classInfo.subject}
Teacher: ${classInfo.teacher}
Date: ${new Date().toLocaleDateString()}

STATISTICS
----------
Total Documents Marked: ${totalFiles}
Average Score: ${avgPercentage.toFixed(1)}%

INDIVIDUAL RESULTS
------------------
${markingResults.map(result => 
  `${result.studentName} - ${result.assignmentTitle}: ${result.percentage || 'N/A'}%`
).join('\n')}

Generated by Melsoft Academy AI Assessment Marker
    `.trim();
  }
}

// Utility function for easy batch processing
export async function processBatchDocuments(
  files: UploadedFile[],
  options: BatchProcessingOptions
): Promise<string> {
  const processor = new BatchProcessor(options);
  return await processor.processBatch(files);
} 