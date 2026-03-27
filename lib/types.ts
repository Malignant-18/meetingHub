// lib/types.ts
// Shared types used across frontend and backend

export type MeetingStatus =
  | 'UPLOADED'
  | 'PARSING'
  | 'PARSED'
  | 'ANALYZING'
  | 'ANALYZED'
  | 'ERROR'

export type ActionStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE'

export type SentimentLabel = 'positive' | 'neutral' | 'negative' | 'conflict'

export interface ProjectWithStats {
  id: string
  name: string
  createdAt: string
  meetingCount: number
  totalActionItems: number
  overallSentiment: 'Positive' | 'Mixed' | 'Tense' | 'No data'
}

export interface MeetingWithDetails {
  id: string
  title: string
  fileName: string
  meetingDate: string | null
  speakerCount: number
  wordCount: number
  status: MeetingStatus
  createdAt: string
  segmentCount: number
  actionItemCount: number
  decisionCount: number
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

// API response wrapper
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}
