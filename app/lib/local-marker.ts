// Local rule-based marking system to minimize OpenAI token usage

export interface LocalMarkingResult {
  markingContent: string;
  totalMarks?: number;
  percentage?: number;
  tokensSaved: number;
  method: 'local' | 'hybrid' | 'ai-minimal';
}

export interface MarkingCriteria {
  keywords: string[];
  requiredConcepts: string[];
  maxMarks: number;
  weight: number;
}

export interface AssessmentRubric {
  sections: {
    name: string;
    criteria: MarkingCriteria[];
    totalMarks: number;
  }[];
  totalMarks: number;
}

// Pre-defined rubrics for common assessment types
export const DEFAULT_RUBRICS: Record<string, AssessmentRubric> = {
  'programming': {
    sections: [
      {
        name: 'Code Functionality',
        totalMarks: 40,
        criteria: [
          {
            keywords: ['function', 'method', 'class', 'algorithm', 'logic', 'works', 'runs', 'executes'],
            requiredConcepts: ['implementation', 'functionality'],
            maxMarks: 20,
            weight: 1.0
          },
          {
            keywords: ['error', 'bug', 'exception', 'debug', 'fix', 'correct'],
            requiredConcepts: ['error handling'],
            maxMarks: 10,
            weight: 0.5
          },
          {
            keywords: ['test', 'validate', 'check', 'verify', 'assert'],
            requiredConcepts: ['testing'],
            maxMarks: 10,
            weight: 0.5
          }
        ]
      },
      {
        name: 'Code Quality',
        totalMarks: 30,
        criteria: [
          {
            keywords: ['comment', 'documentation', 'explain', 'describe', 'readable'],
            requiredConcepts: ['documentation'],
            maxMarks: 15,
            weight: 1.0
          },
          {
            keywords: ['structure', 'organize', 'clean', 'format', 'style'],
            requiredConcepts: ['code structure'],
            maxMarks: 15,
            weight: 1.0
          }
        ]
      },
      {
        name: 'Understanding',
        totalMarks: 30,
        criteria: [
          {
            keywords: ['explain', 'analyze', 'discuss', 'evaluate', 'compare'],
            requiredConcepts: ['analysis'],
            maxMarks: 20,
            weight: 1.0
          },
          {
            keywords: ['example', 'demonstrate', 'show', 'illustrate'],
            requiredConcepts: ['examples'],
            maxMarks: 10,
            weight: 0.5
          }
        ]
      }
    ],
    totalMarks: 100
  },
  'essay': {
    sections: [
      {
        name: 'Content & Analysis',
        totalMarks: 50,
        criteria: [
          {
            keywords: ['analyze', 'discuss', 'evaluate', 'explain', 'argue', 'evidence'],
            requiredConcepts: ['analysis', 'critical thinking'],
            maxMarks: 30,
            weight: 1.0
          },
          {
            keywords: ['example', 'case study', 'evidence', 'support', 'cite'],
            requiredConcepts: ['supporting evidence'],
            maxMarks: 20,
            weight: 1.0
          }
        ]
      },
      {
        name: 'Structure & Organization',
        totalMarks: 25,
        criteria: [
          {
            keywords: ['introduction', 'conclusion', 'paragraph', 'structure', 'flow'],
            requiredConcepts: ['essay structure'],
            maxMarks: 15,
            weight: 1.0
          },
          {
            keywords: ['transition', 'connect', 'logical', 'coherent', 'sequence'],
            requiredConcepts: ['logical flow'],
            maxMarks: 10,
            weight: 1.0
          }
        ]
      },
      {
        name: 'Language & Expression',
        totalMarks: 25,
        criteria: [
          {
            keywords: ['grammar', 'spelling', 'punctuation', 'syntax', 'correct'],
            requiredConcepts: ['language mechanics'],
            maxMarks: 15,
            weight: 1.0
          },
          {
            keywords: ['clear', 'concise', 'appropriate', 'vocabulary', 'style'],
            requiredConcepts: ['writing style'],
            maxMarks: 10,
            weight: 1.0
          }
        ]
      }
    ],
    totalMarks: 100
  },
  'mathematics': {
    sections: [
      {
        name: 'Problem Solving',
        totalMarks: 60,
        criteria: [
          {
            keywords: ['solve', 'calculate', 'compute', 'find', 'determine'],
            requiredConcepts: ['problem solving'],
            maxMarks: 30,
            weight: 1.0
          },
          {
            keywords: ['method', 'approach', 'strategy', 'technique', 'formula'],
            requiredConcepts: ['methodology'],
            maxMarks: 20,
            weight: 1.0
          },
          {
            keywords: ['correct', 'accurate', 'right', 'answer', 'solution'],
            requiredConcepts: ['accuracy'],
            maxMarks: 10,
            weight: 1.0
          }
        ]
      },
      {
        name: 'Working & Explanation',
        totalMarks: 40,
        criteria: [
          {
            keywords: ['show', 'working', 'steps', 'process', 'explain'],
            requiredConcepts: ['working shown'],
            maxMarks: 25,
            weight: 1.0
          },
          {
            keywords: ['reason', 'justify', 'explain', 'because', 'therefore'],
            requiredConcepts: ['reasoning'],
            maxMarks: 15,
            weight: 1.0
          }
        ]
      }
    ],
    totalMarks: 100
  }
};

