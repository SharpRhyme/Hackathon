import { useCallback, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Check, Copy, Sparkles, Square, Volume2, VolumeX } from 'lucide-react'
import { streamJson, streamUpload } from '../lib/api'
import { useAccessibility } from '../context/AccessibilityContext'
import { IconButton } from './ui'

// Hook that manages one streaming AI response.
// run(body, {files}) starts a request; stop() aborts it.
export function useAIStream(path) {
  const [text, setText] = useState('')
  const [status, setStatus] = useState('idle') // idle | thinking | streaming | done | error
  const [error, setError] = useState('')
  const [stages, setStages] = useState([])
  const abortRef = useRef(null)

  const stop = useCallback(() => {
    abortRef.current?.()
    abortRef.current = null
    setStatus((s) => (s === 'thinking' || s === 'streaming' ? 'done' : s))
  }, [])

  const run = useCallback(
    async (body, { files, token, path: overridePath, multipart = false } = {}) => {
      abortRef.current?.()
      setText('')
      setError('')
      setStages([])
      setStatus('thinking')

      const handlers = {
        onChunk: (chunk) => {
          setStatus('streaming')
          setText((prev) => prev + chunk)
        },
        onStage: (event) => setStages((prev) => [...prev, event]),
        onDone: () => setStatus('done'),
        onError: (message) => {
          setError(message)
          setStatus('error')
        },
        onClose: () => setStatus((s) => (s === 'thinking' || s === 'streaming' ? 'done' : s)),
      }

      const target = overridePath || path
      abortRef.current = multipart || files?.length
        ? await streamUpload(target, body, files, handlers, token)
        : await streamJson(target, body, handlers, token)
    },
    [path],
  )

  const reset = useCallback(() => {
    abortRef.current?.()
    setText('')
    setError('')
    setStages([])
    setStatus('idle')
  }, [])

  return { text, status, error, stages, run, stop, reset }
}

export function Markdown({ children }) {
  return (
    <div className="md-body">
      <ReactMarkdown>{children}</ReactMarkdown>
    </div>
  )
}

// The rolling AI response bubble: thinking shimmer, streamed markdown with a
// caret, then an action bar (copy, read aloud, stop) once complete.
export default function AIOutput({
  text,
  status,
  error,
  onStop,
  thinkingLabel = 'Thinking it through',
  compact = false,
}) {
  const { speak, stopSpeaking } = useAccessibility()
  const [copied, setCopied] = useState(false)
  const [reading, setReading] = useState(false)

  if (status === 'idle') return null

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // Clipboard blocked; nothing else to do.
    }
  }

  const toggleRead = () => {
    if (reading) {
      stopSpeaking()
      setReading(false)
    } else {
      speak(text.slice(0, 4000), () => setReading(false))
      setReading(true)
    }
  }

  return (
    <div className={`animate-fade-up ${compact ? '' : 'mt-5'}`} aria-live="polite">
      <div className="flex items-start gap-3">
        <span
          className={`mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-clay to-gold text-white shadow-card ${
            status === 'thinking' || status === 'streaming' ? 'animate-float-y' : ''
          }`}
          aria-hidden="true"
        >
          <Sparkles className="h-4 w-4" />
        </span>

        <div className="min-w-0 flex-1 rounded-card rounded-tl-md border border-line bg-raised p-4 shadow-card">
          {status === 'thinking' && (
            <div className="flex items-center gap-3 py-1">
              <span className="think-dots" aria-hidden="true">
                <span /><span /><span />
              </span>
              <span className="shimmer-text text-sm font-medium">{thinkingLabel}</span>
              {onStop && (
                <button
                  type="button"
                  onClick={onStop}
                  className="ml-auto inline-flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-xs text-faint hover:text-ink"
                >
                  <Square className="h-3 w-3" /> Stop
                </button>
              )}
            </div>
          )}

          {status === 'error' && (
            <p className="text-sm text-[rgb(148,30,30)]">{error || 'Something went wrong. Try again.'}</p>
          )}

          {(status === 'streaming' || status === 'done') && (
            <>
              <div className={status === 'streaming' ? 'stream-caret' : ''}>
                <Markdown>{text}</Markdown>
              </div>
              <div className="mt-3 flex items-center gap-1.5 border-t border-line pt-3">
                {status === 'streaming' && onStop ? (
                  <button
                    type="button"
                    onClick={onStop}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[rgb(178,42,42)]/10 px-2.5 py-1.5 text-xs font-medium text-[rgb(148,30,30)] hover:bg-[rgb(178,42,42)]/20"
                  >
                    <Square className="h-3 w-3" /> Stop generating
                  </button>
                ) : (
                  <>
                    <IconButton label={copied ? 'Copied' : 'Copy response'} onClick={copy} className="h-8 w-8">
                      {copied ? <Check className="h-3.5 w-3.5 text-moss" /> : <Copy className="h-3.5 w-3.5" />}
                    </IconButton>
                    <IconButton label={reading ? 'Stop reading aloud' : 'Read aloud'} onClick={toggleRead} className="h-8 w-8">
                      {reading ? <Volume2 className="h-3.5 w-3.5 text-clay" /> : <VolumeX className="h-3.5 w-3.5" />}
                    </IconButton>
                    <span className="ml-auto text-[10px] font-medium uppercase tracking-[0.14em] text-faint/70">
                      Gemini
                    </span>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
