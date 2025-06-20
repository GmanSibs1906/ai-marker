import { NextRequest, NextResponse } from 'next/server';
import { generateImprovedMarkingReport, generateChatGPTStyleReport } from '@/app/lib/improved-marker';

export async function POST(request: NextRequest) {
  try {
    const { documentContent, studentName, assignmentTitle, memo } = await request.json();
    
    if (!documentContent || !studentName || !assignmentTitle) {
      return NextResponse.json(
        { error: 'Missing required fields: documentContent, studentName, assignmentTitle' },
        { status: 400 }
      );
    }

    // Generate improved marking report (zero AI tokens)
    const result = generateImprovedMarkingReport(
      documentContent,
      studentName,
      assignmentTitle,
      memo
    );
    
    // Generate ChatGPT-style report
    const chatGPTStyleReport = generateChatGPTStyleReport(result);
    
    return NextResponse.json({ 
      markingResult: chatGPTStyleReport,
      totalMarks: result.totalMarksAwarded,
      percentage: result.percentage,
      tokensSaved: result.tokensSaved,
      method: result.markingMethod,
      questionAnalysis: result.questionAnalysis,
      totalQuestions: result.totalQuestions
    });
  } catch (error) {
    console.error('Local marking error:', error);
    return NextResponse.json(
      { error: 'Failed to mark document locally. Please try again.' },
      { status: 500 }
    );
  }
} 