import { useEffect, useRef, useState } from 'react'
import { Pause, Play, RotateCcw, Square, Timer } from 'lucide-react'
import { View, Card, Button, Field, Input, Chip, ProgressRing } from '../components/ui'
import Mascot from '../components/Mascot'
import { useStoredState, logActivity } from '../lib/store'

const PRESETS = [
  { label: 'Quick drill', minutes: 10 },
  { label: 'Exam question', minutes: 15 },
  { label: 'Deep focus', minutes: 25 },
  { label: 'Full section', minutes: 45 },
]

export default function TimedPractice() {
  const [task, setTask] = useState('Answer one exam question')
  const [minutes, setMinutes] = useState(15)
  const [secondsLeft, setSecondsLeft] = useState(15 * 60)
  const [state, setState] = useState('idle') // idle | running | paused | finished
  const [sessions, setSessions] = useStoredState('learndifferent.sessions', [])
  const intervalRef = useRef(null)
  const stateRef = useRef(state)
  stateRef.current = state

  const totalSeconds = minutes * 60

  useEffect(() => () => clearInterval(intervalRef.current), [])

  useEffect(() => {
    if (state === 'idle') setSecondsLeft(minutes * 60)
  }, [minutes, state])

  const tick = () => {
    setSecondsLeft((s) => {
      if (s <= 1) {
        clearInterval(intervalRef.current)
        setState('finished')
        setSessions((prev) => [
          { id: Date.now(), task, minutes, completedAt: new Date().toISOString() },
          ...prev,
        ])
        logActivity('timed', `Finished ${minutes} min: ${task}`)
        try {
          const ctx = new (window.AudioContext || window.webkitAudioContext)()
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.frequency.value = 880
          gain.gain.setValueAtTime(0.12, ctx.currentTime)
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.1)
          osc.start()
          osc.stop(ctx.currentTime + 1.1)
        } catch {
          // No audio available; the visual state change is enough.
        }
        return 0
      }
      return s - 1
    })
  }

  const start = () => {
    if (stateRef.current === 'running') return
    clearInterval(intervalRef.current)
    intervalRef.current = setInterval(tick, 1000)
    setState('running')
    if (secondsLeft === totalSeconds) logActivity('timed', `Started ${minutes} min: ${task}`)
  }

  const pause = () => {
    clearInterval(intervalRef.current)
    setState('paused')
  }

  const stop = () => {
    clearInterval(intervalRef.current)
    setState('idle')
    setSecondsLeft(totalSeconds)
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const ss = String(secondsLeft % 60).padStart(2, '0')
  const progress = totalSeconds ? 1 - secondsLeft / totalSeconds : 0
  const running = state === 'running'

  return (
    <View
      icon={Timer}
      eyebrow="Focus"
      title="Timed Practice"
      description="Set the clock, do the work, log the session. Nothing else on the screen matters until the ring closes."
      wide
      actions={<Mascot pose={state === 'running' ? 'focus' : state === 'finished' ? 'cheer' : 'chill'} size={4} />}
    >
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="grid place-items-center py-8">
          <ProgressRing
            size={260}
            stroke={14}
            progress={progress}
            color={
              state === 'finished'
                ? 'rgb(var(--c-moss))'
                : secondsLeft <= 60 && running
                  ? 'rgb(178 42 42)'
                  : 'rgb(var(--c-clay))'
            }
          >
            <div className="text-center">
              <p
                className={`font-display text-6xl font-semibold tabular-nums ${
                  state === 'finished' ? 'text-moss' : 'text-ink'
                }`}
                role="timer"
                aria-live="off"
              >
                {mm}:{ss}
              </p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-faint">
                {state === 'finished' ? 'Done. Well held.' : state === 'paused' ? 'Paused' : running ? 'Focus' : 'Ready'}
              </p>
            </div>
          </ProgressRing>

          <div className="mt-6 flex items-center gap-3">
            {running ? (
              <Button variant="soft" size="lg" onClick={pause}>
                <Pause className="h-5 w-5" /> Pause
              </Button>
            ) : (
              <Button size="lg" onClick={state === 'finished' ? stop : start}>
                {state === 'finished' ? <RotateCcw className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                {state === 'finished' ? 'Reset' : state === 'paused' ? 'Resume' : 'Start'}
              </Button>
            )}
            {(running || state === 'paused') && (
              <Button variant="danger" size="lg" onClick={stop} aria-label="Stop and reset the timer">
                <Square className="h-5 w-5" /> Stop
              </Button>
            )}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <Field label="What are you practising?">
              <Input value={task} onChange={(e) => setTask(e.target.value)} disabled={running} />
            </Field>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {PRESETS.map((preset) => (
                <Chip
                  key={preset.label}
                  active={minutes === preset.minutes}
                  disabled={running}
                  onClick={() => setMinutes(preset.minutes)}
                >
                  {preset.label} · {preset.minutes}m
                </Chip>
              ))}
            </div>
            <div className="mt-3">
              <Field label="Custom minutes">
                <Input
                  type="number"
                  min="1"
                  max="120"
                  value={minutes}
                  disabled={running}
                  onChange={(e) => setMinutes(Math.max(1, Math.min(120, Number(e.target.value) || 1)))}
                />
              </Field>
            </div>
          </Card>

          <Card>
            <h2 className="font-display text-lg font-semibold text-ink">Recent sessions</h2>
            {sessions.length === 0 ? (
              <p className="mt-2 text-sm text-faint">Finished sessions land here automatically.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {sessions.slice(0, 6).map((session) => (
                  <li
                    key={session.id}
                    className="flex items-center justify-between rounded-xl border border-line bg-paper px-3 py-2.5 text-sm"
                  >
                    <span className="min-w-0 truncate text-soft">{session.task}</span>
                    <span className="ml-3 shrink-0 rounded-md bg-moss-wash px-2 py-0.5 text-xs font-semibold text-moss">
                      {session.minutes} min
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </View>
  )
}
