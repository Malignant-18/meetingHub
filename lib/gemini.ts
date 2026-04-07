// lib/gemini.ts
// Wrapper for all Google Gemini API calls
// All AI calls go through this file — never call Gemini directly from API routes

import { GoogleGenerativeAI } from "@google/generative-ai";

const getClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey)
    throw new Error("GEMINI_API_KEY is not set in environment variables");
  return new GoogleGenerativeAI(apiKey);
};

// Use flash for speed + cost efficiency; switch to pro for higher quality
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

// ─── Types ─────────────────────────────────────────────────────────────────
export interface ExtractedDecision {
  decision: string;
  context: string;
}

export interface ExtractedActionItem {
  task: string;
  responsible_person: string;
  deadline: string;
}

export interface ExtractionResult {
  decisions: ExtractedDecision[];
  action_items: ExtractedActionItem[];
}

export interface SentimentSegment {
  speaker: string;
  segment: string;
  sentiment: "positive" | "neutral" | "negative" | "conflict";
  score: number;
  time_label: string;
}

// ─── Decision + Action Item Extraction ────────────────────────────────────
export async function extractDecisionsAndActions(
  transcriptText: string,
): Promise<ExtractionResult> {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({
    model: MODEL,
    generationConfig: {
      responseMimeType: "application/json", // forces pure JSON output — no markdown fences
      temperature: 0.1, // low temp for factual extraction
    },
  });

  const prompt = `You are an expert meeting analyst. Analyze this meeting transcript carefully.

Extract ALL of the following:
1. DECISIONS — things that were definitively agreed upon, resolved, or chosen
2. ACTION ITEMS — specific tasks assigned to specific people with deadlines

RULES:
- Only include decisions that were clearly finalized, not just suggested
- For action items, always extract who is responsible even if you have to infer from context
- If no deadline is mentioned, write "Not specified"
- If responsible person is unclear, write "Team"
- Be concise — each decision should be one clear sentence
- Return 0 items in an array if none exist — never return null

Return this exact JSON structure and nothing else:
{
  "decisions": [
    {
      "decision": "Clear statement of what was decided",
      "context": "Brief reason or context behind this decision"
    }
  ],
  "action_items": [
    {
      "task": "Specific thing that needs to be done",
      "responsible_person": "Name of person responsible",
      "deadline": "When it should be done by"
    }
  ]
}

TRANSCRIPT:
${transcriptText}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  // Strip any stray markdown fences just in case
  const clean = text
    .replace(/^```json\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(clean);
    return {
      decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
      action_items: Array.isArray(parsed.action_items)
        ? parsed.action_items
        : [],
    };
  } catch (e) {
    console.error("[gemini] JSON parse error. Raw response:", text);
    throw new Error(
      "Gemini returned malformed JSON. Try re-running the analysis.",
    );
  }
}

// ─── Sentiment Analysis ────────────────────────────────────────────────────
export async function analyzeSentiment(
  transcriptText: string,
): Promise<SentimentSegment[]> {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({
    model: MODEL,
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.2,
    },
  });

  const prompt = `You are an expert conversation analyst specializing in meeting dynamics and sentiment.

Analyze the tone and sentiment of each speaker in this meeting transcript.
Group the transcript into time periods (early, mid, late) and score each speaker's sentiment in each period.

SENTIMENT LABELS (use exactly these values):
- "positive"  = constructive, agreeable, enthusiastic, solution-focused
- "neutral"   = factual, matter-of-fact, neither positive nor negative
- "negative"  = frustrated, dismissive, pessimistic, resistant
- "conflict"  = direct disagreement, argument, pushback, tension

SCORE GUIDE:
- 80-100 = very positive
- 60-79  = mildly positive
- 40-59  = neutral
- 20-39  = negative
- 0-19   = very negative / high conflict

RULES:
- Create one entry per speaker per time period (early/mid/late)
- The "segment" field should be a short direct quote or 1-sentence summary of their tone
- Never invent speakers not in the transcript
- Return an empty array [] if the transcript has no clear speaker labels
- Every score must be an integer 0-100

Return ONLY this JSON array structure:
[
  {
    "speaker": "exact speaker name from transcript",
    "segment": "short quote or summary showing their tone",
    "sentiment": "positive" | "neutral" | "negative" | "conflict",
    "score": 75,
    "time_label": "early" | "mid" | "late"
  }
]

TRANSCRIPT:
${transcriptText}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  const clean = text
    .replace(/^```json\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(clean);
    if (!Array.isArray(parsed)) throw new Error("Expected array");
    return parsed.map((item: any) => ({
      speaker: String(item.speaker ?? "Unknown"),
      segment: String(item.segment ?? ""),
      sentiment: (["positive", "neutral", "negative", "conflict"].includes(
        item.sentiment,
      )
        ? item.sentiment
        : "neutral") as SentimentSegment["sentiment"],
      score: Math.min(100, Math.max(0, Math.round(Number(item.score) || 50))),
      time_label: (["early", "mid", "late"].includes(item.time_label)
        ? item.time_label
        : "mid") as SentimentSegment["time_label"],
    }));
  } catch (e) {
    console.error("[gemini] Sentiment JSON parse error. Raw:", text);
    throw new Error(
      "Gemini returned malformed JSON for sentiment. Try re-running.",
    );
  }
}

// ─── Chatbot Query ─────────────────────────────────────────────────────────
export interface ChatbotResponse {
  answer: string;
  references: string[]; // segment IDs Gemini cited
}

export async function queryChatbot(
  question: string,
  transcriptContext: string, // already contains [seg_ID] prefixes
  conversationHistory: { role: "user" | "model"; parts: string }[],
): Promise<ChatbotResponse> {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({
    model: MODEL,
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.3,
    },
  });

  const systemContext = `You are an intelligent meeting assistant. You have access to meeting transcripts where each line is prefixed with a segment ID like [seg_clx123abc].

RULES:
- Answer questions based ONLY on the transcript content provided
- Always cite the speaker name in your answer (e.g. "According to Sarah...")
- In the references array, include the segment IDs of the lines you used to answer
- Copy segment IDs EXACTLY as they appear — do not modify or invent them
- If a question cannot be answered from the transcripts, say so clearly
- Keep answers concise and factual

Return ONLY this JSON structure (no markdown, no explanation):
{
  "answer": "your answer here",
  "references": ["seg_clx123", "seg_clx456"]
}

MEETING TRANSCRIPTS:
${transcriptContext}`;

  const chat = model.startChat({
    history: conversationHistory.map((m) => ({
      role: m.role,
      parts: [{ text: m.parts }],
    })),
    systemInstruction: {
      role: "system",
      parts: [{ text: systemContext }],
    },
  });

  const result = await chat.sendMessage(question);
  const text = result.response.text().trim();
  const clean = text
    .replace(/^```json\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(clean);
    return {
      answer: String(parsed.answer ?? text),
      references: Array.isArray(parsed.references)
        ? parsed.references.filter((r: any) => typeof r === "string")
        : [],
    };
  } catch {
    // Fallback: treat entire response as plain answer with no references
    return { answer: text, references: [] };
  }
}
