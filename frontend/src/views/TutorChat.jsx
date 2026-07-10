import { useEffect, useRef, useState } from 'react'
import {
  Bot,
  CreditCard,
  Headphones,
  Library,
  Mic,
  MicOff,
  Network,
  Paperclip,
  RotateCcw,
  Send,
  Sparkles,
  Square,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import { Chip, IconButton, Button } from '../components/ui'
import { Markdown } from '../components/AIOutput'
import Mascot from '../components/Mascot'
import { streamJson, streamUpload } from '../lib/api'
import { useStoredState, buildStudyContext, logActivity } from '../lib/store'
import { useAccessibility } from '../context/AccessibilityContext'

const SUGGESTIONS = [
  'Quiz me on my flashcards',
  'Explain my latest notes like I am 12',
  'Help me plan tonight of revision',
  'I am stuck on quadratic equations',
]

export default function TutorChat() {
  const [messages, setMessages] = useStoredState('ld.chat', [])
  const [input, setInput] = useState('')
  const [files, setFiles] = useState([])
  const [sources, setSources] = useState({ decks: true, books: true, maps: false })
  const [busy, setBusy] = useState(false)
  const [listening, setListening] = useState(false)
  const [speakReplies, setSpeakReplies] = useState(false)
  const [autoVoice, setAutoVoice] = useState(false)
  const [liveVoice, setLiveVoice] = useState('Kore')
  const [latencyMode, setLatencyMode] = useState('fastest')
  const [liveConfig, setLiveConfig] = useState(null)
  const [voiceStatus, setVoiceStatus] = useState('')
  const { settings, speak, stopSpeaking } = useAccessibility()
  const abortRef = useRef(null)
  const recognitionRef = useRef(null)
  const scrollRef = useRef(null)
  const fileInput = useRef(null)
  const audioRef = useRef(null)
  const silenceTimerRef = useRef(null)
  const liveListeningRef = useRef(false)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  useEffect(() => () => {
    liveListeningRef.current = false
    abortRef.current?.()
    recognitionRef.current?.stop?.()
    audioRef.current?.pause?.()
    window.clearTimeout(silenceTimerRef.current)
  }, [])

  useEffect(() => {
    let ignore = false
    fetch('/api/live/config')
      .then((res) => res.json())
      .then((data) => {
        if (ignore) return
        setLiveConfig(data)
        setLiveVoice(data.default_voice || 'Kore')
      })
      .catch(() => {})
    return () => {
      ignore = true
    }
  }, [])

  const stopGeneratedAudio = () => {
    audioRef.current?.pause?.()
    audioRef.current = null
    stopSpeaking()
  }

  const interruptLiveReply = () => {
    stopGeneratedAudio()
    abortRef.current?.()
    setMessages((prev) => prev.map((m) => (m.pending ? { ...m, pending: false } : m)))
    setBusy(false)
  }

  const speakWithGemini = async (text) => {
    stopGeneratedAudio()
    setVoiceStatus('Speaking')
    try {
      const res = await fetch('/api/voice/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.slice(0, 2400),
          voice: liveVoice,
          style: latencyMode === 'fastest'
            ? 'Speak like a concise study tutor. Keep the pace brisk and natural.'
            : 'Speak like a warm, patient study tutor.',
        }),
      })
      if (!res.ok) throw new Error('Gemini voice unavailable')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => {
        URL.revokeObjectURL(url)
        if (audioRef.current === audio) audioRef.current = null
        setVoiceStatus('')
      }
      audio.onerror = () => {
        URL.revokeObjectURL(url)
        setVoiceStatus('')
        speak(text.slice(0, 3000))
      }
      await audio.play()
    } catch {
      setVoiceStatus('')
      speak(text.slice(0, 3000))
    }
  }

  const toggleMic = () => {
    if (listening) {
      liveListeningRef.current = false
      window.clearTimeout(silenceTimerRef.current)
      recognitionRef.current?.stop()
      setListening(false)
      return
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      window.alert('Voice input is not supported in this browser. Try Chrome or Edge.')
      return
    }
    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-GB'
    recognition.onresult = (event) => {
      if (busy || audioRef.current) interruptLiveReply()
      let transcript = input
      let finalChunk = ''
      let hasFinal = false
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i]
        const phrase = result[0].transcript
        transcript = result.isFinal ? phrase : phrase
        if (result.isFinal) hasFinal = true
        if (result.isFinal) finalChunk += phrase
      }
      const cleaned = transcript.trim()
      setInput(cleaned)
      if (autoVoice && hasFinal && finalChunk.trim()) {
        window.clearTimeout(silenceTimerRef.current)
        const turnText = finalChunk.trim()
        silenceTimerRef.current = window.setTimeout(() => {
          if (!busy) send(turnText)
        }, latencyMode === 'fastest' ? 450 : 850)
      }
    }
    recognition.onend = () => {
      if (liveListeningRef.current) {
        window.setTimeout(() => {
          try {
            recognition.start()
            setListening(true)
          } catch {
            setListening(false)
          }
        }, 300)
      } else {
        setListening(false)
      }
    }
    recognition.onerror = () => {
      liveListeningRef.current = false
      setListening(false)
    }
    recognitionRef.current = recognition
    liveListeningRef.current = true
    recognition.start()
    setListening(true)
  }

  const send = async (rawText) => {
    const text = (rawText ?? input).trim()
    if ((!text && files.length === 0) || busy) return
    recognitionRef.current?.stop()

    const userMessage = {
      id: Date.now(),
      role: 'user',
      text: text || '(sent attachments)',
      attachments: files.map((f) => f.name),
    }
    const aiId = Date.now() + 1
    const priorMessages = messages
    setMessages((prev) => [...prev, userMessage, { id: aiId, role: 'ai', text: '', pending: true }])
    setInput('')
    setBusy(true)
    logActivity('tutor', `Asked Study Chat: ${text.slice(0, 60) || 'attachments'}`)

    const context = buildStudyContext(sources)
    const body = {
      tool: 'chat',
      prompt: text,
      context,
      profile: { ...settings, liveVoice, latencyMode },
      messages: priorMessages.slice(-16).map((m) => ({ role: m.role === 'user' ? 'user' : 'model', text: m.text })),
    }

    let full = ''
    const handlers = {
      onChunk: (chunk) => {
        full += chunk
        setMessages((prev) => prev.map((m) => (m.id === aiId ? { ...m, text: full } : m)))
      },
      onError: (message) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === aiId ? { ...m, pending: false, error: true, text: m.text || message } : m)),
        )
        setBusy(false)
      },
      onDone: () => {},
      onClose: () => {
        setMessages((prev) => prev.map((m) => (m.id === aiId ? { ...m, pending: false } : m)))
        setBusy(false)
        if (speakReplies && full) speakWithGemini(full)
      },
    }

    const currentFiles = files
    setFiles([])
    abortRef.current = currentFiles.length
      ? await streamUpload('/api/chat/stream', body, currentFiles, handlers)
      : await streamJson('/api/ai/stream', body, handlers)
  }

  const stop = () => {
    abortRef.current?.()
    stopGeneratedAudio()
    setMessages((prev) => prev.map((m) => (m.pending ? { ...m, pending: false } : m)))
    setBusy(false)
  }

  const clearChat = () => {
    if (messages.length === 0 || window.confirm('Clear this conversation?')) {
      stopSpeaking()
      setMessages([])
    }
  }

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col px-6">
      <header className="flex items-center justify-between border-b border-line py-4">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-clay-wash text-clay">
            <Bot className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h1 className="font-display text-xl font-semibold text-ink">Study Chat</h1>
            <p className="text-xs text-faint">Knows your decks and notebooks when you let it.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Mascot pose={busy ? 'think' : 'type'} size={3} className="hidden sm:block" />
          <IconButton
            label={speakReplies ? 'Stop speaking replies' : 'Speak replies aloud'}
            className={speakReplies ? 'border-clay bg-clay-wash text-clay' : ''}
            onClick={() => {
              if (speakReplies) stopSpeaking()
              setSpeakReplies((v) => !v)
            }}
          >
            {speakReplies ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </IconButton>
          <IconButton label="Clear conversation" onClick={clearChat}>
            <RotateCcw className="h-4 w-4" />
          </IconButton>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto py-6 scrollbar-thin" aria-live="polite">
        {messages.length === 0 && (
          <div className="grid place-items-center pt-16 text-center animate-fade-up">
            <Mascot pose="wave" size={6} />
            <h2 className="mt-4 font-display text-2xl font-semibold text-ink">What are we working on?</h2>
            <p className="mt-1 max-w-sm text-sm text-faint">
              Ask anything, attach photos of homework, or use the mic. Toggle your study sources below so answers use your own material.
            </p>
            <div className="mt-5 flex max-w-md flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <Chip key={s} onClick={() => send(s)}>
                  {s}
                </Chip>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) =>
          message.role === 'user' ? (
            <div key={message.id} className="flex justify-end animate-fade-up">
              <div className="max-w-[85%] rounded-card rounded-tr-md bg-clay px-4 py-3 text-sm leading-relaxed text-white shadow-card">
                <p className="whitespace-pre-wrap">{message.text}</p>
                {message.attachments?.length > 0 && (
                  <p className="mt-1.5 border-t border-white/25 pt-1.5 text-xs text-white/80">
                    {message.attachments.join(', ')}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div key={message.id} className="flex items-start gap-3 animate-fade-up">
              <span
                className={`mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-clay to-gold text-white shadow-card ${
                  message.pending ? 'animate-float-y' : ''
                }`}
                aria-hidden="true"
              >
                <Sparkles className="h-4 w-4" />
              </span>
              <div
                className={`min-w-0 max-w-[85%] rounded-card rounded-tl-md border bg-raised px-4 py-3 shadow-card ${
                  message.error ? 'border-[rgb(178,42,42)]/40' : 'border-line'
                }`}
              >
                {message.pending && !message.text ? (
                  <span className="think-dots py-1" aria-label="Thinking">
                    <span /><span /><span />
                  </span>
                ) : (
                  <div className={message.pending ? 'stream-caret' : ''}>
                    <Markdown>{message.text}</Markdown>
                  </div>
                )}
              </div>
            </div>
          ),
        )}
      </div>

      <div className="border-t border-line pb-5 pt-3">
        <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[10px] font-bold uppercase tracking-[0.16em] text-faint">Sources</span>
          <Chip active={sources.decks} onClick={() => setSources((s) => ({ ...s, decks: !s.decks }))}>
            <CreditCard className="h-3 w-3" /> Flashcards
          </Chip>
          <Chip active={sources.books} onClick={() => setSources((s) => ({ ...s, books: !s.books }))}>
            <Library className="h-3 w-3" /> Bookshelf
          </Chip>
          <Chip active={sources.maps} onClick={() => setSources((s) => ({ ...s, maps: !s.maps }))}>
            <Network className="h-3 w-3" /> Mind maps
          </Chip>
        </div>

        <div className="mb-2.5 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-raised/80 p-2">
          <span className="inline-flex items-center gap-1.5 px-1 text-[10px] font-bold uppercase tracking-[0.16em] text-faint">
            <Headphones className="h-3.5 w-3.5" /> Live voice
          </span>
          <select
            value={liveVoice}
            onChange={(e) => setLiveVoice(e.target.value)}
            className="h-8 rounded-lg border border-line bg-paper px-2 text-xs font-medium text-soft focus:border-clay focus:outline-none"
            aria-label="Gemini Live voice"
          >
            {(liveConfig?.voices || [{ name: 'Kore', label: 'Kore', tone: 'clear and steady' }]).map((voice) => (
              <option key={voice.name} value={voice.name}>
                {voice.label} · {voice.tone}
              </option>
            ))}
          </select>
          <select
            value={latencyMode}
            onChange={(e) => setLatencyMode(e.target.value)}
            className="h-8 rounded-lg border border-line bg-paper px-2 text-xs font-medium text-soft focus:border-clay focus:outline-none"
            aria-label="Live voice latency"
          >
            <option value="fastest">Fastest</option>
            <option value="balanced">Balanced</option>
          </select>
          <Chip active={autoVoice} onClick={() => setAutoVoice((v) => !v)}>
            Auto-turn
          </Chip>
          {voiceStatus && <span className="text-xs font-medium text-clay">{voiceStatus}</span>}
        </div>

        {files.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {files.map((file, i) => (
              <span key={`${file.name}-${i}`} className="inline-flex items-center gap-1 rounded-lg bg-sunken px-2 py-1 text-xs text-soft">
                {file.name.length > 26 ? `${file.name.slice(0, 24)}...` : file.name}
                <button
                  type="button"
                  aria-label={`Remove ${file.name}`}
                  onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                  className="text-faint hover:text-ink"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault()
            send()
          }}
          className="flex items-end gap-2 rounded-card border border-line bg-raised p-2 shadow-card focus-within:border-clay"
        >
          <input
            ref={fileInput}
            type="file"
            multiple
            accept="image/*,.pdf,.txt,.md,audio/*,video/*"
            className="sr-only"
            onChange={(e) => setFiles((prev) => [...prev, ...Array.from(e.target.files || [])])}
          />
          <IconButton label="Attach files or photos" className="border-0" onClick={() => fileInput.current?.click()}>
            <Paperclip className="h-4 w-4" />
          </IconButton>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            rows={Math.min(5, Math.max(1, input.split('\n').length))}
            placeholder={listening ? 'Listening... speak now' : 'Message Study Chat...'}
            className="max-h-40 flex-1 resize-none bg-transparent px-1 py-2 text-sm text-ink placeholder:text-faint/70 focus:outline-none"
            aria-label="Message"
          />
          <IconButton
            label={listening ? 'Stop voice input' : 'Speak your message'}
            className={`border-0 ${listening ? 'bg-clay-wash text-clay' : ''}`}
            onClick={toggleMic}
          >
            {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </IconButton>
          {busy ? (
            <Button variant="danger" onClick={stop} aria-label="Stop generating">
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="submit" disabled={!input.trim() && files.length === 0} aria-label="Send message">
              <Send className="h-4 w-4" />
            </Button>
          )}
        </form>
        <p className="mt-2 text-center text-[11px] text-faint/70">
          Gemini can make mistakes. Check anything that matters.
        </p>
      </div>
    </div>
  )
}
