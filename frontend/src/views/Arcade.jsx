import { useEffect, useRef, useState } from 'react'
import { Gamepad2, Pause, Play, RotateCcw, Trophy, Zap } from 'lucide-react'
import { View } from '../components/ui'
import Mascot from '../components/Mascot'
import { useStoredState, logActivity } from '../lib/store'

function beep(freq = 660, duration = 0.35) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = freq
    osc.type = 'square'
    gain.gain.setValueAtTime(0.08, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration)
    osc.start()
    osc.stop(ctx.currentTime + duration)
  } catch {
    // Audio unavailable; silent is fine.
  }
}

export default function Arcade() {
  return (
    <View
      icon={Gamepad2}
      eyebrow="Break room"
      title="Arcade & Pomodoro"
      description="Short breaks make long study possible. Run a Pomodoro cycle, then earn your five minutes in the arcade."
      actions={<Mascot pose="chill" size={4} />}
      wide
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <Pomodoro />
        <ReactionGame />
      </div>
      <MemoryMatch />
      <div className="grass-strip h-5 rounded-sm" aria-hidden="true" />
    </View>
  )
}

function Pomodoro() {
  const WORK = 25 * 60
  const BREAK = 5 * 60
  const [phase, setPhase] = useState('work')
  const [secondsLeft, setSecondsLeft] = useState(WORK)
  const [running, setRunning] = useState(false)
  const [cycles, setCycles] = useStoredState('ld.pomodoro.cycles', 0)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (!running) return undefined
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s > 1) return s - 1
        beep(phase === 'work' ? 523 : 784, 0.5)
        if (phase === 'work') {
          setCycles((c) => c + 1)
          logActivity('arcade', 'Finished a Pomodoro work block')
          setPhase('break')
          return BREAK
        }
        setPhase('work')
        return WORK
      })
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [running, phase, BREAK, WORK, setCycles])

  const total = phase === 'work' ? WORK : BREAK
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const ss = String(secondsLeft % 60).padStart(2, '0')
  const blocks = 20
  const filled = Math.round((1 - secondsLeft / total) * blocks)

  return (
    <section
      className={`pixel-panel p-6 ${phase === 'work' ? 'bg-gold-wash' : 'bg-moss-wash'}`}
      aria-label="Pomodoro timer"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-pixel text-3xl text-ink">POMODORO</h2>
        <span className="font-pixel text-xl text-soft">
          {phase === 'work' ? 'WORK TIME' : 'BREAK TIME'}
        </span>
      </div>

      <p className="mt-4 text-center font-pixel text-[5.5rem] leading-none tabular-nums text-ink" role="timer">
        {mm}:{ss}
      </p>

      <div className="mt-4 flex gap-1" aria-hidden="true">
        {Array.from({ length: blocks }).map((_, i) => (
          <span
            key={i}
            className={`h-4 flex-1 border-2 border-ink/60 ${
              i < filled ? (phase === 'work' ? 'bg-clay' : 'bg-moss') : 'bg-raised'
            }`}
          />
        ))}
      </div>

      <div className="mt-5 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => setRunning((r) => !r)}
          className={`pixel-btn flex items-center gap-2 px-5 py-2.5 font-pixel text-2xl text-white ${
            running ? 'bg-gold' : 'bg-moss'
          }`}
        >
          {running ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          {running ? 'PAUSE' : 'START'}
        </button>
        <button
          type="button"
          onClick={() => {
            setRunning(false)
            setPhase('work')
            setSecondsLeft(WORK)
          }}
          className="pixel-btn flex items-center gap-2 bg-raised px-5 py-2.5 font-pixel text-2xl text-ink"
        >
          <RotateCcw className="h-5 w-5" /> RESET
        </button>
      </div>

      <p className="mt-4 text-center font-pixel text-xl text-soft">
        TOMATOES HARVESTED: {cycles} {cycles > 0 && Array.from({ length: Math.min(cycles, 8) }).map(() => '\u{1F345}').join('')}
      </p>
    </section>
  )
}

