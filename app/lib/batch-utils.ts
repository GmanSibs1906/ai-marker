// Batch processing utilities for managing browser resources
import { getDocumentSizeCategory } from './document-utils';

export interface BatchRecommendation {
  recommendedBatchSize: number;
  totalBatches: number;
  riskLevel: 'low' | 'medium' | 'high';
  reason: string;
  estimatedTimePerBatch: string;
}

export function getBatchRecommendation(files: { extractedText: string }[]): BatchRecommendation {
  if (files.length === 0) {
    return {
      recommendedBatchSize: 0,
      totalBatches: 0,
      riskLevel: 'low',
      reason: 'No files to process',
      estimatedTimePerBatch: '0 minutes'
    };
  }

  // Analyze document complexity
  let veryLargeCount = 0;
  let largeCount = 0;
  let tooLargeCount = 0;
  let totalChunks = 0;
  let maxChunksPerDoc = 0;

  for (const file of files) {
    const sizeInfo = getDocumentSizeCategory(file.extractedText);
    
    if (sizeInfo.category === 'too-large') {
      tooLargeCount++;
    } else if (sizeInfo.category === 'very-large') {
      veryLargeCount++;
      totalChunks += sizeInfo.estimatedChunks;
      maxChunksPerDoc = Math.max(maxChunksPerDoc, sizeInfo.estimatedChunks);
    } else if (sizeInfo.category === 'large') {
      largeCount++;
      totalChunks += sizeInfo.estimatedChunks;
      maxChunksPerDoc = Math.max(maxChunksPerDoc, sizeInfo.estimatedChunks);
    } else {
      totalChunks += 1; // Small/medium docs count as 1 chunk
    }
  }

  // Handle documents that are too large
  if (tooLargeCount > 0) {
    return {
      recommendedBatchSize: 0,
      totalBatches: 0,
      riskLevel: 'high',
      reason: `${tooLargeCount} document(s) exceed maximum size (30,000 tokens). Please split or shorten these documents.`,
      estimatedTimePerBatch: 'Cannot process'
    };
  }

  // Determine batch size based on document complexity
  let recommendedBatchSize: number;
  let riskLevel: 'low' | 'medium' | 'high';
  let reason: string;

  if (maxChunksPerDoc > 10) {
    // Documents that would create more than 10 chunks
    recommendedBatchSize = 1;
    riskLevel = 'high';
    reason = `Some documents are extremely large (${maxChunksPerDoc} chunks). Process one at a time to avoid resource exhaustion.`;
  } else if (veryLargeCount > 0) {
    // Has very large documents
    if (veryLargeCount >= 3) {
      recommendedBatchSize = 2;
      riskLevel = 'high';
      reason = `${veryLargeCount} very large documents detected. Process 2 at a time to prevent rate limiting.`;
    } else {
      recommendedBatchSize = 3;
      riskLevel = 'medium';
      reason = `${veryLargeCount} very large document(s) detected. Process 3 at a time for optimal performance.`;
    }
  } else if (largeCount > 0) {
    // Has large documents that will be chunked
    if (totalChunks > 30) {
      recommendedBatchSize = 3;
      riskLevel = 'medium';
      reason = `${largeCount} large document(s) will be chunked. Process 3 at a time to manage API load.`;
    } else {
      recommendedBatchSize = 5;
      riskLevel = 'low';
      reason = `${largeCount} large document(s) detected. Process 5 at a time for good performance.`;
    }
  } else if (files.length > 20) {
    // Many small/medium files
    recommendedBatchSize = 10;
    riskLevel = 'medium';
    reason = `Large number of files (${files.length}). Process 10 at a time to avoid overwhelming the system.`;
  } else if (files.length > 10) {
    // Moderate number of files
    recommendedBatchSize = 8;
    riskLevel = 'low';
    reason = `Moderate batch size (${files.length} files). Process 8 at a time for optimal speed.`;
  } else {
    // Small batch
    recommendedBatchSize = files.length;
    riskLevel = 'low';
    reason = `Small batch size (${files.length} files). Can process all at once.`;
  }

  const totalBatches = Math.ceil(files.length / recommendedBatchSize);
  
  // Estimate time per batch
  let avgTimePerFile = 1; // Base time for small/medium files
  if (veryLargeCount > 0) {
    avgTimePerFile = 8; // Very large files take much longer
  } else if (largeCount > 0) {
    avgTimePerFile = 4; // Large files take longer
  }
  
  const estimatedTimePerBatch = `${Math.ceil(avgTimePerFile * recommendedBatchSize)} minutes`;

  return {
    recommendedBatchSize,
    totalBatches,
    riskLevel,
    reason,
    estimatedTimePerBatch
  };
}

export function splitIntoBatches<T>(items: T[], batchSize: number): T[][] {
  const batches: T[][] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  
  return batches;
}

export function getEstimatedProcessingTime(files: { extractedText?: string }[], batchSize?: number): {
  totalMinutes: number;
  perBatchMinutes: number;
  description: string;
} {
  const totalTokens = files.reduce((sum, file) => {
    return sum + Math.ceil((file.extractedText?.length || 0) / 4);
  }, 0);
  
  const avgTokensPerFile = totalTokens / files.length;
  const actualBatchSize = batchSize || files.length;
  
  // Time estimates based on document complexity
  let timePerFile = 10; // Base time in seconds
  
  if (avgTokensPerFile > 15000) {
    timePerFile = 60; // Very large documents with chunking
  } else if (avgTokensPerFile > 8000) {
    timePerFile = 30; // Large documents
  } else if (avgTokensPerFile > 3000) {
    timePerFile = 15; // Medium documents
  }
  
  // Add delays between requests (5 seconds each)
  const delayTime = Math.max(0, actualBatchSize - 1) * 5;
  const totalSecondsPerBatch = (timePerFile * actualBatchSize) + delayTime;
  const perBatchMinutes = Math.ceil(totalSecondsPerBatch / 60);
  
  const totalBatches = Math.ceil(files.length / actualBatchSize);
  const totalMinutes = perBatchMinutes * totalBatches;
  
  let description: string;
  if (totalMinutes < 2) {
    description = 'Very fast processing';
  } else if (totalMinutes < 5) {
    description = 'Quick processing';
  } else if (totalMinutes < 15) {
    description = 'Moderate processing time';
  } else if (totalMinutes < 30) {
    description = 'Longer processing time';
  } else {
    description = 'Extended processing time - consider smaller batches';
  }
  
  return {
    totalMinutes,
    perBatchMinutes,
    description
  };
} 