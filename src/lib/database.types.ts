export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      question_results: {
        Row: {
          correct_answer: string
          error_type: string | null
          explanation: string | null
          id: string
          is_correct: boolean
          question_text: string
          quiz_result_id: string
          subtopic: string
          user_answer: string
        }
        Insert: {
          correct_answer: string
          error_type?: string | null
          explanation?: string | null
          id?: string
          is_correct: boolean
          question_text: string
          quiz_result_id: string
          subtopic: string
          user_answer: string
        }
        Update: {
          correct_answer?: string
          error_type?: string | null
          explanation?: string | null
          id?: string
          is_correct?: boolean
          question_text?: string
          quiz_result_id?: string
          subtopic?: string
          user_answer?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_results_quiz_result_id_fkey"
            columns: ["quiz_result_id"]
            isOneToOne: false
            referencedRelation: "quiz_results"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_results: {
        Row: {
          completed_at: string
          correct_answers: number
          id: string
          subject: string
          total_questions: number
          user_id: string | null
        }
        Insert: {
          completed_at?: string
          correct_answers: number
          id?: string
          subject: string
          total_questions: number
          user_id?: string | null
        }
        Update: {
          completed_at?: string
          correct_answers?: number
          id?: string
          subject?: string
          total_questions?: number
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}