import { useState } from 'react'
import { Link2, Loader2, Sparkles, AlertCircle, Copy, Check, Volume2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { useAccessibility } from '../context/AccessibilityContext'

export default function GeminiURLCrawler() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [copied, setCopied] = useState(false)
  const { speak } = useAccessibility()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!url.trim()) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/gemini/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Request failed')

      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!result?.data) return
    await navigator.clipboard.writeText(result.data)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleReadAloud = () => {
    if (result?.data) speak(result.data.slice(0, 2000))
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <header>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-violet-400" aria-hidden="true" />
          <h1 className="text-xl font-semibold text-zinc-100">URL Study Generator</h1>
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          Paste any article or webpage URL. Gemini crawls the content and builds adaptive study
          questions tailored for neurodivergent learners.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-3">
        <label htmlFor="url-input" className="block text-xs font-medium uppercase tracking-widest text-zinc-600">
          Webpage URL
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Link2
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600"
              aria-hidden="true"
            />
            <input
              id="url-input"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://en.wikipedia.org/wiki/Photosynthesis"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 py-2.5 pl-10 pr-4 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-violet-600 focus:outline-none focus:ring-1 focus:ring-violet-600"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Crawling…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Generate
              </>
            )}
          </button>
        </div>
      </form>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-300"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Something went wrong</p>
            <p className="mt-1 text-red-400/80">{error}</p>
            {error.includes('API key') && (
              <p className="mt-2 text-xs text-red-400/60">
                Set <code className="rounded bg-red-950 px-1">GEMINI_API_KEY</code> in your backend
                environment and restart the server.
              </p>
            )}
          </div>
        </div>
      )}

      {result && (
        <article className="rounded-lg border border-zinc-800 bg-zinc-900/40">
          <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
            <div>
              <p className="text-xs text-zinc-500">Generated from</p>
              <a
                href={result.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-violet-400 hover:underline"
              >
                {result.source_url}
              </a>
              <p className="mt-0.5 text-[10px] text-zinc-600">
                {result.chars_scraped?.toLocaleString()} characters scraped
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleReadAloud}
                className="flex items-center gap-1.5 rounded-md border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800"
                aria-label="Read aloud"
              >
                <Volume2 className="h-3.5 w-3.5" /> Read
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 rounded-md border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-green-400" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" /> Copy
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="prose prose-invert prose-sm max-w-none p-6 prose-headings:text-zinc-100 prose-p:text-zinc-300 prose-li:text-zinc-300 prose-strong:text-zinc-200">
            <ReactMarkdown>{result.data}</ReactMarkdown>
          </div>
        </article>
      )}

      {!result && !loading && !error && (
        <div className="rounded-lg border border-dashed border-zinc-800 p-8 text-center">
          <Link2 className="mx-auto h-8 w-8 text-zinc-700" aria-hidden="true" />
          <p className="mt-3 text-sm text-zinc-500">
            Paste a URL above to generate accessible study materials powered by Gemini.
          </p>
        </div>
      )}
    </div>
  )
}
