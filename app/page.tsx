// app/page.tsx — public landing page
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default function LandingPage() {
  const { userId } = auth()
  if (userId) redirect('/dashboard')

  return (
    <main className="min-h-screen bg-[#0f0e1a] flex flex-col items-center justify-center px-6 text-center">
      <div className="max-w-2xl">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-indigo-950 border border-indigo-700 text-indigo-300 text-sm px-4 py-1.5 rounded-full mb-8">
          <span className="w-2 h-2 bg-indigo-400 rounded-full"></span>
          AI-powered meeting analysis
        </div>

        <h1 className="text-5xl font-bold text-white mb-4 leading-tight">
          Meeting <span className="text-indigo-400">Intelligence</span> Hub
        </h1>

        <p className="text-slate-400 text-lg mb-10 leading-relaxed">
          Upload meeting transcripts. Extract decisions, action items, and speaker
          sentiment automatically. Ask questions across all your meetings with AI.
        </p>

        <div className="flex gap-4 justify-center">
          <Link
            href="/sign-up"
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-8 py-3 rounded-xl transition-colors"
          >
            Get started free
          </Link>
          <Link
            href="/sign-in"
            className="border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white font-medium px-8 py-3 rounded-xl transition-colors"
          >
            Sign in
          </Link>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-2 gap-4 mt-16 text-left">
          {[
            { icon: '📋', title: 'Decision Extractor', desc: 'Auto-extract every decision made in a meeting' },
            { icon: '✅', title: 'Action Items', desc: 'Who does what by when — always clear' },
            { icon: '💬', title: 'AI Chatbot', desc: 'Ask questions across all your meetings' },
            { icon: '📊', title: 'Sentiment Analysis', desc: 'Understand the tone and vibe of every meeting' },
          ].map((f) => (
            <div key={f.title} className="bg-[#1e1c32] border border-slate-700/50 rounded-xl p-5">
              <div className="text-2xl mb-2">{f.icon}</div>
              <div className="font-medium text-white text-sm mb-1">{f.title}</div>
              <div className="text-slate-400 text-xs leading-relaxed">{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
