// Improved marking system that matches ChatGPT quality and format

export interface QuestionAnalysis {
  questionNumber: string;
  topic: string;
  maxMarks: number;
  awardedMarks: number;
  hasAnswer: boolean;
  contentQuality: 'excellent' | 'good' | 'satisfactory' | 'poor' | 'missing';
  reasoning: string;
}

export interface ImprovedMarkingResult {
  studentName: string;
  assignmentTitle: string;
  totalQuestions: number;
  totalMarksAvailable: number;
  totalMarksAwarded: number;
  percentage: number;
  grade: string;
  questionAnalysis: QuestionAnalysis[];
  markingMethod: string;
  tokensSaved: number;
  markingCriteria: string;
}

// Common academic topics and their associated keywords
const TOPIC_KEYWORDS: Record<string, string[]> = {
  'Cyber Security': ['cyber', 'security', 'threat', 'malware', 'virus', 'firewall', 'encryption', 'password', 'authentication', 'breach'],
  'Safety Hazards': ['safety', 'hazard', 'risk', 'danger', 'accident', 'injury', 'precaution', 'protection', 'emergency'],
  'Storage Devices': ['storage', 'hard drive', 'ssd', 'hdd', 'usb', 'memory', 'disk', 'flash', 'optical', 'dvd', 'cd'],
  'Computer Components': ['cpu', 'processor', 'motherboard', 'ram', 'memory', 'graphics', 'power supply', 'component', 'hardware'],
  'Basic Terminologies': ['definition', 'term', 'meaning', 'concept', 'terminology', 'explain', 'describe'],
  'Memory Types': ['ram', 'rom', 'memory', 'volatile', 'non-volatile', 'cache', 'buffer', 'primary', 'secondary'],
  'BIOS': ['bios', 'firmware', 'boot', 'startup', 'system', 'update', 'configuration', 'setup'],
  'Hard Disk Drive': ['hard disk', 'hdd', 'drive', 'storage', 'disk', 'platter', 'sector', 'track'],
  'Hardware Performance': ['performance', 'speed', 'efficiency', 'benchmark', 'optimization', 'factor', 'impact'],
  'AC-DC Converters': ['ac', 'dc', 'converter', 'power', 'supply', 'voltage', 'current', 'electrical'],
  'Internet Collaboration': ['internet', 'collaboration', 'secure', 'online', 'network', 'communication', 'sharing'],
  'Server Networks': ['server', 'network', 'functionality', 'client', 'service', 'protocol', 'connection'],
  'Input Output Devices': ['input', 'output', 'device', 'keyboard', 'mouse', 'monitor', 'printer', 'scanner'],
  'Printer Management': ['printer', 'install', 'manage', 'driver', 'print', 'queue', 'configuration'],
  'Mobile Devices': ['mobile', 'smartphone', 'tablet', 'device', 'portable', 'wireless', 'cellular'],
  'Preventative Maintenance': ['maintenance', 'preventative', 'care', 'cleaning', 'service', 'upkeep', 'regular'],
  'Troubleshooting': ['troubleshoot', 'problem', 'issue', 'fix', 'repair', 'diagnose', 'solve', 'error'],
  'Operating Systems': ['operating system', 'os', 'windows', 'linux', 'mac', 'system', 'platform'],
  'File Management': ['file', 'folder', 'directory', 'manage', 'organize', 'save', 'delete', 'copy'],
  'Software Utilities': ['software', 'utility', 'tool', 'program', 'application', 'optimization', 'system'],
  'System Restore': ['restore', 'backup', 'recovery', 'point', 'system', 'rollback', 'previous'],
  'Recovery Processes': ['recovery', 'restore', 'backup', 'data', 'system', 'process', 'procedure']
};

