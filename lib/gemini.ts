// lib/gemini.ts
// Wrapper for all Google Gemini API calls
// All AI calls go through this file — never call Gemini directly from API routes

import { GoogleGenerativeAI } from '@google/generative-ai'

const getClient = () => {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set in environment variables')
  return new GoogleGenerativeAI(apiKey)
}

// Use flash for speed + cost efficiency; switch to pro for higher quality
const MODEL = 'gemini-1.5-flash'

// ─── Types ─────────────────────────────────────────────────────────────────
export interface ExtractedDecision {
  decision: string
  context: string
}

export interface ExtractedActionItem {
  task: string
  responsible_person: string
  deadline: string
}

export interface ExtractionResult {
  decisions: ExtractedDecision[]
  action_items: ExtractedActionItem[]
}

export interface SentimentSegment {
  speaker: string
  segment: string
  sentiment: 'positive' | 'neutral' | 'negative' | 'conflict'
  score: number
  time_label: string
}

// ─── Decision + Action Item Extraction ────────────────────────────────────
export async function extractDecisionsAndActions(
  transcriptText: string
): Promise<ExtractionResult> {
  const genAI = getClient()
  const model = genAI.getGenerativeModel({ model: MODEL })

  const prompt = `You are an expert meeting analyst. Analyze the following meeting transcript and extract:
1. All decisions made (things the team agreed on or resolved)
2. All action items assigned (tasks with owners and deadlines)

Return ONLY a valid JSON object with this exact structure — no markdown, no explanation:
{
  "decisions": [
    { "decision": "string describing what was decided", "context": "brief context or reason" }
  ],
  "action_items": [
    { "task": "what needs to be done", "responsible_person": "name or Unknown", "deadline": "date/time or 'Not specified'" }
  ]
}

TRANSCRIPT:
${transcriptText}`

  const result = await model.generateContent(prompt)
  const text = result.response.text()

  // Strip markdown code fences if present
  const clean = text.replace(/```json|```/g, '').trim()

  try {
    return JSON.parse(clean)
  } catch {
    throw new Error('Gemini returned invalid JSON for extraction')
  }
}

// ─── Sentiment Analysis ────────────────────────────────────────────────────
export async function analyzeSentiment(
  transcriptText: string
): Promise<SentimentSegment[]> {
  const genAI = getClient()
  const model = genAI.getGenerativeModel({ model: MODEL })

  const prompt = `Analyze the sentiment and tone of each speaker in this meeting transcript.
Break the transcript into meaningful segments (roughly every 3-5 exchanges per speaker).

Return ONLY a valid JSON array — no markdown, no explanation:
[
  {
    "speaker": "speaker name",
    "segment": "short quote or summary of what they said",
    "sentiment": "positive" | "neutral" | "negative" | "conflict",
    "score": number between 0 and 100 (100 = very positive, 0 = very negative),
    "time_label": "early" | "mid" | "late"
  }
]

TRANSCRIPT:
${transcriptText}`

  const result = await model.generateContent(prompt)
  const text = result.response.text()
  const clean = text.replace(/```json|```/g, '').trim()

  try {
    return JSON.parse(clean)
  } catch {
    throw new Error('Gemini returned invalid JSON for sentiment analysis')
  }
}

// ─── Chatbot Query ─────────────────────────────────────────────────────────
export async function queryChatbot(
  question: string,
  transcriptContext: string,
  conversationHistory: { role: 'user' | 'model'; parts: string }[]
): Promise<string> {
  const genAI = getClient()
  const model = genAI.getGenerativeModel({ model: MODEL })

  const systemContext = `You are an intelligent meeting assistant. You have access to the following meeting transcripts and must answer questions based only on this content.

Always cite your sources by mentioning the speaker name and approximate context (e.g., "According to John in the early part of the meeting...").

MEETING TRANSCRIPTS:
${transcriptContext}

---`

  const chat = model.startChat({
    history: conversationHistory.map((m) => ({
      role: m.role,
      parts: [{ text: m.parts }],
    })),
    systemInstruction: systemContext,
  })

  const result = await chat.sendMessage(question)
  return result.response.text()
}
