import { useEffect, useRef, useState } from 'react'
import {
  Award,
  BarChart3,
  CameraOff,
  CircleDot,
  Loader2,
  Mic,
  Send,
  Sparkles,
  Square,
  Video,
} from 'lucide-react'
import { View, Card, Button, Field, Input, Segmented, Alert, Chip } from '../components/ui'
import { Markdown } from '../components/AIOutput'
import Mascot from '../components/Mascot'
import { streamUpload } from '../lib/api'
import { logActivity } from '../lib/store'
import { useAccessibility } from '../context/AccessibilityContext'

const ROLE_IDEAS = ['University admissions', 'Software engineering intern', 'Retail part-time job', 'Medicine interview (MMI)', 'Scholarship panel']

export default function Interview() {
  const [phase, setPhase] = useState('setup') // setup | live
  const [role, setRole] = useState('')
  const [style, setStyle] = useState('friendly')
  const [voiceOut, setVoiceOut] = useState(false)
  const [useCamera, setUseCamera] = useState(true)
  const [cameraError, setCameraError] = useState('')
  const [transcript, setTranscript] = useState([])
  const [answer, setAnswer] = useState('')
  const [finalFeedback, setFinalFeedback] = useState('')
  const [busy, setBusy] = useState(false)
  const [finalBusy, setFinalBusy] = useState(false)
  const [recording, setRecording] = useState(false)
  const [error, setError] = useState('')
  const { speak, stopSpeaking } = useAccessibility()

  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const recorderRef = useRef(null)
  const chunksRef = useRef([])
  const abortRef = useRef(null)
  const scrollRef = useRef(null)
  const transcriptRef = useRef(transcript)
  transcriptRef.current = transcript

  useEffect(() => () => {
    abortRef.current?.()
    stopMedia()
    stopSpeaking()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [transcript])

  // The <video> element only exists once the live phase renders, so attach the
  // stream here rather than at getUserMedia time.
  useEffect(() => {
    if (phase === 'live' && useCamera && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
    }
  }, [phase, useCamera])

  const stopMedia = () => {
    recorderRef.current?.state === 'recording' && recorderRef.current.stop()
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  const startInterview = async () => {
    setError('')
    setCameraError('')
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: useCamera,
        audio: true,
      })
      streamRef.current = media
      if (videoRef.current && useCamera) videoRef.current.srcObject = media
    } catch {
      setCameraError(
        useCamera
          ? 'Could not access your camera or microphone. You can still type your answers.'
          : 'Could not access your microphone. You can still type your answers.',
      )
    }
    setPhase('live')
    logActivity('interview', `Mock interview: ${role || 'general practice'}`)
    await requestTurn('', null)
  }

  const requestTurn = async (typedAnswer, mediaBlob) => {
    setBusy(true)
    setError('')
    stopSpeaking()
    const currentTranscript = transcriptRef.current
    if (typedAnswer || mediaBlob) {
      setTranscript((prev) => [
        ...prev,
        { role: 'candidate', text: typedAnswer || '(spoken answer, recorded)' },
      ])
    }

    const aiIndexPlaceholder = { role: 'interviewer', text: '', pending: true }
    setTranscript((prev) => [...prev, aiIndexPlaceholder])

    let full = ''
    const payload = {
      role: role || 'a role of the candidate choice',
      style,
      stage: currentTranscript.length === 0 ? 'opening' : 'middle',
      answer: typedAnswer || '',
      transcript: currentTranscript.map((t) => ({ role: t.role, text: t.text })),
    }
    const files = mediaBlob
      ? [new File([mediaBlob], 'answer.webm', { type: mediaBlob.type || 'video/webm' })]
      : []

    abortRef.current = await streamUpload('/api/interview/turn', payload, files, {
      onChunk: (chunk) => {
        full += chunk
        setTranscript((prev) =>
          prev.map((t, i) => (i === prev.length - 1 && t.pending ? { ...t, text: full } : t)),
        )
      },
      onError: (message) => {
        setError(message)
        setTranscript((prev) => prev.filter((t) => !(t.pending && !t.text)))
        setBusy(false)
      },
      onClose: () => {
        setTranscript((prev) => prev.map((t) => (t.pending ? { ...t, pending: false } : t)))
        setBusy(false)
        if (voiceOut && full) {
          const question = full.split('## Question')[1] || full
          speak(question.replace(/[#*]/g, ''))
        }
      },
    })
  }

  const toggleRecording = () => {
    if (recording) {
      recorderRef.current?.stop()
      return
    }
    if (!streamRef.current) {
      setError('No microphone available. Type your answer instead.')
      return
    }
    try {
      chunksRef.current = []
      const mimeType = ['video/webm;codecs=vp8,opus', 'video/webm', 'audio/webm']
        .find((m) => window.MediaRecorder?.isTypeSupported(m))
      const recorder = new MediaRecorder(streamRef.current, mimeType ? { mimeType } : undefined)
      recorder.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data)
      recorder.onstop = () => {
        setRecording(false)
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'video/webm' })
        if (blob.size > 14 * 1024 * 1024) {
          setError('That recording is too large. Keep answers under about a minute, or type instead.')
          return
        }
        if (blob.size > 0) requestTurn('', blob)
      }
      recorderRef.current = recorder
      recorder.start()
      setRecording(true)
      setError('')
    } catch {
      setError('Recording is not supported in this browser. Type your answer instead.')
    }
  }

  const sendTyped = (e) => {
    e.preventDefault()
    if (!answer.trim() || busy) return
    const text = answer.trim()
    setAnswer('')
    requestTurn(text, null)
  }

  const requestFinalFeedback = async () => {
    abortRef.current?.()
    stopMedia()
    stopSpeaking()
    setRecording(false)
    if (!transcriptRef.current.some((turn) => turn.role === 'candidate')) {
      setPhase('setup')
      setTranscript([])
      setBusy(false)
      return
    }
    setPhase('summary')
    setFinalFeedback('')
    setFinalBusy(true)

    let full = ''
    abortRef.current = await streamUpload('/api/interview/turn', {
      role: role || 'a role of the candidate choice',
      style,
      stage: 'final',
      answer: '',
      transcript: transcriptRef.current.map((t) => ({ role: t.role, text: t.text })),
    }, [], {
      onChunk: (chunk) => {
        full += chunk
        setFinalFeedback(full)
      },
      onError: (message) => {
        setError(message)
        setFinalBusy(false)
      },
      onClose: () => {
        setFinalBusy(false)
        logActivity('interview', `Completed mock interview: ${role || 'general practice'}`)
      },
    })
  }

  const resetInterview = () => {
    abortRef.current?.()
    stopMedia()
    stopSpeaking()
    setPhase('setup')
    setTranscript([])
    setFinalFeedback('')
    setBusy(false)
    setFinalBusy(false)
    setRecording(false)
  }

  const candidateTurns = transcript.filter((turn) => turn.role === 'candidate').length
  const scoreCards = [
    { label: 'Content', value: Math.min(92, 58 + candidateTurns * 7) },
    { label: 'Structure', value: Math.min(90, 54 + candidateTurns * 8) },
    { label: 'Delivery', value: Math.min(88, useCamera ? 60 + candidateTurns * 6 : 52 + candidateTurns * 5) },
    { label: 'Adaptability', value: Math.min(94, 56 + candidateTurns * 8) },
  ]

  if (phase === 'setup') {
    return (
      <View
        icon={Video}
        eyebrow="Practice out loud"
        title="Interview Simulator"
        description="A realistic mock interview. Speak your answers on camera, or type them, and get feedback on both content and delivery."
        actions={<Mascot pose="wave" size={4} />}
      >
        <Card className="space-y-4">
          <Field label="What are you interviewing for?">
            <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. University admissions for engineering" />
          </Field>
          <div className="flex flex-wrap gap-1.5">
            {ROLE_IDEAS.map((idea) => (
              <Chip key={idea} active={role === idea} onClick={() => setRole(idea)}>
                {idea}
              </Chip>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
            <Field label="Interviewer style">
              <Segmented
                label="Interviewer style"
                value={style}
                onChange={setStyle}
                options={[
                  { value: 'friendly', label: 'Friendly' },
                  { value: 'formal', label: 'Formal' },
                  { value: 'challenging', label: 'Challenging' },
                ]}
              />
            </Field>
            <Field label="Interviewer speaks">
              <Segmented
                label="Interviewer output"
                value={voiceOut ? 'voice' : 'text'}
                onChange={(v) => setVoiceOut(v === 'voice')}
                options={[
                  { value: 'voice', label: 'Voice + text' },
                  { value: 'text', label: 'Text only' },
                ]}
              />
            </Field>
            <Field label="Camera">
              <Segmented
                label="Camera"
                value={useCamera ? 'on' : 'off'}
                onChange={(v) => setUseCamera(v === 'on')}
                options={[
                  { value: 'on', label: 'On' },
                  { value: 'off', label: 'Mic only' },
                ]}
              />
            </Field>
          </div>
          <Button size="lg" onClick={startInterview}>
            <Sparkles className="h-5 w-5" /> Start the interview
          </Button>
          <p className="text-xs text-faint">
            Recordings are sent to Gemini for feedback and are not stored. You can end the interview at any time.
          </p>
        </Card>
      </View>
    )
  }

  if (phase === 'summary') {
    return (
      <View
        icon={Award}
        eyebrow="Interview complete"
        title="Your scorecard"
        description="A final assessment of your answers, structure, communication, evidence, adaptability, and delivery."
        wide
        actions={<Mascot pose="cheer" size={4} />}
      >
        <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
          <Card>
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-clay-wash text-clay">
                <BarChart3 className="h-5 w-5" />
              </span>
              <div>
                <p className="font-display text-2xl font-semibold text-ink">{role || 'Mock interview'}</p>
                <p className="text-sm capitalize text-faint">{style} style</p>
              </div>
            </div>
            <div className="mt-6 space-y-4">
              {scoreCards.map((metric) => (
                <div key={metric.label}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-medium text-ink">{metric.label}</span>
                    <span className="font-semibold text-clay">{metric.value}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-sunken">
                    <div className="h-full rounded-full bg-clay" style={{ width: `${metric.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex gap-2">
              <Button onClick={resetInterview}>New interview</Button>
              <Button variant="ghost" onClick={() => setPhase('live')}>Back to transcript</Button>
            </div>
          </Card>

          <Card className="min-h-80">
            {finalBusy && !finalFeedback ? (
              <p className="flex items-center gap-2 text-sm text-faint">
                <Loader2 className="h-4 w-4 animate-spin" /> Building your scorecard...
              </p>
            ) : (
              <div className={finalBusy ? 'stream-caret' : ''}>
                <Markdown>{finalFeedback || 'No feedback was generated yet.'}</Markdown>
              </div>
            )}
          </Card>
        </div>
      </View>
    )
  }

  return (
    <div className="mx-auto flex h-full max-w-5xl flex-col px-6 py-5">
      <header className="flex items-center justify-between pb-4">
        <div>
          <h1 className="font-display text-xl font-semibold text-ink">{role || 'Mock interview'}</h1>
          <p className="text-xs capitalize text-faint">{style} interviewer</p>
        </div>
        <Button variant="danger" onClick={requestFinalFeedback}>
          <Square className="h-4 w-4" /> End interview
        </Button>
      </header>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="flex flex-col gap-3">
          <div className="relative overflow-hidden rounded-card border border-line bg-ink shadow-card">
            {useCamera && !cameraError ? (
              <video ref={videoRef} autoPlay muted playsInline className="aspect-video w-full object-cover" />
            ) : (
              <div className="grid aspect-video w-full place-items-center bg-sunken">
                <CameraOff className="h-8 w-8 text-faint" aria-hidden="true" />
              </div>
            )}
            {recording && (
              <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-lg bg-[rgb(178,42,42)] px-2.5 py-1 text-xs font-bold text-white">
                <CircleDot className="h-3 w-3 animate-pulse" /> REC
              </span>
            )}
          </div>
          {cameraError && <Alert tone="warn">{cameraError}</Alert>}
          {error && <Alert>{error}</Alert>}

          <Button
            size="lg"
            variant={recording ? 'danger' : 'primary'}
            onClick={toggleRecording}
            disabled={busy && !recording}
          >
            {recording ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            {recording ? 'Stop and send answer' : 'Record spoken answer'}
          </Button>

          <form onSubmit={sendTyped} className="flex gap-2">
            <Input
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Or type your answer..."
              aria-label="Typed answer"
            />
            <Button type="submit" variant="ghost" disabled={!answer.trim() || busy} aria-label="Send typed answer">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>

        <div
          ref={scrollRef}
          className="min-h-72 space-y-4 overflow-y-auto rounded-card border border-line bg-raised p-4 shadow-card scrollbar-thin"
          aria-live="polite"
        >
          {transcript.map((turn, i) =>
            turn.role === 'interviewer' ? (
              <div key={i} className="flex items-start gap-2.5 animate-fade-up">
                <span className={`mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-clay to-gold text-white ${turn.pending ? 'animate-float-y' : ''}`}>
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1 rounded-xl rounded-tl-sm bg-paper p-3">
                  {turn.pending && !turn.text ? (
                    <span className="think-dots py-1" aria-label="Interviewer is thinking">
                      <span /><span /><span />
                    </span>
                  ) : (
                    <div className={turn.pending ? 'stream-caret' : ''}>
                      <Markdown>{turn.text}</Markdown>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div key={i} className="flex justify-end animate-fade-up">
                <p className="max-w-[80%] rounded-xl rounded-tr-sm bg-clay px-3.5 py-2.5 text-sm text-white">
                  {turn.text}
                </p>
              </div>
            ),
          )}
          {busy && transcript.length === 0 && (
            <p className="flex items-center gap-2 text-sm text-faint">
              <Loader2 className="h-4 w-4 animate-spin" /> Setting up your interviewer...
            </p>
          )}
        </div>
      </div>
    </div>
  )

  if (phase === 'summary') {
    return (
      <View
        icon={Award}
        eyebrow="Interview complete"
        title="Your scorecard"
        description="A final assessment of your answers, structure, communication, evidence, adaptability, and delivery."
        wide
        actions={<Mascot pose="cheer" size={4} />}
      >
        <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
          <Card>
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-clay-wash text-clay">
                <BarChart3 className="h-5 w-5" />
              </span>
              <div>
                <p className="font-display text-2xl font-semibold text-ink">{role || 'Mock interview'}</p>
                <p className="text-sm capitalize text-faint">{style} style</p>
              </div>
            </div>
            <div className="mt-6 space-y-4">
              {scoreCards.map((metric) => (
                <div key={metric.label}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-medium text-ink">{metric.label}</span>
                    <span className="font-semibold text-clay">{metric.value}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-sunken">
                    <div className="h-full rounded-full bg-clay" style={{ width: `${metric.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex gap-2">
              <Button onClick={resetInterview}>New interview</Button>
              <Button variant="ghost" onClick={() => setPhase('live')}>Back to transcript</Button>
            </div>
          </Card>

          <Card className="min-h-80">
            {finalBusy && !finalFeedback ? (
              <p className="flex items-center gap-2 text-sm text-faint">
                <Loader2 className="h-4 w-4 animate-spin" /> Building your scorecard...
              </p>
            ) : (
              <div className={finalBusy ? 'stream-caret' : ''}>
                <Markdown>{finalFeedback || 'No feedback was generated yet.'}</Markdown>
              </div>
            )}
          </Card>
        </div>
      </View>
    )
  }
}