// Analyze document content locally without AI
export function analyzeDocumentLocally(content: string, rubric: AssessmentRubric): {
  sectionScores: Array<{
    name: string;
    score: number;
    maxScore: number;
    feedback: string[];
  }>;
  totalScore: number;
  maxTotalScore: number;
} {
  const sectionScores = rubric.sections.map(section => {
    let sectionScore = 0;
    const feedback: string[] = [];
    
    section.criteria.forEach(criteria => {
      let criteriaScore = 0;
      const foundKeywords: string[] = [];
      const foundConcepts: string[] = [];
      
      // Check for keywords (case-insensitive)
      const lowerContent = content.toLowerCase();
      criteria.keywords.forEach(keyword => {
        if (lowerContent.includes(keyword.toLowerCase())) {
          foundKeywords.push(keyword);
        }
      });
      
      // Check for required concepts
      criteria.requiredConcepts.forEach(concept => {
        if (lowerContent.includes(concept.toLowerCase())) {
          foundConcepts.push(concept);
        }
      });
      
      // Calculate score based on keyword density and concept coverage
      const keywordDensity = foundKeywords.length / criteria.keywords.length;
      const conceptCoverage = foundConcepts.length / criteria.requiredConcepts.length;
      
      // Score calculation: weighted average of keyword density and concept coverage
      const rawScore = (keywordDensity * 0.6 + conceptCoverage * 0.4) * criteria.maxMarks * criteria.weight;
      criteriaScore = Math.min(rawScore, criteria.maxMarks);
      
      sectionScore += criteriaScore;
      
      // Generate feedback
      if (foundKeywords.length > 0) {
        feedback.push(`✓ Good coverage of: ${foundKeywords.join(', ')}`);
      }
      if (foundConcepts.length > 0) {
        feedback.push(`✓ Demonstrates understanding of: ${foundConcepts.join(', ')}`);
      }
      if (keywordDensity < 0.3) {
        feedback.push(`⚠ Could improve coverage of: ${criteria.keywords.slice(0, 3).join(', ')}`);
      }
    });
    
    return {
      name: section.name,
      score: Math.min(sectionScore, section.totalMarks),
      maxScore: section.totalMarks,
      feedback
    };
  });
  
  const totalScore = sectionScores.reduce((sum, section) => sum + section.score, 0);
  
  return {
    sectionScores,
    totalScore,
    maxTotalScore: rubric.totalMarks
  };
}

// Detect assessment type from content
export function detectAssessmentType(content: string): string {
  const lowerContent = content.toLowerCase();
  
  if (lowerContent.includes('code') || lowerContent.includes('program') || lowerContent.includes('function') || lowerContent.includes('algorithm')) {
    return 'programming';
  }
  
  if (lowerContent.includes('essay') || lowerContent.includes('discuss') || lowerContent.includes('analyze') || lowerContent.includes('argument')) {
    return 'essay';
  }
  
  if (lowerContent.includes('calculate') || lowerContent.includes('solve') || lowerContent.includes('equation') || lowerContent.includes('formula')) {
    return 'mathematics';
  }
  
  // Default to essay for general academic content
  return 'essay';
}

// Generate comprehensive marking report
export function generateLocalMarkingReport(
  content: string,
  studentName: string,
  assignmentTitle: string,
  customRubric?: AssessmentRubric
): LocalMarkingResult {
  // Detect assessment type and get appropriate rubric
  const assessmentType = detectAssessmentType(content);
  const rubric = customRubric || DEFAULT_RUBRICS[assessmentType];
  
  // Analyze document locally
  const analysis = analyzeDocumentLocally(content, rubric);
  
  // Calculate percentage
  const percentage = Math.round((analysis.totalScore / analysis.maxTotalScore) * 100);
  
  // Generate detailed report
  const report = generateDetailedReport(analysis, studentName, assignmentTitle, assessmentType);
  
  // Estimate tokens saved (compared to AI processing)
  const estimatedAITokens = Math.ceil(content.length / 4) + 2000; // Content + prompt tokens
  
  return {
    markingContent: report,
    totalMarks: analysis.totalScore,
    percentage,
    tokensSaved: estimatedAITokens,
    method: 'local'
  };
}