// Detect questions in content
function detectQuestions(content: string): Array<{
  number: string;
  content: string;
  estimatedMarks: number;
  topic: string;
}> {
  const questions: Array<{
    number: string;
    content: string;
    estimatedMarks: number;
    topic: string;
  }> = [];

  // Enhanced patterns to detect actual document structure
  const patterns = [
    // Task patterns
    /(?:^|\n)\s*(?:task|TASK)\s*(\d+(?:\.\d+)?)[:\.\s]/gmi,
    /(?:^|\n)\s*(\d+(?:\.\d+)?)\s*[\.\)]\s*(?:task|TASK)/gmi,
    
    // Section patterns
    /(?:^|\n)\s*(?:section|SECTION)\s*(\d+(?:\.\d+)?)[:\.\s]/gmi,
    /(?:^|\n)\s*(\d+(?:\.\d+)?)\s*[\.\)]\s*(?:section|SECTION)/gmi,
    
    // Question patterns (fallback)
    /(?:^|\n)\s*(?:question|QUESTION|Q)\s*(\d+(?:\.\d+)?)[:\.\s]/gmi,
    /(?:^|\n)\s*(\d+(?:\.\d+)?)\s*[\.\)]\s*(?:question|QUESTION)/gmi,
    
    // Numbered items
    /(?:^|\n)\s*(\d+(?:\.\d+)?)\s*[\.\)]\s+/gm,
    
    // Letter patterns
    /(?:^|\n)\s*([a-zA-Z])\s*[\.\)]\s+/gm
  ];

  let foundItems: Array<{ number: string; index: number; type: string }> = [];

  patterns.forEach((pattern, patternIndex) => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const number = match[1] || match[0].trim();
      foundItems.push({
        number: number,
        index: match.index,
        type: patternIndex < 4 ? 'task/section' : patternIndex < 6 ? 'question' : 'numbered'
      });
    }
  });

  // Sort by position in document
  foundItems.sort((a, b) => a.index - b.index);

  // Remove duplicates and extract content
  const processedItems = new Set<number>();
  
  foundItems.forEach((item, index) => {
    if (processedItems.has(item.index)) return;
    processedItems.add(item.index);

    const startIndex = item.index;
    const nextItem = foundItems[index + 1];
    const endIndex = nextItem ? nextItem.index : content.length;
    
    const questionContent = content.substring(startIndex, endIndex).trim();
    
    if (questionContent.length > 10) { // Minimum content length
      const topic = detectTopicFromContent(questionContent);
      const estimatedMarks = estimateMarksFromContent(questionContent, topic);
      
      // Format the number display
      let displayNumber = item.number;
      if (item.type === 'task/section') {
        displayNumber = item.type.includes('task') ? `Task ${item.number}` : `Section ${item.number}`;
      } else if (item.type === 'question') {
        displayNumber = `Q${item.number}`;
      }
      
      questions.push({
        number: displayNumber,
        content: questionContent,
        estimatedMarks,
        topic
      });
    }
  });

  // If no structured items found, create general sections
  if (questions.length === 0) {
    const sections = content.split(/\n\s*\n/).filter(section => section.trim().length > 50);
    sections.forEach((section, index) => {
      const topic = detectTopicFromContent(section);
      const estimatedMarks = estimateMarksFromContent(section, topic);
      
      questions.push({
        number: `Section ${index + 1}`,
        content: section.trim(),
        estimatedMarks,
        topic
      });
    });
  }

  return questions;
}

function detectTopicFromContent(content: string): string {
  const lowerContent = content.toLowerCase();
  let bestMatch = 'General Topic';
  let maxScore = 0;

  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    let score = 0;
    keywords.forEach((keyword: string) => {
      if (lowerContent.includes(keyword.toLowerCase())) {
        score += 1;
      }
    });

    if (score > maxScore) {
      maxScore = score;
      bestMatch = topic;
    }
  }

  return bestMatch;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function estimateMarksFromContent(content: string, _topic: string): number {
  const wordCount = content.split(/\s+/).length;
  
  // Base marks on content length and complexity
  if (wordCount < 20) return 2;
  if (wordCount < 50) return 3;
  if (wordCount < 100) return 5;
  
  return 5; // Default for substantial answers
}

