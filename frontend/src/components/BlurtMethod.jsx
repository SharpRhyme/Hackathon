import { useState } from 'react'
import { Zap, Loader2, AlertCircle } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

export default function BlurtMethod() {
  const [topic, setTopic] = useState('')
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [feedback, setFeedback] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setFeedback(null)

    try {
      const res = await fetch('/api/blurt-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), student_input: input.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Request failed')
      setFeedback(data.feedback)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <header>
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-400" aria-hidden="true" />
          <h1 className="text-xl font-semibold text-zinc-100">Blurt Method</h1>
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          Write everything you remember about a topic — no notes allowed. Gemini identifies gaps
          and celebrates what you got right.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="blurt-topic" className="block text-xs font-medium uppercase tracking-widest text-zinc-600">
            Topic
          </label>
          <input
            id="blurt-topic"
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. The water cycle"
            className="mt-1.5 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-violet-600 focus:outline-none focus:ring-1 focus:ring-violet-600"
            required
          />
        </div>
        <div>
          <label htmlFor="blurt-input" className="block text-xs font-medium uppercase tracking-widest text-zinc-600">
            Your Blurt (everything you remember)
          </label>
          <textarea
            id="blurt-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={8}
            placeholder="Start typing freely — don't worry about grammar or order…"
            className="mt-1.5 w-full resize-y rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm leading-relaxed text-zinc-200 placeholder:text-zinc-600 focus:border-violet-600 focus:outline-none focus:ring-1 focus:ring-violet-600"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Analyzing…
            </>
          ) : (
            <>
              <Zap className="h-4 w-4" /> Analyze with Gemini
            </>
          )}
        </button>
      </form>

      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-lg border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {feedback && (
        <article className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-6 prose prose-invert prose-sm max-w-none prose-headings:text-zinc-100 prose-p:text-zinc-300 prose-li:text-zinc-300">
          <ReactMarkdown>{feedback}</ReactMarkdown>
        </article>
      )}
    </div>
  )
}
