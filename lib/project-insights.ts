import type { SentimentSegment } from "@/lib/gemini";

type MinimalDecision = {
  id: string;
  decisionText: string;
  createdAt: Date;
};

type MinimalActionItem = {
  id: string;
  task: string;
  responsiblePerson: string | null;
  deadline: string | null;
  status: string;
};

type MinimalSentiment = {
  id: string;
  speaker: string;
  sentimentLabel: string;
  sentimentScore: number;
  createdAt: Date;
};

type ProjectMeetingData = {
  id: string;
  title: string;
  createdAt: Date;
  decisions: MinimalDecision[];
  actionItems: MinimalActionItem[];
  sentiments: MinimalSentiment[];
};

type TranscriptLikeSegment = {
  id: string;
  speaker: string;
  text: string;
};

export type ProjectDecisionItem = {
  id: string;
  meetingId: string;
  meetingTitle: string;
  meetingCreatedAt: string;
  text: string;
  createdAt: string;
};

export type ProjectActionItem = {
  id: string;
  meetingId: string;
  meetingTitle: string;
  task: string;
  responsiblePerson: string | null;
  deadline: string | null;
  status: string;
};

export type ProjectDecisionSummary = {
  meetingsCovered: number;
  totalDecisions: number;
  totalActionItems: number;
  decisions: ProjectDecisionItem[];
  actionItems: ProjectActionItem[];
};

export type SpeakerSentimentSummary = {
  speaker: string;
  averageScore: number;
  dominantLabel: "positive" | "neutral" | "negative" | "conflict";
  totalSegments: number;
  meetingCount: number;
  distribution: Record<
    "positive" | "neutral" | "negative" | "conflict",
    number
  >;
};

export type MeetingSentimentSummary = {
  meetingId: string;
  meetingTitle: string;
  createdAt: string;
  averageScore: number;
  dominantLabel: "positive" | "neutral" | "negative" | "conflict";
  segmentCount: number;
};

export type ProjectSentimentSummary = {
  totalSegments: number;
  overallAverageScore: number | null;
  overallLabel: "positive" | "neutral" | "negative" | "conflict" | "no_data";
  speakerSummaries: SpeakerSentimentSummary[];
  meetingSummaries: MeetingSentimentSummary[];
  distribution: Record<
    "positive" | "neutral" | "negative" | "conflict",
    number
  >;
};

type SentimentPersistenceRecord = {
  segmentId: string;
  speaker: string;
  sentimentLabel: string;
  sentimentScore: number;
};

const SENTIMENT_LABELS = [
  "positive",
  "neutral",
  "negative",
  "conflict",
] as const;

export function buildTranscriptText(
  segments: Array<{ speaker: string; text: string }>,
): string {
  return segments
    .map((segment) => `${segment.speaker}: ${segment.text}`)
    .join("\n");
}