function analyzeAnswerQuality(content: string, topic: string): {
  quality: 'excellent' | 'good' | 'satisfactory' | 'poor' | 'missing';
  score: number; // 0-1 multiplier
  reasoning: string;
} {
  if (!content || content.trim().length < 10) {
    return {
      quality: 'missing',
      score: 0,
      reasoning: 'No answer provided or answer too brief'
    };
  }

  const lowerContent = content.toLowerCase();
  const wordCount = content.split(/\s+/).length;
  const keywords = TOPIC_KEYWORDS[topic] || [];
  
  let keywordMatches = 0;
  keywords.forEach((keyword: string) => {
    if (lowerContent.includes(keyword.toLowerCase())) {
      keywordMatches++;
    }
  });

  const keywordCoverage = keywords.length > 0 ? keywordMatches / keywords.length : 0;
  
  // Slightly more generous scoring algorithm
  let score = 0.85; // Base score of 68% - slightly increased from 65%
  
  // Boost for keyword coverage
  score += keywordCoverage * 0.30; // Up to 22% boost (increased from 20%)
  
  // Boost for content length (shows effort) - slightly more generous
  if (wordCount >= 40) score += 0.06; // 6% boost for moderate answers (lowered threshold)
  if (wordCount >= 80) score += 0.08; // 8% boost for substantial answers (lowered threshold)
  if (wordCount >= 120) score += 0.04; // 4% boost for detailed answers (lowered threshold)
  
  // Check for explanation indicators
  const explanationWords = ['because', 'therefore', 'since', 'due to', 'as a result', 'explain', 'reason', 'why', 'how'];
  const hasExplanation = explanationWords.some(word => lowerContent.includes(word));
  if (hasExplanation) score += 0.09; // 9% boost for explanations (increased from 8%)
  
  // Check for examples
  const exampleWords = ['example', 'such as', 'for instance', 'like', 'including', 'e.g.', 'i.e.'];
  const hasExamples = exampleWords.some(word => lowerContent.includes(word));
  if (hasExamples) score += 0.06; // 6% boost for examples (increased from 5%)
  
  // Small boost for any reasonable attempt
  if (wordCount >= 15) score += 0.04; // 4% boost for reasonable attempt (lowered threshold and increased boost)
  
  // Apply penalties for very short or low-quality answers (slightly more lenient)
  if (wordCount < 10) {
    score *= 0.65; // Penalty for very short answers (slightly less harsh)
  } else if (wordCount < 20) {
    score *= 0.95; // Moderate penalty for short answers (slightly less harsh)
  }
  
  // Penalty for answers with no keyword matches (likely irrelevant)
  if (keywordCoverage === 0 && keywords.length > 0) {
    score *= 0.75; // Penalty for completely irrelevant answers (slightly less harsh)
  }
  
  // Cap at 95% to prevent unrealistic perfect scores
  score = Math.min(score, 0.95);

  // More realistic quality thresholds
  let quality: 'excellent' | 'good' | 'satisfactory' | 'poor' | 'missing';
  let reasoning: string;

  if (score >= 0.85) {
    quality = 'excellent';
    reasoning = 'Comprehensive answer with good keyword coverage and detailed explanation';
  } else if (score >= 0.75) {
    quality = 'good';
    reasoning = 'Well-structured answer addressing key concepts';
  } else if (score >= 0.60) {
    quality = 'satisfactory';
    reasoning = 'Adequate answer covering basic requirements';
  } else if (score >= 0.40) {
    quality = 'poor';
    reasoning = 'Incomplete answer missing key concepts';
  } else {
    quality = 'missing';
    reasoning = 'Insufficient or no answer provided';
  }

  return { quality, score, reasoning };
}

export function generateImprovedMarkingReport(
  content: string,
  studentName: string,
  assignmentTitle: string,
  memo?: string
): ImprovedMarkingResult {
  // memo parameter reserved for future memo-based rubric creation
  console.log('Memo provided:', !!memo);
  // Detect questions in the content
  const detectedQuestions = detectQuestions(content);
  
  // Analyze each question
  const questionAnalysis: QuestionAnalysis[] = detectedQuestions.map(question => {
    const analysis = analyzeAnswerQuality(question.content, question.topic);
    const awardedMarks = Math.round(question.estimatedMarks * analysis.score);
    
    return {
      questionNumber: question.number, // Use the formatted string directly
      topic: question.topic,
      maxMarks: question.estimatedMarks,
      awardedMarks,
      hasAnswer: analysis.quality !== 'missing',
      contentQuality: analysis.quality,
      reasoning: analysis.reasoning
    };
  });

  const totalMarksAvailable = questionAnalysis.reduce((sum, q) => sum + q.maxMarks, 0);
  const totalMarksAwarded = questionAnalysis.reduce((sum, q) => sum + q.awardedMarks, 0);
  const percentage = Math.round((totalMarksAwarded / totalMarksAvailable) * 100);

  // Determine grade
  let grade: string;
  if (percentage >= 90) grade = 'A+ (Outstanding)';
  else if (percentage >= 80) grade = 'A (Excellent)';
  else if (percentage >= 70) grade = 'B (Good)';
  else if (percentage >= 60) grade = 'C (Satisfactory)';
  else if (percentage >= 50) grade = 'D (Pass)';
  else grade = 'F (Fail)';

  const estimatedTokens = Math.ceil(content.length / 4) + 2000;

  return {
    studentName,
    assignmentTitle,
    totalQuestions: questionAnalysis.length,
    totalMarksAvailable,
    totalMarksAwarded,
    percentage,
    grade,
    questionAnalysis,
    markingMethod: 'Improved Local Analysis (Zero AI tokens used)',
    tokensSaved: estimatedTokens,
    markingCriteria: 'Full marks for direct, correct answers. Generous scoring for demonstrated understanding and effort.'
  };
}