function ReactionGame() {
  const [state, setState] = useState('idle') // idle | waiting | go | result | tooSoon
  const [ms, setMs] = useState(null)
  const [best, setBest] = useStoredState('ld.arcade.reaction', null)
  const timeoutRef = useRef(null)
  const startRef = useRef(0)

  useEffect(() => () => clearTimeout(timeoutRef.current), [])

  const arm = () => {
    setState('waiting')
    setMs(null)
    timeoutRef.current = setTimeout(() => {
      startRef.current = performance.now()
      setState('go')
      beep(880, 0.12)
    }, 1200 + Math.random() * 2600)
  }

  const click = () => {
    if (state === 'idle' || state === 'result' || state === 'tooSoon') {
      arm()
    } else if (state === 'waiting') {
      clearTimeout(timeoutRef.current)
      setState('tooSoon')
    } else if (state === 'go') {
      const time = Math.round(performance.now() - startRef.current)
      setMs(time)
      setState('result')
      if (!best || time < best) setBest(time)
    }
  }

  const labels = {
    idle: 'CLICK TO PLAY',
    waiting: 'WAIT FOR GREEN...',
    go: 'CLICK NOW!',
    result: `${ms} MS${best && ms <= best ? ' - NEW BEST!' : ''}`,
    tooSoon: 'TOO SOON! AGAIN?',
  }

  return (
    <section className="pixel-panel flex flex-col bg-sky-wash p-6" aria-label="Reaction time game">
      <div className="flex items-center justify-between">
        <h2 className="font-pixel text-3xl text-ink">REFLEX TEST</h2>
        <span className="flex items-center gap-1.5 font-pixel text-xl text-soft">
          <Trophy className="h-4 w-4 text-gold" aria-hidden="true" /> BEST: {best ? `${best} MS` : '---'}
        </span>
      </div>
      <button
        type="button"
        onClick={click}
        className={`pixel-btn mt-4 flex-1 min-h-52 w-full font-pixel text-4xl text-white transition-colors ${
          state === 'go'
            ? 'bg-moss'
            : state === 'waiting'
              ? 'bg-clay'
              : state === 'tooSoon'
                ? 'bg-berry'
                : 'bg-sky'
        }`}
      >
        {labels[state]}
      </button>
      <p className="mt-3 text-center font-pixel text-lg text-faint">
        WAIT FOR GREEN. UNDER 250 MS IS SHARP.
      </p>
    </section>
  )
}

const EMOJI = ['\u{1F4DA}', '\u{1F9E0}', '\u{270F}\u{FE0F}', '\u{1F52C}', '\u{1F30B}', '\u{1F9EA}', '\u{1F4D0}', '\u{1F3AF}']

function shuffled() {
  const deck = [...EMOJI, ...EMOJI]
    .map((face, i) => ({ id: i, face, matched: false }))
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return deck
}

function MemoryMatch() {
  const [cards, setCards] = useState(shuffled)
  const [open, setOpen] = useState([])
  const [moves, setMoves] = useState(0)
  const [lock, setLock] = useState(false)
  const won = cards.every((c) => c.matched)

  const flip = (card) => {
    if (lock || card.matched || open.includes(card.id) || open.length === 2) return
    const nextOpen = [...open, card.id]
    setOpen(nextOpen)
    if (nextOpen.length === 2) {
      setMoves((m) => m + 1)
      const [a, b] = nextOpen.map((id) => cards.find((c) => c.id === id))
      if (a.face === b.face) {
        beep(784, 0.15)
        setCards((prev) => prev.map((c) => (c.face === a.face ? { ...c, matched: true } : c)))
        setOpen([])
      } else {
        setLock(true)
        setTimeout(() => {
          setOpen([])
          setLock(false)
        }, 750)
      }
    }
  }

  const reset = () => {
    setCards(shuffled())
    setOpen([])
    setMoves(0)
  }

  return (
    <section className="pixel-panel bg-berry-wash p-6" aria-label="Memory match game">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-pixel text-3xl text-ink">MEMORY MATCH</h2>
        <div className="flex items-center gap-3">
          <span className="font-pixel text-xl text-soft">MOVES: {moves}</span>
          <button type="button" onClick={reset} className="pixel-btn bg-raised px-4 py-1.5 font-pixel text-xl text-ink">
            NEW GAME
          </button>
        </div>
      </div>

      {won ? (
        <div className="mt-6 grid place-items-center py-10 text-center animate-pop-in">
          <Zap className="h-10 w-10 text-gold" aria-hidden="true" />
          <p className="mt-2 font-pixel text-4xl text-ink">YOU WIN IN {moves} MOVES!</p>
          <p className="mt-1 font-pixel text-xl text-faint">MEMORY LIKE A FLASHCARD CHAMPION</p>
        </div>
      ) : (
        <div className="mx-auto mt-5 grid max-w-lg grid-cols-4 gap-2.5">
          {cards.map((card) => {
            const showing = card.matched || open.includes(card.id)
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => flip(card)}
                aria-label={showing ? `Card showing ${card.face}` : 'Hidden card'}
                className={`pixel-btn grid aspect-square place-items-center text-3xl transition-colors ${
                  card.matched ? 'bg-moss-wash' : showing ? 'bg-raised' : 'bg-berry hover:brightness-110'
                }`}
              >
                <span className={showing ? '' : 'opacity-0'} aria-hidden="true">
                  {card.face}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}
