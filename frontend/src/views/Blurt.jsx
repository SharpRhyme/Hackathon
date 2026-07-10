import { useEffect, useRef, useState } from 'react'
import { Eraser, Send, Timer, Zap } from 'lucide-react'
import { View, Card, Button, Field, Input, TextArea, Segmented } from '../components/ui'
import AIOutput, { useAIStream } from '../components/AIOutput'
import Mascot from '../components/Mascot'
import { logActivity } from '../lib/store'
import { useAccessibility } from '../context/AccessibilityContext'

const BLURT_SECONDS = { off: 0, short: 120, long: 300 }

export default function Blurt() {
  const [topic, setTopic] = useState('')
  const [input, setInput] = useState('')
  const [timerMode, setTimerMode] = useState('off')
  const [remaining, setRemaining] = useState(0)
  const { settings } = useAccessibility()
  const stream = useAIStream('/api/ai/stream')
  const timerRef = useRef(null)

  useEffect(() => () => clearInterval(timerRef.current), [])

  const startTimer = (mode) => {
    setTimerMode(mode)
    clearInterval(timerRef.current)
    const total = BLURT_SECONDS[mode]
    setRemaining(total)
    if (!total) return
    timerRef.current = setInterval(() => {
      setRemaining((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current)
          return 0
        }
        return s - 1
      })
    }, 1000)
  }

  const wordCount = input.trim() ? input.trim().split(/\s+/).length : 0
  const timerRunning = timerMode !== 'off' && remaining > 0

  const analyze = (e) => {
    e.preventDefault()
    if (!topic.trim() || !input.trim()) return
    clearInterval(timerRef.current)
    logActivity('blurt', `Blurted about "${topic.trim()}"`)
    stream.run({
      tool: 'blurt',
      prompt: `TOPIC: ${topic.trim()}\n\nSTUDENT BLURT:\n${input.trim()}`,
      profile: settings,
    })
  }

  return (
    <View
      icon={Zap}
      eyebrow="Study method"
      title="Blurt Method"
      description="Close your notes. Write everything you remember about a topic, then let Gemini celebrate what stuck and show exactly what to revisit."
      actions={<Mascot pose="focus" size={4} />}
    >
      <Card className="animate-fade-up">
        <form onSubmit={analyze} className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-52 flex-1">
              <Field label="Topic">
                <Input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. The water cycle"
                  required
                />
              </Field>
            </div>
            <div className="flex items-center gap-3">
              <Segmented
                label="Blurt timer"
                value={timerMode}
                onChange={startTimer}
                options={[
                  { value: 'off', label: 'No timer' },
                  { value: 'short', label: '2 min' },
                  { value: 'long', label: '5 min' },
                ]}
              />
              {timerMode !== 'off' && (
                <span
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 font-mono text-sm font-semibold tabular-nums ${
                    timerRunning ? 'bg-clay-wash text-clay-deep' : 'bg-sunken text-faint'
                  }`}
                  role="timer"
                  aria-label="Blurt timer"
                >
                  <Timer className="h-3.5 w-3.5" aria-hidden="true" />
                  {String(Math.floor(remaining / 60)).padStart(2, '0')}:{String(remaining % 60).padStart(2, '0')}
                </span>
              )}
            </div>
          </div>

          <Field label="Your blurt" hint="no notes allowed, spelling does not matter">
            <TextArea
              rows={9}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Start typing freely. Do not stop to check anything, just empty your brain onto the page..."
              required
            />
          </Field>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={stream.status === 'thinking' || stream.status === 'streaming'}>
              <Send className="h-4 w-4" /> Analyze my blurt
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setInput('')
                stream.reset()
              }}
            >
              <Eraser className="h-4 w-4" /> Clear
            </Button>
            <span className="ml-auto text-xs tabular-nums text-faint">{wordCount} words</span>
          </div>
        </form>
      </Card>

      <AIOutput
        text={stream.text}
        status={stream.status}
        error={stream.error}
        onStop={stream.stop}
        thinkingLabel="Reading your blurt"
      />
    </View>
  )
}
