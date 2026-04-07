// lib/parser.ts
// Parses .txt and .vtt transcript files into structured segments

export interface ParsedSegment {
  speaker: string
  text: string
  startTime: string | null
  endTime: string | null
  sequence: number
}

export interface ParseResult {
  segments: ParsedSegment[]
  speakers: string[]
  wordCount: number
  speakerCount: number
  rawText: string
  meetingDate: string | null
}

function normalizeDetectedDate(raw: string): string | null {
  const cleaned = raw
    .replace(/\b(on|date|meeting date)\b[:\s-]*/gi, "")
    .replace(/,/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return null;

  const parsed = new Date(cleaned);
  if (Number.isNaN(parsed.getTime())) return null;

  return parsed.toISOString();
}

function detectMeetingDate(content: string, filename: string): string | null {
  const filenameMatch = filename.match(
    /\b(20\d{2}[-_/.](0?[1-9]|1[0-2])[-_/.](0?[1-9]|[12]\d|3[01]))\b/,
  );
  if (filenameMatch) {
    return normalizeDetectedDate(filenameMatch[1].replace(/[_/]/g, "-"));
  }

  const topText = content.split("\n").slice(0, 20).join("\n");
  const patterns = [
    /\b(?:meeting date|date)\s*[:\-]?\s*([A-Z][a-z]{2,8}\s+\d{1,2}\s+\d{4})/i,
    /\b(?:meeting date|date)\s*[:\-]?\s*(\d{4}[-/]\d{1,2}[-/]\d{1,2})/i,
    /\b(?:meeting date|date)\s*[:\-]?\s*(\d{1,2}[-/]\d{1,2}[-/]\d{4})/i,
    /\b([A-Z][a-z]{2,8}\s+\d{1,2},?\s+\d{4})\b/,
    /\b(20\d{2}[-/]\d{1,2}[-/]\d{1,2})\b/,
  ];

  for (const pattern of patterns) {
    const match = topText.match(pattern);
    if (match?.[1]) {
      const detected = normalizeDetectedDate(match[1]);
      if (detected) return detected;
    }
  }

  return null;
}

// ─── VTT Parser ────────────────────────────────────────────────────────────
// Handles WebVTT format:
// 00:00:10.500 --> 00:00:13.000
// <v John> We should delay the API launch.
function parseVTT(content: string, filename: string): ParseResult {
  const lines = content.split('\n')
  const segments: ParsedSegment[] = []
  const speakerSet = new Set<string>()
  let sequence = 0

  let i = 0
  // Skip WEBVTT header
  while (i < lines.length && !lines[i].includes('-->')) i++

  while (i < lines.length) {
    const line = lines[i].trim()

    if (line.includes('-->')) {
      // Parse timestamp line: 00:00:10.500 --> 00:00:13.000
      const [startTime, endTime] = line.split('-->').map((t) => t.trim())

      i++
      // Collect all text lines until blank line
      const textLines: string[] = []
      while (i < lines.length && lines[i].trim() !== '') {
        textLines.push(lines[i].trim())
        i++
      }

      const fullText = textLines.join(' ')

      // Detect speaker from <v SpeakerName> tag or "Name:" prefix
      let speaker = 'Unknown'
      let text = fullText

      const vTagMatch = fullText.match(/^<v\s+([^>]+)>([\s\S]*)/)
      const colonMatch = fullText.match(/^([A-Za-z][^:]{0,30}):\s+(.+)/)

      if (vTagMatch) {
        speaker = vTagMatch[1].trim()
        text = vTagMatch[2].replace(/<\/v>/g, '').trim()
      } else if (colonMatch) {
        speaker = colonMatch[1].trim()
        text = colonMatch[2].trim()
      }

      if (text) {
        speakerSet.add(speaker)
        segments.push({ speaker, text, startTime, endTime, sequence: sequence++ })
      }
    } else {
      i++
    }
  }

  const wordCount = segments.reduce((acc, s) => acc + s.text.split(/\s+/).length, 0)

  return {
    segments,
    speakers: Array.from(speakerSet),
    wordCount,
    speakerCount: speakerSet.size,
    rawText: content,
    meetingDate: detectMeetingDate(content, filename),
  }
}

// ─── TXT Parser ────────────────────────────────────────────────────────────
// Handles plain text formats like:
//   John: We should delay the launch.
//   [00:10] Sarah: I agree with that.
//   SPEAKER_01: Hello everyone.
function parseTXT(content: string, filename: string): ParseResult {
  const lines = content.split('\n').map((l) => l.trim()).filter(Boolean)
  const segments: ParsedSegment[] = []
  const speakerSet = new Set<string>()
  let sequence = 0
  let currentSpeaker = 'Unknown'
  let currentText = ''
  let currentTime: string | null = null

  const flushSegment = () => {
    if (currentText.trim()) {
      speakerSet.add(currentSpeaker)
      segments.push({
        speaker: currentSpeaker,
        text: currentText.trim(),
        startTime: currentTime,
        endTime: null,
        sequence: sequence++,
      })
      currentText = ''
      currentTime = null
    }
  }

  for (const line of lines) {
    // Match: [00:10:30] Speaker: text  OR  Speaker: text
    const withTimestamp = line.match(/^\[?(\d{1,2}:\d{2}(?::\d{2})?)\]?\s+([A-Za-z][^:]{0,30}):\s+(.+)/)
    const withoutTimestamp = line.match(/^([A-Za-z][A-Za-z\s_]{0,29}):\s+(.+)/)

    if (withTimestamp) {
      flushSegment()
      currentTime = withTimestamp[1]
      currentSpeaker = withTimestamp[2].trim()
      currentText = withTimestamp[3]
    } else if (withoutTimestamp) {
      flushSegment()
      currentSpeaker = withoutTimestamp[1].trim()
      currentText = withoutTimestamp[2]
    } else {
      // Continuation of previous speaker's text
      if (currentText) currentText += ' ' + line
      else currentText = line
    }
  }

  flushSegment()

  const wordCount = segments.reduce((acc, s) => acc + s.text.split(/\s+/).length, 0)

  return {
    segments,
    speakers: Array.from(speakerSet),
    wordCount,
    speakerCount: speakerSet.size,
    rawText: content,
    meetingDate: detectMeetingDate(content, filename),
  }
}

// ─── Main export ───────────────────────────────────────────────────────────
export function parseTranscript(content: string, filename: string): ParseResult {
  const ext = filename.split('.').pop()?.toLowerCase()

  if (ext === 'vtt') return parseVTT(content, filename)
  if (ext === 'txt') return parseTXT(content, filename)

  throw new Error(`Unsupported file type: .${ext}. Only .txt and .vtt are supported.`)
}

// Validate file before parsing
export function validateTranscriptFile(file: File): string | null {
  const allowedTypes = ['text/plain', 'text/vtt']
  const allowedExtensions = ['.txt', '.vtt']
  const maxSize = 10 * 1024 * 1024 // 10MB

  const ext = '.' + file.name.split('.').pop()?.toLowerCase()

  if (!allowedExtensions.includes(ext)) {
    return `Invalid file type. Only .txt and .vtt files are allowed.`
  }

  if (file.size > maxSize) {
    return `File too large. Maximum size is 10MB.`
  }

  return null // valid
}
