'use client'

import { useState } from 'react'
import {
  BrainCircuit,
  Calendar,
  CheckSquare,
  Loader2,
  MessageSquareHeart,
  RefreshCw,
  TrendingUp,
  Users,
} from 'lucide-react'

import {
  type ProjectDecisionSummary,
  type ProjectSentimentSummary,
} from '@/lib/project-insights'
import { cn, formatDate } from '@/lib/utils'

type Props = {
  projectId: string
  initialDecisions: ProjectDecisionSummary
  initialSentiment: ProjectSentimentSummary
}

const sentimentToneStyles = {
  positive: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20',
  neutral: 'bg-slate-500/15 text-slate-300 border border-slate-500/20',
  negative: 'bg-amber-500/15 text-amber-300 border border-amber-500/20',
  conflict: 'bg-red-500/15 text-red-300 border border-red-500/20',
  no_data: 'bg-slate-700/40 text-slate-300 border border-slate-600/30',
} as const

const sentimentBarStyles = {
  positive: 'bg-emerald-400',
  neutral: 'bg-slate-400',
  negative: 'bg-amber-400',
  conflict: 'bg-red-400',
} as const

export default function ProjectInsights({
  projectId,
  initialDecisions,
  initialSentiment,
}: Props) {
  const [decisions, setDecisions] = useState(initialDecisions)
  const [sentiment, setSentiment] = useState(initialSentiment)
  const [runningDecisionAnalysis, setRunningDecisionAnalysis] = useState(false)
  const [runningSentimentAnalysis, setRunningSentimentAnalysis] = useState(false)
  const [decisionError, setDecisionError] = useState<string | null>(null)
  const [sentimentError, setSentimentError] = useState<string | null>(null)

  const runDecisionAnalysis = async () => {
    try {
      setRunningDecisionAnalysis(true)
      setDecisionError(null)

      const response = await fetch(`/api/projects/${projectId}/decisions`, {
        method: 'POST',
      })
      const payload = await response.json()

      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? 'Decision extraction failed')
      }

      setDecisions(payload.data)
    } catch (error: any) {
      setDecisionError(error.message ?? 'Decision extraction failed')
    } finally {
      setRunningDecisionAnalysis(false)
    }
  }

  const runSentimentAnalysis = async () => {
    try {
      setRunningSentimentAnalysis(true)
      setSentimentError(null)

      const response = await fetch(`/api/projects/${projectId}/sentiment`, {
        method: 'POST',
      })
      const payload = await response.json()

      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? 'Sentiment analysis failed')
      }

      setSentiment(payload.data)
    } catch (error: any) {
      setSentimentError(error.message ?? 'Sentiment analysis failed')
    } finally {
      setRunningSentimentAnalysis(false)
    }
  }

  return (
    <div className="mt-12 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <section className="bg-[#171629] border border-slate-700/40 rounded-2xl p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-indigo-300 text-sm font-medium">
              <BrainCircuit size={16} />
              Decision Extractor
            </div>
            <h2 className="text-white text-xl font-semibold mt-2">
              Decisions and action items across the project
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              Re-run extraction whenever new transcripts land or existing meetings change.
            </p>
          </div>

          <button
            onClick={runDecisionAnalysis}
            disabled={runningDecisionAnalysis}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 px-4 py-2.5 text-sm font-medium text-white transition-colors"
          >
            {runningDecisionAnalysis ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <RefreshCw size={16} />
            )}
            {decisions.totalDecisions > 0 ? 'Refresh extractor' : 'Run extractor'}
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <InsightStat
            icon={TrendingUp}
            label="Decisions"
            value={decisions.totalDecisions}
            color="text-indigo-300"
          />
          <InsightStat
            icon={CheckSquare}
            label="Action items"
            value={decisions.totalActionItems}
            color="text-emerald-300"
          />
          <InsightStat
            icon={Calendar}
            label="Meetings covered"
            value={decisions.meetingsCovered}
            color="text-amber-300"
          />
        </div>

        {decisionError && (
          <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {decisionError}
          </p>
        )}

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl bg-[#1e1c32] border border-slate-700/40 p-4">
            <h3 className="text-white font-medium mb-3">Project decisions</h3>
            {decisions.decisions.length === 0 ? (
              <EmptyState text="No extracted decisions yet. Run the extractor to generate them from all project meetings." />
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {decisions.decisions.map((decision) => (
                  <div
                    key={decision.id}
                    className="rounded-xl border border-slate-700/30 bg-slate-900/20 p-3"
                  >
                    <p className="text-sm text-slate-100 leading-relaxed">
                      {decision.text}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-500">
                      <span>{decision.meetingTitle}</span>
                      <span>{formatDate(decision.meetingCreatedAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-[#1e1c32] border border-slate-700/40 p-4">
            <h3 className="text-white font-medium mb-3">Action tracker</h3>
            {decisions.actionItems.length === 0 ? (
              <EmptyState text="No action items are stored for this project yet." />
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {decisions.actionItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-700/30 bg-slate-900/20 p-3"
                  >
                    <p className="text-sm text-slate-100 leading-relaxed">
                      {item.task}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-400">
                      <span className="rounded-full bg-slate-800 px-2 py-1">
                        {item.meetingTitle}
                      </span>
                      <span className="rounded-full bg-slate-800 px-2 py-1">
                        Owner: {item.responsiblePerson || 'Unknown'}
                      </span>
                      <span className="rounded-full bg-slate-800 px-2 py-1">
                        Deadline: {item.deadline || 'Not specified'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="bg-[#171629] border border-slate-700/40 rounded-2xl p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-emerald-300 text-sm font-medium">
              <MessageSquareHeart size={16} />
              Sentiment Dashboard
            </div>
            <h2 className="text-white text-xl font-semibold mt-2">
              Speaker tone and meeting sentiment trends
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              Analyze tone across transcripts to spot alignment, tension, and outliers.
            </p>
          </div>

          <button
            onClick={runSentimentAnalysis}
            disabled={runningSentimentAnalysis}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 px-4 py-2.5 text-sm font-medium text-white transition-colors"
          >
            {runningSentimentAnalysis ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <RefreshCw size={16} />
            )}
            {sentiment.totalSegments > 0 ? 'Refresh sentiment' : 'Run sentiment'}
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <InsightStat
            icon={Users}
            label="Speakers"
            value={sentiment.speakerSummaries.length}
            color="text-sky-300"
          />
          <InsightStat
            icon={MessageSquareHeart}
            label="Segments"
            value={sentiment.totalSegments}
            color="text-emerald-300"
          />
          <div className="rounded-2xl bg-[#1e1c32] border border-slate-700/40 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
              Overall tone
            </div>
            <div className="mt-3 flex items-center gap-3">
              <span
                className={cn(
                  'rounded-full px-2.5 py-1 text-xs font-medium capitalize',
                  sentimentToneStyles[sentiment.overallLabel]
                )}
              >
                {sentiment.overallLabel === 'no_data'
                  ? 'No data'
                  : sentiment.overallLabel}
              </span>
              <span className="text-2xl font-bold text-white">
                {sentiment.overallAverageScore ?? '--'}
              </span>
            </div>
          </div>
        </div>

        {sentimentError && (
          <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {sentimentError}
          </p>
        )}

        <div className="mt-6 rounded-2xl bg-[#1e1c32] border border-slate-700/40 p-4">
          <h3 className="text-white font-medium">Speaker breakdown</h3>
          {sentiment.speakerSummaries.length === 0 ? (
            <div className="mt-3">
              <EmptyState text="No sentiment data stored yet. Run the dashboard to create speaker summaries." />
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {sentiment.speakerSummaries.map((speaker) => (
                <div key={speaker.speaker}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-white">
                        {speaker.speaker}
                      </p>
                      <p className="text-xs text-slate-500">
                        {speaker.totalSegments} segments across {speaker.meetingCount}{' '}
                        meeting{speaker.meetingCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-white">
                        {speaker.averageScore}
                      </p>
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2 py-1 text-[11px] font-medium capitalize',
                          sentimentToneStyles[speaker.dominantLabel]
                        )}
                      >
                        {speaker.dominantLabel}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
                    {(['positive', 'neutral', 'negative', 'conflict'] as const).map(
                      (label) => {
                        const count = speaker.distribution[label]
                        const width =
                          speaker.totalSegments > 0
                            ? `${(count / speaker.totalSegments) * 100}%`
                            : '0%'

                        return (
                          <div
                            key={label}
                            className={cn(
                              'h-full inline-block',
                              sentimentBarStyles[label]
                            )}
                            style={{ width }}
                          />
                        )
                      }
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 rounded-2xl bg-[#1e1c32] border border-slate-700/40 p-4">
          <h3 className="text-white font-medium">Meeting timeline</h3>
          {sentiment.meetingSummaries.length === 0 ? (
            <div className="mt-3">
              <EmptyState text="Sentiment trends will appear here once at least one meeting is analyzed." />
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {sentiment.meetingSummaries.map((meeting) => (
                <div key={meeting.meetingId}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <div>
                      <p className="text-white">{meeting.meetingTitle}</p>
                      <p className="text-xs text-slate-500">
                        {formatDate(meeting.createdAt)} · {meeting.segmentCount} analyzed
                        {' '}segment{meeting.segmentCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-1 text-[11px] font-medium capitalize',
                          sentimentToneStyles[meeting.dominantLabel]
                        )}
                      >
                        {meeting.dominantLabel}
                      </span>
                      <span className="font-semibold text-white">
                        {meeting.averageScore}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-800">
                    <div
                      className={cn(
                        'h-2 rounded-full',
                        meeting.averageScore >= 70
                          ? 'bg-emerald-400'
                          : meeting.averageScore >= 45
                            ? 'bg-sky-400'
                            : meeting.averageScore >= 25
                              ? 'bg-amber-400'
                              : 'bg-red-400'
                      )}
                      style={{ width: `${meeting.averageScore}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function InsightStat({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof TrendingUp
  label: string
  value: number
  color: string
}) {
  return (
    <div className="rounded-2xl bg-[#1e1c32] border border-slate-700/40 p-4">
      <Icon size={18} className={color} />
      <div className="mt-3 text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return <p className="text-sm leading-relaxed text-slate-500">{text}</p>
}
