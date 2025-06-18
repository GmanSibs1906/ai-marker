import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromPDF } from '@/app/lib/pdf-parser';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('memo') as File;
    const assessmentType = formData.get('assessmentType') as string;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No memo file provided' },
        { status: 400 }
      );
    }

    if (!assessmentType || !['assessment', 'project'].includes(assessmentType)) {
      return NextResponse.json(
        { error: 'Invalid assessment type' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'Only PDF files are allowed for memos' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxFileSize = parseInt(process.env.NEXT_PUBLIC_MAX_FILE_SIZE || '10485760');
    if (file.size > maxFileSize) {
      return NextResponse.json(
        { error: `File size exceeds maximum of ${maxFileSize / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    try {
      const extractedText = await extractTextFromPDF(file);
      
      if (!extractedText || extractedText.trim().length === 0) {
        return NextResponse.json(
          { error: 'Could not extract text from PDF. Please ensure the PDF contains text content.' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        memo: {
          fileName: file.name,
          content: extractedText,
          assessmentType: assessmentType as 'assessment' | 'project',
        }
      });
    } catch (error) {
      console.error('Error processing memo file:', error);
      return NextResponse.json(
        { error: 'Failed to process memo file. Please ensure it is a valid PDF.' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Memo upload API error:', error);
    return NextResponse.json(
      { error: 'Failed to process memo upload. Please try again.' },
      { status: 500 }
    );
  }
} 