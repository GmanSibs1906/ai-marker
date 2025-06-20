// Document processing utilities

// Document analysis utilities

export interface DocumentSizeInfo {
  category: 'small' | 'medium' | 'large' | 'very-large' | 'too-large';
  description: string;
  willChunk: boolean;
  estimatedTokens: number;
  estimatedChunks: number;
  processingTime: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

// Token estimation function (rough approximation: 1 token ≈ 4 characters)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Estimate number of chunks a document would be split into
function estimateChunks(tokens: number, maxTokensPerChunk: number = 6000): number {
  if (tokens <= maxTokensPerChunk) return 1;
  return Math.ceil(tokens / maxTokensPerChunk);
}

// Check if document is likely to be chunked
export function willDocumentBeChunked(text: string, hasPrompt: boolean = true, hasMemo: boolean = false): boolean {
  const baseTokens = hasPrompt ? 500 : 0; // Rough estimate for prompt
  const memoTokens = hasMemo ? 1000 : 0; // Rough estimate for memo
  const maxContentTokens = 12000 - baseTokens - memoTokens;
  
  return estimateTokens(text) > maxContentTokens;
}

// Get document size category
export function getDocumentSizeCategory(content: string): DocumentSizeInfo {
  const tokens = estimateTokens(content);
  const chunks = estimateChunks(tokens);
  
  if (tokens <= 3000) {
    return {
      category: 'small',
      description: 'Small document',
      willChunk: false,
      estimatedTokens: tokens,
      estimatedChunks: 1,
      processingTime: '30-60 seconds',
      riskLevel: 'low'
    };
  } else if (tokens <= 6000) {
    return {
      category: 'medium',
      description: 'Medium document',
      willChunk: false,
      estimatedTokens: tokens,
      estimatedChunks: 1,
      processingTime: '1-2 minutes',
      riskLevel: 'low'
    };
  } else if (tokens <= 12000) {
    return {
      category: 'large',
      description: 'Large document',
      willChunk: true,
      estimatedTokens: tokens,
      estimatedChunks: chunks,
      processingTime: `${chunks * 2}-${chunks * 3} minutes`,
      riskLevel: 'medium'
    };
  } else if (tokens <= 30000) {
    return {
      category: 'very-large',
      description: 'Very large document',
      willChunk: true,
      estimatedTokens: tokens,
      estimatedChunks: chunks,
      processingTime: `${chunks * 2}-${chunks * 4} minutes`,
      riskLevel: 'high'
    };
  } else {
    return {
      category: 'too-large',
      description: 'Document too large',
      willChunk: false,
      estimatedTokens: tokens,
      estimatedChunks: chunks,
      processingTime: 'Will fail',
      riskLevel: 'critical'
    };
  }
}

// Format file size for display
export function formatFileSize(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

// Get processing time estimate
export function getProcessingTimeEstimate(files: { extractedText: string }[]): string {
  if (files.length === 0) return '0 minutes';
  
  let totalMinutes = 0;
  let hasLargeFiles = false;
  
  for (const file of files) {
    const sizeInfo = getDocumentSizeCategory(file.extractedText);
    
    if (sizeInfo.category === 'too-large') {
      return 'Cannot process - documents too large';
    }
    
    // Estimate processing time based on chunks
    if (sizeInfo.willChunk) {
      hasLargeFiles = true;
      totalMinutes += sizeInfo.estimatedChunks * 2; // 2 minutes per chunk
    } else {
      totalMinutes += 1; // 1 minute for small/medium files
    }
  }
  
  // Add buffer time for delays between files
  const bufferMinutes = files.length * 0.2; // 12 seconds per file
  totalMinutes += bufferMinutes;
  
  if (hasLargeFiles) {
    return `${Math.ceil(totalMinutes)}-${Math.ceil(totalMinutes * 1.5)} minutes (includes chunked processing)`;
  }
  
  return `${Math.ceil(totalMinutes)} minutes`;
}

export function validateDocumentBatch(files: { extractedText: string }[]): {
  isValid: boolean;
  issues: string[];
  recommendations: string[];
} {
  const issues: string[] = [];
  const recommendations: string[] = [];
  
  let tooLargeCount = 0;
  let veryLargeCount = 0;
  let totalChunks = 0;
  
  for (const file of files) {
    const sizeInfo = getDocumentSizeCategory(file.extractedText);
    
    if (sizeInfo.category === 'too-large') {
      tooLargeCount++;
      issues.push(`Document with ${sizeInfo.estimatedTokens} tokens exceeds maximum size`);
    } else if (sizeInfo.category === 'very-large') {
      veryLargeCount++;
      totalChunks += sizeInfo.estimatedChunks;
    } else if (sizeInfo.willChunk) {
      totalChunks += sizeInfo.estimatedChunks;
    }
  }
  
  // Check for critical issues
  if (tooLargeCount > 0) {
    issues.push(`${tooLargeCount} document(s) are too large to process`);
    recommendations.push('Split large documents or use shorter excerpts');
  }
  
  // Check total chunk load
  if (totalChunks > 50) {
    issues.push(`Total chunks (${totalChunks}) may cause resource exhaustion`);
    recommendations.push('Process fewer files at once or use smaller documents');
  }
  
  // Check batch size with large files
  if (veryLargeCount > 3) {
    issues.push(`Too many very large documents (${veryLargeCount})`);
    recommendations.push('Process maximum 3 very large documents at once');
  }
  
  if (files.length > 20 && totalChunks > 20) {
    issues.push('Large batch with complex documents may hit rate limits');
    recommendations.push('Split into smaller batches of 5-10 files');
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    recommendations
  };
} 