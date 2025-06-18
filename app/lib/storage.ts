import { Prompt, Memo } from './types';

// Default prompts from the specification
export const ASSESSMENT_DEFAULT_PROMPT = `Answer Evaluation Guidelines Core Marking Principles

1. Direct Answer Requirement
   * Award marks ONLY for answers that directly address the specific question
   * NO marks for assumptions, hints, or irrelevant information

2. Flexible Correctness
   * Accept answers that are:
      * Correct, even if different from the memo
      * Beyond the memo's content
      * Demonstrating genuine understanding

3. Handling Quantity Requirements
   * If a question specifies a number of points (e.g., "list 3 reasons"):
      * Full marks if student provides the exact number or more
      * Ensure provided points are relevant and correct

4. Memo Interpretation
   * Recognize that memos may not contain ALL possible correct answers
   * If a student's answer is correct but not in the memo, award full marks
   * Prioritize understanding over strict memo adherence

Scoring Framework Total Mark Calculation
* Total Marks: 100%
* For each question:
   * Award full marks for DIRECT, CORRECT answers
   * ZERO marks for irrelevant or incomplete responses
   * Partial answers receive NO marks

Mark Breakdown
1. Per Question Assessment
   * Clearly list marks awarded for each question
   * Provide exact marks (e.g., 5/5, 3/5, 0/5)

2. Total Score Calculation
   * Sum of marks from all questions
   * Final total displayed as a percentage or fraction
   * Example: 75/100 or 75%

Final Assessment Report
1. Question-by-Question Mark Breakdown
2. Total Marks Obtained
3. Brief Explanation of Mark Allocation`;

export const PROJECT_DEFAULT_PROMPT = `Project Evaluation Guidelines

Evaluate the project across multiple dimensions:

1. Frontend Review (30%)
   - Semantic HTML structure
   - CSS organization and best practices
   - Visual design and layout
   - Code quality and maintainability

2. Backend Review (30%) - If applicable
   - API design and implementation
   - Database integration
   - Security considerations
   - Error handling

3. UI/UX Review (20%)
   - User experience and usability
   - Responsive design
   - Accessibility considerations
   - Visual hierarchy and typography

4. Functionality (20%)
   - Core features implementation
   - Bug-free operation
   - Performance optimization
   - Deployment and accessibility

Provide structured feedback with:
- Strengths for each section
- Areas for improvement
- Specific scores out of total marks
- Final grade calculation
- Encouraging and constructive overall feedback
- Actionable recommendations for improvement`;

// Local storage key
const PROMPTS_STORAGE_KEY = 'ai-marker-prompts';

export function getDefaultPrompts(): Prompt[] {
  return [
    {
      id: 'default-assessment',
      name: 'Default Assessment Prompt',
      type: 'assessment',
      content: ASSESSMENT_DEFAULT_PROMPT,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'default-project',
      name: 'Default Project Prompt',
      type: 'project',
      content: PROJECT_DEFAULT_PROMPT,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
}

export function savePrompts(prompts: Prompt[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(PROMPTS_STORAGE_KEY, JSON.stringify(prompts));
  } catch (error) {
    console.error('Error saving prompts:', error);
  }
}

export function loadPrompts(): Prompt[] {
  if (typeof window === 'undefined') {
    return getDefaultPrompts();
  }
  
  try {
    const stored = localStorage.getItem(PROMPTS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.map((p: any) => ({
        ...p,
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt),
      }));
    }
  } catch (error) {
    console.error('Error loading prompts:', error);
  }
  
  // Return default prompts if nothing stored or error
  const defaults = getDefaultPrompts();
  savePrompts(defaults);
  return defaults;
}

export function addPrompt(prompt: Omit<Prompt, 'id' | 'createdAt' | 'updatedAt'>): Prompt {
  const newPrompt: Prompt = {
    ...prompt,
    id: generateId(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  const prompts = loadPrompts();
  prompts.push(newPrompt);
  savePrompts(prompts);
  
  return newPrompt;
}

export function updatePrompt(id: string, updates: Partial<Omit<Prompt, 'id' | 'createdAt'>>): Prompt | null {
  const prompts = loadPrompts();
  const index = prompts.findIndex(p => p.id === id);
  
  if (index === -1) return null;
  
  prompts[index] = {
    ...prompts[index],
    ...updates,
    updatedAt: new Date(),
  };
  
  savePrompts(prompts);
  return prompts[index];
}

export function deletePrompt(id: string): boolean {
  const prompts = loadPrompts();
  const filtered = prompts.filter(p => p.id !== id);
  
  if (filtered.length === prompts.length) return false;
  
  savePrompts(filtered);
  return true;
}

export function getPromptsByType(type: 'assessment' | 'project'): Prompt[] {
  return loadPrompts().filter(p => p.type === type);
}

function generateId(): string {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

// Memo Management
const MEMOS_STORAGE_KEY = 'ai-marker-memos';

export function saveMemos(memos: Memo[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(MEMOS_STORAGE_KEY, JSON.stringify(memos));
  } catch (error) {
    console.error('Error saving memos:', error);
  }
}

export function loadMemos(): Memo[] {
  // Check if we're in the browser (not SSR)
  if (typeof window === 'undefined') {
    return [];
  }
  
  try {
    const stored = localStorage.getItem(MEMOS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.map((m: any) => ({
        ...m,
        uploadedAt: new Date(m.uploadedAt),
      }));
    }
  } catch (error) {
    console.error('Error loading memos:', error);
  }
  return [];
}

export function addMemo(memo: Omit<Memo, 'id' | 'uploadedAt'>): Memo {
  const newMemo: Memo = {
    ...memo,
    id: generateId(),
    uploadedAt: new Date(),
  };
  
  const memos = loadMemos();
  memos.push(newMemo);
  saveMemos(memos);
  
  return newMemo;
}

export function deleteMemo(id: string): boolean {
  const memos = loadMemos();
  const filtered = memos.filter(m => m.id !== id);
  
  if (filtered.length === memos.length) return false;
  
  saveMemos(filtered);
  return true;
}

export function getMemosByType(type: 'assessment' | 'project'): Memo[] {
  return loadMemos().filter(m => m.assessmentType === type);
}

export function getMemoById(id: string): Memo | null {
  return loadMemos().find(m => m.id === id) || null;
} 