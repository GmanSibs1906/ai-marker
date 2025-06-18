import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface MarkingRequest {
  prompt: string;
  documentContent: string;
  assessmentType: 'assessment' | 'project';
}

export interface MarkingResponse {
  markingResult: string;
  totalMarks?: number;
  percentage?: number;
}

export async function markDocument(
  prompt: string, 
  documentContent: string, 
  assessmentType: 'assessment' | 'project',
  memo?: string,
  studentName?: string,
  assignmentTitle?: string
): Promise<string> {
  const systemPrompt = `You are an expert academic marker. Follow the provided marking guidelines exactly. 
  
  For assessments: Provide structured feedback with section breakdowns, marks, and totals.
  For projects: Provide detailed evaluation with strengths, areas for improvement, and final grades.
  
  ${memo ? 'IMPORTANT: You have been provided with a MARKING MEMO/RUBRIC. Use this as your primary reference for marking. Award marks based on how well the student\'s answers match the expected answers in the memo.' : ''}
  
  Always maintain professional, constructive tone and provide specific, actionable feedback.`;

  const userPrompt = `${prompt}

${memo ? `MARKING MEMO/RUBRIC:
${memo}

Please mark the student's work against this memo. Award marks based on how well their answers align with the expected responses in the memo.
` : ''}

Student: ${studentName || 'Unknown'}
Assignment: ${assignmentTitle || 'Unknown'}

Document to mark:
${documentContent}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 4000,
      temperature: 0.1,
    });

    return completion.choices[0]?.message?.content || 'No response generated';
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error('Failed to mark document');
  }
} 