export function summarizeProjectDecisions(
  meetings: ProjectMeetingData[],
): ProjectDecisionSummary {
  const decisions = meetings
    .flatMap((meeting) =>
      meeting.decisions.map((decision) => ({
        id: decision.id,
        meetingId: meeting.id,
        meetingTitle: meeting.title,
        meetingCreatedAt: meeting.createdAt.toISOString(),
        text: decision.decisionText,
        createdAt: decision.createdAt.toISOString(),
      })),
    )
    .sort((a, b) => {
      const meetingDiff =
        new Date(b.meetingCreatedAt).getTime() -
        new Date(a.meetingCreatedAt).getTime();
      if (meetingDiff !== 0) return meetingDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const actionItems = meetings
    .flatMap((meeting) =>
      meeting.actionItems.map((item) => ({
        id: item.id,
        meetingId: meeting.id,
        meetingTitle: meeting.title,
        task: item.task,
        responsiblePerson: item.responsiblePerson,
        deadline: item.deadline,
        status: item.status,
      })),
    )
    .sort((a, b) => a.meetingTitle.localeCompare(b.meetingTitle));

  return {
    meetingsCovered: meetings.filter(
      (meeting) => meeting.decisions.length > 0 || meeting.actionItems.length > 0,
    ).length,
    totalDecisions: decisions.length,
    totalActionItems: actionItems.length,
    decisions,
    actionItems,
  };
}

export function summarizeProjectSentiment(
  meetings: ProjectMeetingData[],
): ProjectSentimentSummary {
  const distribution = createDistribution();
  const speakerMap = new Map<
    string,
    {
      totalScore: number;
      totalSegments: number;
      meetings: Set<string>;
      distribution: Record<
        "positive" | "neutral" | "negative" | "conflict",
        number
      >;
    }
  >();

  const meetingSummaries = meetings
    .filter((meeting) => meeting.sentiments.length > 0)
    .map((meeting) => {
      const avg =
        meeting.sentiments.reduce((sum, item) => sum + item.sentimentScore, 0) /
        meeting.sentiments.length;
      const meetingDistribution = createDistribution();

      for (const sentiment of meeting.sentiments) {
        const label = normalizeSentimentLabel(sentiment.sentimentLabel);
        distribution[label] += 1;
        meetingDistribution[label] += 1;

        const existing = speakerMap.get(sentiment.speaker) ?? {
          totalScore: 0,
          totalSegments: 0,
          meetings: new Set<string>(),
          distribution: createDistribution(),
        };

        existing.totalScore += sentiment.sentimentScore;
        existing.totalSegments += 1;
        existing.meetings.add(meeting.id);
        existing.distribution[label] += 1;
        speakerMap.set(sentiment.speaker, existing);
      }

      return {
        meetingId: meeting.id,
        meetingTitle: meeting.title,
        createdAt: meeting.createdAt.toISOString(),
        averageScore: round(avg),
        dominantLabel: dominantLabel(meetingDistribution),
        segmentCount: meeting.sentiments.length,
      };
    })
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

  const totalSegments = Object.values(distribution).reduce(
    (sum, count) => sum + count,
    0,
  );
  const totalScore = meetings.reduce(
    (sum, meeting) =>
      sum +
      meeting.sentiments.reduce(
        (inner, item) => inner + item.sentimentScore,
        0,
      ),
    0,
  );

  const speakerSummaries = Array.from(speakerMap.entries())
    .map(([speaker, value]) => ({
      speaker,
      averageScore: round(value.totalScore / value.totalSegments),
      dominantLabel: dominantLabel(value.distribution),
      totalSegments: value.totalSegments,
      meetingCount: value.meetings.size,
      distribution: value.distribution,
    }))
    .sort((a, b) => b.averageScore - a.averageScore);

  return {
    totalSegments,
    overallAverageScore:
      totalSegments > 0 ? round(totalScore / totalSegments) : null,
    overallLabel: totalSegments > 0 ? dominantLabel(distribution) : "no_data",
    speakerSummaries,
    meetingSummaries,
    distribution,
  };
}

export function mapSentimentSegmentsToRecords(
  transcriptSegments: TranscriptLikeSegment[],
  analyzedSegments: SentimentSegment[],
): SentimentPersistenceRecord[] {
  const usedSegmentIds = new Set<string>();
  const records: Array<SentimentPersistenceRecord | null> = analyzedSegments.map(
    (item) => {
      const segmentId = selectBestSegmentId(
        transcriptSegments,
        item,
        usedSegmentIds,
      );
      if (!segmentId) return null;

      usedSegmentIds.add(segmentId);

      return {
        segmentId,
        speaker: item.speaker,
        sentimentLabel: normalizeSentimentLabel(item.sentiment),
        sentimentScore: item.score,
      };
    },
  );

  return records.filter(
    (item): item is SentimentPersistenceRecord => item !== null,
  );
}

function selectBestSegmentId(
  transcriptSegments: TranscriptLikeSegment[],
  analyzedSegment: SentimentSegment,
  usedSegmentIds: Set<string>,
): string | null {
  const speakerMatches = transcriptSegments.filter(
    (segment) =>
      normalizeText(segment.speaker) === normalizeText(analyzedSegment.speaker),
  );
  const candidates =
    speakerMatches.length > 0 ? speakerMatches : transcriptSegments;

  let bestCandidate: TranscriptLikeSegment | null = null;
  let bestScore = -1;

  for (const candidate of candidates) {
    let score = overlapScore(candidate.text, analyzedSegment.segment);
    if (
      normalizeText(candidate.speaker) ===
      normalizeText(analyzedSegment.speaker)
    ) {
      score += 0.25;
    }
    if (!usedSegmentIds.has(candidate.id)) {
      score += 0.1;
    }

    if (score > bestScore) {
      bestScore = score;
      bestCandidate = candidate;
    }
  }

  return bestCandidate?.id ?? null;
}

function overlapScore(left: string, right: string): number {
  const leftWords = new Set(tokenize(left));
  const rightWords = new Set(tokenize(right));
  if (leftWords.size === 0 || rightWords.size === 0) return 0;

  let matches = 0;
  for (const word of Array.from(rightWords)) {
    if (leftWords.has(word)) matches += 1;
  }

  return matches / Math.max(leftWords.size, rightWords.size);
}

function tokenize(value: string): string[] {
  return normalizeText(value).split(" ").filter(Boolean);
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSentimentLabel(
  value: string,
): "positive" | "neutral" | "negative" | "conflict" {
  const normalized = value.toLowerCase();
  if (normalized === "positive") return "positive";
  if (normalized === "negative") return "negative";
  if (normalized === "conflict") return "conflict";
  return "neutral";
}

function dominantLabel(
  distribution: Record<
    "positive" | "neutral" | "negative" | "conflict",
    number
  >,
): "positive" | "neutral" | "negative" | "conflict" {
  return SENTIMENT_LABELS.reduce((best, label) =>
    distribution[label] > distribution[best] ? label : best,
  );
}

function createDistribution(): Record<
  "positive" | "neutral" | "negative" | "conflict",
  number
> {
  return {
    positive: 0,
    neutral: 0,
    negative: 0,
    conflict: 0,
  };
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
