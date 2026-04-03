export interface Session {
  id: string;
  user_id: string;
  name: string;
  company_name: string;
  jd_text: string;
  resume_text: string;
  round_description: string;
  resume_file_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface PrepSource {
  id: string;
  session_id: string;
  content: PrepSourceContent;
  generated_at: string;
}

export interface PrepSourceContent {
  [key: string]: string;
  company_snapshot: string;
  interview_process: string;
  technical_topics: string;
  preparation_checklist: string;
  resource_links: string;
}

export interface QuizSession {
  id: string;
  session_id: string;
  mode: "text" | "voice" | "mcq";
  questions: QuizQuestion[];
  answers: QuizAnswer[];
  feedback: QuizFeedback | null;
  created_at: string;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options?: string[]; // MCQ only
}

export interface QuizAnswer {
  question_id: number;
  answer: string;
  selected_option?: number; // MCQ only
}

export interface QuizFeedback {
  per_question: QuestionFeedback[];
  overall_summary: string;
  strong_areas: string[];
  gaps: string[];
  topics_to_revisit: string[];
}

export interface QuestionFeedback {
  question_id: number;
  feedback: string;
  ideal_answer: string;
  score: number;
}

export interface MockInterview {
  id: string;
  session_id: string;
  topics: string;
  duration: number;
  difficulty: "beginner" | "intermediate" | "senior" | "staff";
  transcript: TranscriptEntry[];
  feedback_report: MockFeedbackReport | null;
  created_at: string;
}

export interface TranscriptEntry {
  role: "interviewer" | "candidate";
  content: string;
  timestamp: string;
}

export interface MockFeedbackReport {
  answer_quality: string;
  answer_structure: string;
  communication: string;
  areas_to_improve: string[];
  overall_rating: string;
}

// ── Elevator Pitch ────────────────────────────────────────────────────────────

export interface ElevatorPitch {
  id: string;
  user_id: string;
  pitch_text: string;
  target_role: string;
  company_name: string;
  resume_text: string;
  created_at: string;
  updated_at: string;
  recordings?: PitchRecording[];
}

export interface PitchRecording {
  id: string;
  pitch_id: string;
  user_id?: string;
  video_url: string | null;
  duration_seconds: number;
  transcript: string;
  score: number | null;
  feedback: PitchFeedback | null;
  share_token: string;
  created_at: string;
  // Present on share endpoint only
  target_role?: string;
  company_name?: string;
}

export interface PitchFeedback {
  overall_score: number;
  dimensions: {
    opening_hook: number;
    identity_clarity: number;
    value_proposition: number;
    unique_differentiator: number;
    role_fit: number;
    call_to_action: number;
    delivery: number;
  };
  strengths: string[];
  improvements: string[];
  tailored_suggestions: string[];
  timing_note: string;
}
