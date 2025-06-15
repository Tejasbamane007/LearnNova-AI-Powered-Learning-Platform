import apiRequest from './api';

export interface QuizQuestion {
  question: string;
  options: string[];
  answer: string;
}

export interface Quiz {
  id: string;
  topic: string;
  level: string;
  questions: QuizQuestion[];
  createdAt: string;
  updatedAt: string;
}

export interface QuizResult {
  score: number;
  total: number;
  percentage: number;
  results: {
    question: string;
    userAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
  }[];
}

// Generate a quiz for a topic
export const generateQuiz = async (topic: string, level?: string, courseId?: string) => {
  return apiRequest('/quiz/generate', 'POST', { topic, level, courseId });
};

// Get all quizzes for the current user
export const getMyQuizzes = async () => {
  return apiRequest('/quiz');
};

// Get a specific quiz by ID
export const getQuiz = async (quizId: string) => {
  return apiRequest(`/quiz/${quizId}`);
};

// Submit quiz answers and get results
export const submitQuiz = async (quizId: string, answers: string[]) => {
  return apiRequest(`/quiz/${quizId}/submit`, 'POST', { answers });
};