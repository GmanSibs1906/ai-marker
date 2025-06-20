import { NextRequest, NextResponse } from 'next/server';
import { parseFileName, validateFileName } from '@/app/lib/pdf-parser';
import { extractTextFromDocument } from '@/app/lib/document-parser-server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    
    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    // Validate file count
    const maxFiles = parseInt(process.env.NEXT_PUBLIC_MAX_FILES || '20');
    if (files.length > maxFiles) {
      return NextResponse.json(
        { error: `Maximum ${maxFiles} files allowed` },
        { status: 400 }
      );
    }

    // Validate file sizes
    const maxFileSize = parseInt(process.env.NEXT_PUBLIC_MAX_FILE_SIZE || '10485760'); // 10MB
    for (const file of files) {
      if (file.size > maxFileSize) {
        return NextResponse.json(
          { error: `File ${file.name} exceeds maximum size of ${maxFileSize / 1024 / 1024}MB` },
          { status: 400 }
        );
      }
    }
    
    const processedFiles = await Promise.all(
      files.map(async (file, index) => {
        try {
          // Validate file name format
          if (!validateFileName(file.name)) {
            throw new Error('Invalid file name format. Use: StudentName_AssignmentTitle.pdf/doc/docx');
          }

          const { studentName, assignmentTitle } = parseFileName(file.name);
          
          // Convert File to Buffer for server-side parsing
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const extractedText = await extractTextFromDocument(buffer, file.name);
          
          return {
            id: `file-${index}-${Date.now()}`,
            studentName,
            assignmentTitle,
            extractedText,
            status: 'completed' as const,
            fileName: file.name,
          };
        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error);
          return {
            id: `file-${index}-${Date.now()}`,
            studentName: 'Unknown',
            assignmentTitle: file.name,
            extractedText: '',
            status: 'error' as const,
            error: error instanceof Error ? error.message : 'Unknown error',
            fileName: file.name,
          };
        }
      })
    );
    
    const successCount = processedFiles.filter(f => f.status === 'completed').length;
    const errorCount = processedFiles.filter(f => f.status === 'error').length;
    
    return NextResponse.json({ 
      processedFiles,
      summary: {
        total: files.length,
        successful: successCount,
        failed: errorCount,
      }
    });
  } catch (error) {
    console.error('Upload API error:', error);
    return NextResponse.json(
      { error: 'Failed to process files. Please try again.' },
      { status: 500 }
    );
  }
} 