/**
 * Shared types between client and server
 */

// Quiz-related types
export interface Quiz {
  id: number;
  title: string;
  difficulty: string;
  status?: string;
  min_access_level?: string | null;
  visibility_tier?: string | null;
  access_required?: string | null;
  quiz_id?: string;
  topics?: string[];
  total_word_count?: number;
  completions?: number;
  is_completed?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Question {
  id: number;
  quiz_id: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  explanation: string;
  word_count: number;
  question_order: number;
  image_url?: string;
}

// Progress-related types
export interface UserProgress {
  daily_words_read: number;
  total_words_read: number;
  current_streak: number;
  longest_streak: number;
  total_quizzes_completed: number;
  daily_target: number;
  last_activity_date: string | null;
  quiz_words?: number;
  external_words?: number;
}

// Home page data
export interface HomeRowData {
  row: {
    id: number;
    title: string;
    topic_tag: string;
  };
  quizzes: Quiz[];
}

export interface HomeData {
  latestQuizzes: Quiz[];
  homeRows: HomeRowData[];
}
