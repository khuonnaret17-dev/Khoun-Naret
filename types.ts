
export interface Question {
  subject: string;
  question: string;
  type: 'mcq' | 'short';
  options?: string[]; // Required for MCQ
  correct?: number;   // Index for MCQ
  answer?: string;    // Correct text for Short Answer
  isActive?: boolean;
}

export interface Feedback {
  id?: string;
  username: string;
  text: string;
  createdAt: string;
}

export type AppMode = 'play' | 'create';
export type UserRole = 'user' | 'admin' | null;

export interface QuizState {
  currentQuestionIndex: number;
  score: number;
  isFinished: boolean;
  selectedAnswer: number | null; // For MCQ
  userInput: string;             // For Short Answer
  showCorrect: boolean;
  userAnswers: (number | string | null)[];
  isReviewing?: boolean;
}

export interface SelectedQuizInfo {
  subject: string;
  partIndex: number;
  type: 'mcq' | 'short';
  customQuestions?: Question[]; 
  isMixed?: boolean;           
}

export interface TelegramConfig {
  botToken: string;
  chatId: string;
}
