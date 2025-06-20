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

// Token estimation function (rough approximation: 1 token ≈ 4 characters)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Improved chunking strategy - creates larger, more meaningful chunks
function chunkDocument(content: string, maxTokens: number = 6000): string[] {
  const contentTokens = estimateTokens(content);
  
  // If content is small enough, don't chunk
  if (contentTokens <= maxTokens) {
    return [content];
  }
  
  // Try to split by paragraphs first (double newlines)
  let sections = content.split(/\n\s*\n/).filter(s => s.trim().length > 0);
  
  // If no clear paragraphs, split by single newlines
  if (sections.length === 1) {
    sections = content.split(/\n/).filter(s => s.trim().length > 0);
  }
  
  // If still no clear structure, split by sentences
  if (sections.length === 1) {
    sections = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
  }
  
  const chunks: string[] = [];
  let currentChunk = '';
  
  for (const section of sections) {
    const testChunk = currentChunk + (currentChunk ? '\n\n' : '') + section;
    
    if (estimateTokens(testChunk) > maxTokens && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = section;
    } else {
      currentChunk = testChunk;
    }
  }
  
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }
  
  // If we still have no chunks or chunks are too large, force split
  if (chunks.length === 0 || chunks.some(chunk => estimateTokens(chunk) > maxTokens)) {
    const charLimit = maxTokens * 4; // Approximate character limit
    const forcedChunks: string[] = [];
    
    for (const chunk of chunks.length > 0 ? chunks : [content]) {
      if (chunk.length <= charLimit) {
        forcedChunks.push(chunk);
      } else {
        for (let i = 0; i < chunk.length; i += charLimit) {
          forcedChunks.push(chunk.substring(i, i + charLimit));
        }
      }
    }
    
    return forcedChunks;
  }
  
  return chunks;
}

// Sleep function for rate limiting
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Enhanced retry wrapper with better rate limiting
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 2000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: unknown) {
      const isLastAttempt = i === maxRetries - 1;
      const apiError = error as { status?: number; code?: string };
      
      if (apiError?.status === 429) {
        // Rate limit error - wait much longer
        const delay = Math.min(baseDelay * Math.pow(2, i) + Math.random() * 2000, 30000);
        console.log(`Rate limit hit, waiting ${Math.round(delay)}ms before retry ${i + 1}/${maxRetries}`);
        
        if (!isLastAttempt) {
          await sleep(delay);
          continue;
        }
      } else if (apiError?.status === 400 && apiError?.code === 'context_length_exceeded') {
        // Context length error - this should be handled by chunking, so don't retry
        throw new Error('Document too large even after chunking. Please use a shorter document.');
      }
      
      if (isLastAttempt) {
        throw error;
      }
      
      // General retry with moderate delay
      await sleep(baseDelay * (i + 1));
    }
  }
  
  throw new Error('Max retries exceeded');
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

  // Estimate tokens for the complete prompt
  const basePrompt = `${prompt}\n\n${memo ? `MARKING MEMO/RUBRIC:\n${memo}\n\n` : ''}Student: ${studentName || 'Unknown'}\nAssignment: ${assignmentTitle || 'Unknown'}\n\nDocument to mark:\n`;
  const baseTokens = estimateTokens(systemPrompt + basePrompt);
  const maxContentTokens = 8000 - baseTokens; // Conservative limit for GPT-3.5-turbo
  
  // Check if document needs chunking
  const documentTokens = estimateTokens(documentContent);
  
  if (documentTokens <= maxContentTokens) {
    // Document fits in one request
    console.log(`Document fits in one request (${documentTokens} tokens)`);
    return await markSingleDocument(systemPrompt, basePrompt, documentContent);
  } else {
    // Document needs chunking - but limit the number of chunks
    console.log(`Document too large (${documentTokens} tokens), chunking...`);
    return await markChunkedDocument(systemPrompt, basePrompt, documentContent, maxContentTokens);
  }
}

async function markSingleDocument(
  systemPrompt: string,
  basePrompt: string,
  documentContent: string
): Promise<string> {
  const userPrompt = basePrompt + documentContent;
  
  return await retryWithBackoff(async () => {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 3000,
      temperature: 0.1,
    });

    return completion.choices[0]?.message?.content || 'No response generated';
  });
}

async function markChunkedDocument(
  systemPrompt: string,
  basePrompt: string,
  documentContent: string,
  maxContentTokens: number
): Promise<string> {
  const chunks = chunkDocument(documentContent, maxContentTokens);
  console.log(`Split document into ${chunks.length} chunks`);
  
  // Limit the number of chunks to prevent resource exhaustion
  if (chunks.length > 10) {
    throw new Error(`Document is too large and would require ${chunks.length} chunks. Please use a shorter document or split it manually. Maximum recommended chunks: 10.`);
  }
  
  const chunkResults: string[] = [];
  
  for (let i = 0; i < chunks.length; i++) {
    console.log(`Processing chunk ${i + 1}/${chunks.length}...`);
    
    const chunkPrompt = basePrompt + `[PART ${i + 1} of ${chunks.length}]\n\n${chunks[i]}`;
    
    try {
      const chunkResult = await retryWithBackoff(async () => {
        const completion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: systemPrompt + `\n\nIMPORTANT: This is part ${i + 1} of ${chunks.length} of the document. Provide detailed feedback for this section.` },
            { role: "user", content: chunkPrompt }
          ],
          max_tokens: 2500,
          temperature: 0.1,
        });

        return completion.choices[0]?.message?.content || 'No response generated';
      });
      
      chunkResults.push(`=== SECTION ${i + 1} of ${chunks.length} ===\n${chunkResult}`);
      
      // Longer delay between chunks to prevent rate limiting
      if (i < chunks.length - 1) {
        console.log('Waiting 8 seconds between chunks...');
        await sleep(8000); // 8 second delay between chunks
      }
    } catch (error) {
      console.error(`Error processing chunk ${i + 1}:`, error);
      chunkResults.push(`=== SECTION ${i + 1} of ${chunks.length} ===\nError processing this section: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  // Don't create final summary for chunked documents to avoid additional API calls
  // Instead, just combine the results
  const combinedResults = chunkResults.join('\n\n');
  
  return `${combinedResults}\n\n=== PROCESSING COMPLETE ===\nDocument was processed in ${chunks.length} sections due to size. Each section has been marked individually above.`;
} 