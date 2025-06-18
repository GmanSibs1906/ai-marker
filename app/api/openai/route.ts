import { NextRequest, NextResponse } from 'next/server';
import { markDocument } from '@/app/lib/openai';

export async function POST(request: NextRequest) {
  try {
    const { prompt, documentContent, assessmentType, memo, studentName, assignmentTitle } = await request.json();
    
    if (!prompt || !documentContent || !assessmentType) {
      return NextResponse.json(
        { error: 'Missing required fields: prompt, documentContent, assessmentType' },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const result = await markDocument(
      prompt, 
      documentContent, 
      assessmentType, 
      memo, 
      studentName, 
      assignmentTitle
    );
    
    return NextResponse.json({ markingResult: result });
  } catch (error) {
    console.error('Marking API error:', error);
    return NextResponse.json(
      { error: 'Failed to mark document. Please try again.' },
      { status: 500 }
    );
  }
} 