function generateDetailedReport(
  analysis: {
    sectionScores: Array<{
      name: string;
      score: number;
      maxScore: number;
      feedback: string[];
    }>;
    totalScore: number;
    maxTotalScore: number;
  },
  studentName: string,
  assignmentTitle: string,
  assessmentType: string
): string {
  const percentage = Math.round((analysis.totalScore / analysis.maxTotalScore) * 100);
  
  let report = `📊 **AUTOMATED ASSESSMENT REPORT**\n\n`;
  report += `**Student:** ${studentName}\n`;
  report += `**Assignment:** ${assignmentTitle}\n`;
  report += `**Assessment Type:** ${assessmentType.charAt(0).toUpperCase() + assessmentType.slice(1)}\n`;
  report += `**Marking Method:** Local Rule-Based Analysis (Zero AI tokens used)\n\n`;
  
  report += `🎯 **OVERALL SCORE: ${analysis.totalScore.toFixed(1)}/${analysis.maxTotalScore} (${percentage}%)**\n\n`;
  
  // Grade classification
  let grade = '';
  if (percentage >= 90) grade = 'A+ (Outstanding)';
  else if (percentage >= 80) grade = 'A (Excellent)';
  else if (percentage >= 70) grade = 'B (Good)';
  else if (percentage >= 60) grade = 'C (Satisfactory)';
  else if (percentage >= 50) grade = 'D (Pass)';
  else grade = 'F (Fail)';
  
  report += `📈 **Grade:** ${grade}\n\n`;
  
  report += `## 📋 DETAILED SECTION BREAKDOWN\n\n`;
  
  analysis.sectionScores.forEach((section, index) => {
    const sectionPercentage = Math.round((section.score / section.maxScore) * 100);
    report += `### ${index + 1}. ${section.name}\n`;
    report += `**Score:** ${section.score.toFixed(1)}/${section.maxScore} (${sectionPercentage}%)\n\n`;
    
    if (section.feedback.length > 0) {
      report += `**Feedback:**\n`;
      section.feedback.forEach(feedback => {
        report += `- ${feedback}\n`;
      });
      report += `\n`;
    }
  });
  
  // Overall feedback
  report += `## 💬 OVERALL FEEDBACK\n\n`;
  
  if (percentage >= 80) {
    report += `🌟 **Excellent work!** This submission demonstrates strong understanding and good execution across most areas.\n\n`;
  } else if (percentage >= 60) {
    report += `👍 **Good effort!** This submission shows solid understanding with room for improvement in some areas.\n\n`;
  } else {
    report += `📚 **Needs improvement.** This submission would benefit from additional work in several key areas.\n\n`;
  }
  
  // Improvement suggestions
  const weakestSection = analysis.sectionScores.reduce((min, section) => 
    (section.score / section.maxScore) < (min.score / min.maxScore) ? section : min
  );
  
  report += `**Key Areas for Improvement:**\n`;
  report += `- Focus on strengthening "${weakestSection.name}" (${Math.round((weakestSection.score / weakestSection.maxScore) * 100)}%)\n`;
  
  if (percentage < 70) {
    report += `- Review fundamental concepts and requirements\n`;
    report += `- Ensure all sections of the assignment are addressed\n`;
  }
  
  report += `\n---\n`;
  report += `*This assessment was marked using an automated rule-based system that analyzes content for key concepts, keywords, and structural elements. No AI tokens were consumed in this marking process.*\n`;
  
  return report;
}

// Create custom rubric from memo content
export function createRubricFromMemo(memoContent: string): AssessmentRubric | null {
  if (!memoContent || memoContent.length < 100) return null;
  
  const lines = memoContent.split('\n').filter(line => line.trim());
  const sections: AssessmentRubric['sections'] = [];
  let totalMarks = 0;
  
  // Simple parsing for memo structure
  let currentSection: string | null = null;
  let currentCriteria: MarkingCriteria[] = [];
  let sectionMarks = 0;
  
  lines.forEach(line => {
    const trimmed = line.trim();
    
    // Check for section headers (lines with marks)
    const markMatch = trimmed.match(/(\d+)\s*marks?/i);
    if (markMatch) {
      if (currentSection && currentCriteria.length > 0) {
        sections.push({
          name: currentSection,
          criteria: currentCriteria,
          totalMarks: sectionMarks
        });
        totalMarks += sectionMarks;
      }
      
      currentSection = trimmed.replace(/\d+\s*marks?/i, '').trim() || 'Section';
      sectionMarks = parseInt(markMatch[1]);
      currentCriteria = [{
        keywords: extractKeywords(trimmed),
        requiredConcepts: [currentSection.toLowerCase()],
        maxMarks: sectionMarks,
        weight: 1.0
      }];
    }
  });
  
  // Add final section
  if (currentSection && currentCriteria.length > 0) {
    sections.push({
      name: currentSection,
      criteria: currentCriteria,
      totalMarks: sectionMarks
    });
    totalMarks += sectionMarks;
  }
  
  if (sections.length === 0) return null;
  
  return {
    sections,
    totalMarks: totalMarks || 100
  };
}

function extractKeywords(text: string): string[] {
  const commonKeywords = [
    'explain', 'describe', 'analyze', 'discuss', 'evaluate', 'compare',
    'define', 'identify', 'list', 'calculate', 'solve', 'demonstrate',
    'show', 'prove', 'justify', 'argue', 'assess', 'review'
  ];
  
  const textLower = text.toLowerCase();
  return commonKeywords.filter(keyword => textLower.includes(keyword));
} 