export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number; // Index 0-3
  hint: string;
}

export interface LessonData {
  topic: string;
  level: string;
  summary: string;
  keyPoints: string[];
  imagePrompt: string;
  imageUrl?: string;
  videoUrl?: string;
  quiz: QuizQuestion[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  text?: string;
  image?: string; // base64 data string
  timestamp: Date;
}

export enum AppMode {
  LANDING = 'LANDING',
  TEACHER = 'TEACHER',
  STUDENT = 'STUDENT'
}

export interface UserState {
  mode: AppMode;
  currentLesson: LessonData | null;
}
export interface RelatedResource {
  title: string;
  description: string;
  url: string;
  type: 'video' | 'article' | 'topic';
}