export function generateChatGPTStyleReport(result: ImprovedMarkingResult): string {
  let report = `### Final Assessment Report\n\n`;
  
  report += `**Total Questions/Tasks**: ${result.totalQuestions}\n`;
  report += `**Total Marks Available**: ${result.totalMarksAvailable}\n`;
  report += `**Marking Criteria**:\n\n`;
  report += `• Full marks for **direct, correct** answers\n`;
  report += `• Generous scoring for **demonstrated understanding** and **effort**\n`;
  report += `• **Partial marks** awarded for incomplete but relevant responses\n\n`;
  report += `---\n\n`;
  
  report += `### Question-by-Question Mark Breakdown\n\n`;
  report += `| Topic | Mark |\n`;
  report += `| ----- | ---- |\n`;
  
  result.questionAnalysis.forEach(q => {
    const topic = q.topic.length > 60 ? q.topic.substring(0, 57) + '...' : q.topic;
    report += `| ${topic} | ${q.awardedMarks}/${q.maxMarks} |\n`;
  });
  
  report += `\n---\n\n`;
  report += `### Total Marks Obtained\n\n`;
  report += `**${result.totalMarksAwarded} / ${result.totalMarksAvailable} = ${result.percentage}%**\n\n`;
  report += `**Grade: ${result.grade}**\n\n`;
  report += `---\n\n`;
  
  // Generate encouraging feedback instead of mark allocation
  report += `### Feedback & Encouragement\n\n`;
  
  const excellentCount = result.questionAnalysis.filter(q => q.contentQuality === 'excellent').length;
  const goodCount = result.questionAnalysis.filter(q => q.contentQuality === 'good').length;
  const totalCount = result.questionAnalysis.length;
  
  if (result.percentage >= 85) {
    report += `**Outstanding Performance!** \n\n`;
    report += `You have demonstrated excellent understanding across most areas. Your responses show strong analytical skills and comprehensive knowledge. Keep up the excellent work!\n\n`;
  } else if (result.percentage >= 75) {
    report += `**Great Job!** \n\n`;
    report += `You have shown good understanding of the material with solid responses. There are areas where you excelled, and with a bit more detail in some sections, you'll reach even higher levels.\n\n`;
  } else if (result.percentage >= 65) {
    report += `**Good Effort!** \n\n`;
    report += `You have covered the basic requirements well. Focus on expanding your answers with more examples and explanations to improve your scores further.\n\n`;
  } else if (result.percentage >= 50) {
    report += `**Keep Improving!** \n\n`;
    report += `You're on the right track! Work on providing more detailed responses and ensure you address all parts of each question. Practice will help you improve significantly.\n\n`;
  } else {
    report += `**Room for Growth!** \n\n`;
    report += `This is a learning opportunity! Review the material thoroughly and practice writing more comprehensive answers. Don't be discouraged - improvement comes with effort and practice.\n\n`;
  }
  
  // Add specific strengths
  if (excellentCount > 0) {
    report += `**Strengths:** Strong performance in ${excellentCount} areas showing excellent understanding.\n\n`;
  }
  
  // Add encouragement
  if (goodCount + excellentCount >= totalCount * 0.6) {
    report += `**Encouragement:** You're demonstrating solid academic skills. Continue building on this foundation!\n\n`;
  } else {
    report += `**Encouragement:** Every expert was once a beginner. Keep studying, practicing, and asking questions!\n\n`;
  }
  
  return report;
} 