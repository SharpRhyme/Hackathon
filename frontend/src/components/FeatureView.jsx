import { useEffect, useMemo, useState } from 'react'
import {
  Atom,
  Beaker,
  BookMarked,
  Calculator,
  Check,
  Copy,
  CreditCard,
  FileText,
  FlaskConical,
  FlipHorizontal2,
  Loader2,
  Network,
  PenLine,
  Plus,
  Route,
  Save,
  Sparkles,
  StickyNote,
  Timer,
  Trash2,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { ICONS } from './Sidebar'
import { useAuth } from '../context/AuthContext'
import { useAccessibility } from '../context/AccessibilityContext'

const sampleEssays = [
  {
    title: 'Macbeth: ambition paragraph',
    subject: 'English Literature',
    text:
      'Shakespeare presents ambition as a force that corrupts judgement. At the start of the play, Macbeth is praised as brave, but the witches give his private desire a dangerous shape. The phrase "vaulting ambition" shows that Macbeth understands the risk, yet he still chooses violence. This makes his downfall feel self-inflicted rather than accidental.',
    notes: ['Clear claim in sentence 1', 'Short quotation', 'Explains effect on character and reader'],
  },
  {
    title: 'Photosynthesis explanation',
    subject: 'Biology',
    text:
      'Photosynthesis is the process plants use to convert light energy into chemical energy. Chlorophyll absorbs light, while carbon dioxide and water are converted into glucose and oxygen. Glucose stores energy for growth, and oxygen is released as a waste product.',
    notes: ['Defines the process first', 'Keeps sequence chronological', 'Names inputs and outputs'],
  },
]

const defaultCards = [
  { id: 1, front: 'What is active recall?', back: 'Retrieving information from memory to strengthen learning.', box: 1, due: Date.now() },
  { id: 2, front: 'What is the Cornell method?', back: 'A notes page split into cues, notes, and summary.', box: 1, due: Date.now() },
]

function useStoredState(key, fallback) {
  const [value, setValue] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback
    } catch {
      return fallback
    }
  })

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value))
  }, [key, value])

  return [value, setValue]
}

function Panel({ title, description, icon: Icon = Sparkles, children, wide = false }) {
  return (
    <div className={`mx-auto space-y-6 p-6 ${wide ? 'max-w-6xl' : 'max-w-3xl'}`}>
      <header>
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-violet-400" aria-hidden="true" />
          <h1 className="text-xl font-semibold text-zinc-100">{title}</h1>
        </div>
        {description && <p className="mt-1 text-sm text-zinc-500">{description}</p>}
      </header>
      {children}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-widest text-zinc-600">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  )
}

function TextInput(props) {
  return (
    <input
      {...props}
      className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-violet-600 focus:outline-none focus:ring-1 focus:ring-violet-600"
    />
  )
}

function TextArea(props) {
  return (
    <textarea
      {...props}
      className="w-full resize-y rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm leading-relaxed text-zinc-200 placeholder:text-zinc-600 focus:border-violet-600 focus:outline-none focus:ring-1 focus:ring-violet-600"
    />
  )
}

function PrimaryButton({ children, className = '', ...props }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  )
}

function Dashboard() {
  const [cards] = useStoredState('learndifferent.flashcards', defaultCards)
  const [notes] = useStoredState('learndifferent.cornell', [])
  const [sessions] = useStoredState('learndifferent.sessions', [])
  const dueCards = cards.filter((card) => card.due <= Date.now()).length

  return (
    <Panel title="Dashboard" description="Your local learning overview." icon={ICONS.dashboard}>
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ['Cards due', dueCards],
          ['Saved notes', notes.length],
          ['Practice sessions', sessions.length],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
            <p className="text-2xl font-semibold text-zinc-100">{value}</p>
            <p className="mt-1 text-xs text-zinc-500">{label}</p>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
        <h2 className="text-sm font-semibold text-zinc-100">Next best action</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Review due flashcards, run a timed session, or open the adaptive path generator after logging in.
        </p>
      </div>
    </Panel>
  )
}

function Flashcards() {
  const [cards, setCards] = useStoredState('learndifferent.flashcards', defaultCards)
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const dueCards = cards.filter((card) => card.due <= Date.now())
  const current = dueCards[index % Math.max(dueCards.length, 1)]

  const addCard = (e) => {
    e.preventDefault()
    if (!front.trim() || !back.trim()) return
    setCards((prev) => [...prev, { id: Date.now(), front, back, box: 1, due: Date.now() }])
    setFront('')
    setBack('')
  }

  const grade = (known) => {
    if (!current) return
    const intervals = [0, 1, 3, 7, 14, 30]
    setCards((prev) =>
      prev.map((card) => {
        if (card.id !== current.id) return card
        const box = known ? Math.min(card.box + 1, 5) : 1
        return { ...card, box, due: Date.now() + intervals[box] * 24 * 60 * 60 * 1000 }
      }),
    )
    setFlipped(false)
    setIndex((i) => i + 1)
  }

  return (
    <Panel title="Flashcards" description="A local spaced repetition deck with due dates." icon={CreditCard}>
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5">
          <p className="text-xs uppercase tracking-widest text-zinc-600">{dueCards.length} cards due now</p>
          {current ? (
            <>
              <button
                type="button"
                onClick={() => setFlipped((v) => !v)}
                className="mt-4 flex min-h-48 w-full items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 p-6 text-center text-lg text-zinc-100"
              >
                {flipped ? current.back : current.front}
              </button>
              <div className="mt-4 flex flex-wrap gap-2">
                <PrimaryButton type="button" onClick={() => setFlipped((v) => !v)}>
                  <FlipHorizontal2 className="h-4 w-4" /> Flip
                </PrimaryButton>
                <button type="button" onClick={() => grade(false)} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800">
                  Again
                </button>
                <button type="button" onClick={() => grade(true)} className="rounded-lg border border-emerald-700 px-4 py-2 text-sm text-emerald-300 hover:bg-emerald-950/30">
                  I knew it
                </button>
              </div>
            </>
          ) : (
            <p className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 p-6 text-sm text-zinc-400">
              No cards are due. Add a card or come back after the next interval.
            </p>
          )}
        </section>
        <form onSubmit={addCard} className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-5">
          <Field label="Front"><TextInput value={front} onChange={(e) => setFront(e.target.value)} placeholder="Question or prompt" /></Field>
          <Field label="Back"><TextArea rows={4} value={back} onChange={(e) => setBack(e.target.value)} placeholder="Answer" /></Field>
          <PrimaryButton type="submit"><Plus className="h-4 w-4" /> Add card</PrimaryButton>
        </form>
      </div>
    </Panel>
  )
}

function ExemplarEssays() {
  return (
    <Panel title="Exemplar Essays" description="Read model paragraphs with visible structure annotations." icon={FileText}>
      <div className="space-y-4">
        {sampleEssays.map((essay) => (
          <article key={essay.title} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5">
            <p className="text-xs uppercase tracking-widest text-zinc-600">{essay.subject}</p>
            <h2 className="mt-1 text-lg font-semibold text-zinc-100">{essay.title}</h2>
            <p className="mt-3 leading-relaxed text-zinc-300">{essay.text}</p>
            <ul className="mt-4 grid gap-2 sm:grid-cols-3">
              {essay.notes.map((note) => (
                <li key={note} className="rounded-md border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-400">{note}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
      <AIBox tool="exemplar" title="Generate a new exemplar" placeholder="Topic, exam board, or question..." />
    </Panel>
  )
}

function TimedPractice() {
  const [minutes, setMinutes] = useState(15)
  const [task, setTask] = useState('Answer one exam question')
  const [seconds, setSeconds] = useState(15 * 60)
  const [running, setRunning] = useState(false)
  const [sessions, setSessions] = useStoredState('learndifferent.sessions', [])

  useEffect(() => {
    setSeconds(minutes * 60)
  }, [minutes])

  useEffect(() => {
    if (!running) return undefined
    const id = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          setRunning(false)
          setSessions((prev) => [{ id: Date.now(), task, minutes, completedAt: new Date().toISOString() }, ...prev])
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [running, minutes, task, setSessions])

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')

  return (
    <Panel title="Timed Practice" description="Run focused practice blocks with a logged history." icon={Timer}>
      <section className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5">
        <Field label="Practice task"><TextInput value={task} onChange={(e) => setTask(e.target.value)} /></Field>
        <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto]">
          <Field label="Minutes"><TextInput type="number" min="1" max="90" value={minutes} onChange={(e) => setMinutes(Number(e.target.value) || 1)} /></Field>
          <div className="text-6xl font-semibold tabular-nums text-zinc-100">{mm}:{ss}</div>
        </div>
        <div className="mt-4 flex gap-2">
          <PrimaryButton type="button" onClick={() => setRunning((v) => !v)}>{running ? 'Pause' : 'Start'}</PrimaryButton>
          <button type="button" onClick={() => { setRunning(false); setSeconds(minutes * 60) }} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800">Reset</button>
        </div>
      </section>
      <section className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-5">
        <h2 className="text-sm font-semibold text-zinc-100">Recent sessions</h2>
        <ul className="mt-3 space-y-2">
          {sessions.slice(0, 5).map((session) => (
            <li key={session.id} className="flex justify-between rounded-md border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-400">
              <span>{session.task}</span><span>{session.minutes} min</span>
            </li>
          ))}
        </ul>
      </section>
    </Panel>
  )
}

function MindMap() {
  const [nodes, setNodes] = useStoredState('learndifferent.mindmap', [
    { id: 1, label: 'Main idea', x: 50, y: 50 },
    { id: 2, label: 'Evidence', x: 25, y: 25 },
    { id: 3, label: 'Example', x: 75, y: 25 },
  ])
  const [label, setLabel] = useState('')

  const addNode = (e) => {
    e.preventDefault()
    if (!label.trim()) return
    const angle = nodes.length * 1.7
    setNodes((prev) => [...prev, { id: Date.now(), label, x: 50 + Math.cos(angle) * 32, y: 50 + Math.sin(angle) * 32 }])
    setLabel('')
  }

  return (
    <Panel title="Mind Map" description="Build a simple concept map and keep it in local storage." icon={Network} wide>
      <form onSubmit={addNode} className="flex gap-2">
        <TextInput value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Add a concept" />
        <PrimaryButton type="submit"><Plus className="h-4 w-4" /> Add</PrimaryButton>
      </form>
      <div className="relative h-[520px] overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
        <svg className="h-full w-full" role="img" aria-label="Mind map canvas">
          {nodes.slice(1).map((node) => (
            <line key={`line-${node.id}`} x1="50%" y1="50%" x2={`${node.x}%`} y2={`${node.y}%`} stroke="#3f3f46" />
          ))}
        </svg>
        {nodes.map((node) => (
          <div
            key={node.id}
            className="absolute max-w-48 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-violet-900/60 bg-zinc-900 px-3 py-2 text-center text-sm text-zinc-200"
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
          >
            {node.label}
          </div>
        ))}
      </div>
    </Panel>
  )
}

function CornellNotes() {
  const [notes, setNotes] = useStoredState('learndifferent.cornell', [])
  const [draft, setDraft] = useState({ title: '', cues: '', notes: '', summary: '' })

  const save = (e) => {
    e.preventDefault()
    if (!draft.title.trim()) return
    setNotes((prev) => [{ ...draft, id: Date.now(), updatedAt: new Date().toISOString() }, ...prev])
    setDraft({ title: '', cues: '', notes: '', summary: '' })
  }

  return (
    <Panel title="Cornell Notes" description="Cue, notes, and summary columns with persistent local saves." icon={StickyNote} wide>
      <form onSubmit={save} className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-900/50 p-5">
        <Field label="Title"><TextInput value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></Field>
        <div className="grid gap-4 lg:grid-cols-[0.75fr_1.5fr]">
          <Field label="Cues"><TextArea rows={10} value={draft.cues} onChange={(e) => setDraft({ ...draft, cues: e.target.value })} /></Field>
          <Field label="Notes"><TextArea rows={10} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></Field>
        </div>
        <Field label="Summary"><TextArea rows={4} value={draft.summary} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} /></Field>
        <PrimaryButton type="submit"><Save className="h-4 w-4" /> Save note</PrimaryButton>
      </form>
      <div className="grid gap-3 md:grid-cols-2">
        {notes.slice(0, 6).map((note) => (
          <article key={note.id} className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
            <h2 className="font-semibold text-zinc-100">{note.title}</h2>
            <p className="mt-2 line-clamp-3 text-sm text-zinc-400">{note.summary || note.notes}</p>
          </article>
        ))}
      </div>
    </Panel>
  )
}

function AIBox({ tool, title, placeholder }) {
  const { token, isAuthenticated } = useAuth()
  const { settings } = useAccessibility()
  const [prompt, setPrompt] = useState('')
  const [context, setContext] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [output, setOutput] = useState('')

  const run = async (e) => {
    e.preventDefault()
    if (!isAuthenticated) {
      setError('Log in before using AI features.')
      return
    }
    setLoading(true)
    setError('')
    setOutput('')
    try {
      const res = await fetch('/api/gemini/study-tool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tool, prompt, context, profile: settings }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Request failed')
      setOutput(data.output)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5">
      <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>
      <form onSubmit={run} className="mt-4 space-y-3">
        <Field label="Request"><TextArea rows={4} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={placeholder} required /></Field>
        <Field label="Optional context"><TextArea rows={3} value={context} onChange={(e) => setContext(e.target.value)} placeholder="Paste notes, essay text, or your current step..." /></Field>
        <PrimaryButton type="submit" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Run AI tool
        </PrimaryButton>
      </form>
      {!isAuthenticated && <p className="mt-3 text-sm text-amber-300">Open Account and log in to use this AI tool.</p>}
      {error && <p role="alert" className="mt-3 rounded-md border border-red-900/50 bg-red-950/30 p-3 text-sm text-red-300">{error}</p>}
      {output && (
        <article className="prose prose-invert prose-sm mt-4 max-w-none rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <ReactMarkdown>{output}</ReactMarkdown>
        </article>
      )}
    </section>
  )
}

function AIWorkspace({ viewId }) {
  const map = {
    tutor: ['AI Tutor', 'Ask for a Socratic hint instead of a full answer.', 'tutor', 'I am stuck on simultaneous equations. Ask me one guiding question.'],
    paths: ['Adaptive Paths', 'Generate a diagnostic learning route from your goal and gaps.', 'adaptive', 'I need to learn quadratic graphs for a test in 5 days.'],
    feedback: ['AI Essay Feedback', 'Paste writing and get structured rubric feedback.', 'feedback', 'Give feedback on my essay introduction.'],
    whiteboard: ['Step-by-Step Whiteboard', 'Check one math step and request the next step.', 'whiteboard', 'I moved 3x from the left to the right. Is this step valid?'],
    comprehension: ['Reading Comprehension', 'Create scaffolded questions from a passage or topic.', 'comprehension', 'Create questions for a paragraph about plate tectonics.'],
  }
  const [title, description, tool, placeholder] = map[viewId]
  return (
    <Panel title={title} description={description} icon={ICONS[viewId] || Sparkles}>
      <AIBox tool={tool} title={title} placeholder={placeholder} />
    </Panel>
  )
}

function EssayPlanner() {
  const [topic, setTopic] = useState('')
  const [points, setPoints] = useState(['', '', ''])
  const thesis = topic ? `This essay argues that ${topic.toLowerCase()} can be understood through ${points.filter(Boolean).join(', ') || 'three linked points'}.` : ''

  return (
    <Panel title="Essay Planner" description="Build a thesis, argument list, and paragraph order." icon={PenLine}>
      <section className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-900/50 p-5">
        <Field label="Question or topic"><TextInput value={topic} onChange={(e) => setTopic(e.target.value)} /></Field>
        {points.map((point, i) => (
          <Field key={i} label={`Argument ${i + 1}`}><TextInput value={point} onChange={(e) => setPoints((prev) => prev.map((p, idx) => (idx === i ? e.target.value : p)))} /></Field>
        ))}
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-xs uppercase tracking-widest text-zinc-600">Draft thesis</p>
          <p className="mt-2 text-zinc-200">{thesis || 'Add a topic to generate a draft thesis.'}</p>
        </div>
      </section>
    </Panel>
  )
}

function DesmosView() {
  return (
    <div className="h-full min-h-[calc(100vh-2.5rem)] bg-white">
      <iframe
        src="https://www.desmos.com/calculator"
        title="Desmos Graphing Calculator"
        className="h-[calc(100vh-2.5rem)] w-full border-0 bg-white"
        allowFullScreen
      />
    </div>
  )
}

function EquationSolver() {
  const [equation, setEquation] = useState('2x + 6 = 18')
  const solution = useMemo(() => solveEquation(equation), [equation])

  return (
    <Panel title="Equation Solver" description="Solves common linear and quadratic equations locally." icon={Calculator}>
      <section className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5">
        <Field label="Equation"><TextInput value={equation} onChange={(e) => setEquation(e.target.value)} placeholder="2x + 6 = 18 or x^2 - 5x + 6 = 0" /></Field>
        <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-xs uppercase tracking-widest text-zinc-600">Result</p>
          <pre className="mt-2 whitespace-pre-wrap text-sm text-zinc-200">{solution}</pre>
        </div>
      </section>
    </Panel>
  )
}

function solveEquation(input) {
  const clean = input.replace(/\s+/g, '').replace(/\*/g, '')
  const linear = clean.match(/^([+-]?\d*)x([+-]\d+)?=([+-]?\d+)$/i)
  if (linear) {
    const a = Number(linear[1].replace('+', '') || 1)
    const b = Number(linear[2] || 0)
    const c = Number(linear[3])
    if (a === 0) return 'Coefficient of x cannot be 0.'
    return `${a}x ${b >= 0 ? '+' : '-'} ${Math.abs(b)} = ${c}\n${a}x = ${c - b}\nx = ${(c - b) / a}`
  }
  const quadratic = clean.match(/^x\^2([+-]\d*)x([+-]\d+)=0$/i)
  if (quadratic) {
    const b = Number(quadratic[1].replace('+', '') || 1)
    const c = Number(quadratic[2])
    const d = b * b - 4 * c
    if (d < 0) return `Discriminant is ${d}. No real roots.`
    const r1 = (-b + Math.sqrt(d)) / 2
    const r2 = (-b - Math.sqrt(d)) / 2
    return `Discriminant = ${d}\nx = ${r1}\nx = ${r2}`
  }
  return 'Supported formats: 2x + 6 = 18, -3x-9=0, or x^2 - 5x + 6 = 0.'
}

function ScienceDiagrams() {
  const [phase, setPhase] = useState('solid')
  return (
    <Panel title="Interactive Diagrams" description="Explore science diagrams with selectable states." icon={Atom}>
      <section className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5">
        <div className="flex flex-wrap gap-2">
          {['solid', 'liquid', 'gas'].map((p) => (
            <button key={p} type="button" onClick={() => setPhase(p)} className={`rounded-lg border px-4 py-2 text-sm capitalize ${phase === p ? 'border-violet-500 bg-violet-950/40 text-violet-200' : 'border-zinc-700 text-zinc-300 hover:bg-zinc-800'}`}>{p}</button>
          ))}
        </div>
        <div className="mt-5 grid gap-2 rounded-lg border border-zinc-800 bg-zinc-950 p-6" style={{ gridTemplateColumns: phase === 'gas' ? 'repeat(5,1fr)' : 'repeat(4,1fr)' }}>
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className={`aspect-square rounded-full ${phase === 'solid' ? 'bg-emerald-400' : phase === 'liquid' ? 'bg-sky-400' : 'bg-amber-300 opacity-70'}`} style={{ transform: phase === 'gas' ? `translate(${(i % 3) * 8}px, ${(i % 4) * -6}px)` : undefined }} />
          ))}
        </div>
        <p className="mt-4 text-sm text-zinc-400">{phase === 'solid' ? 'Particles are tightly packed in a fixed structure.' : phase === 'liquid' ? 'Particles stay close but slide past each other.' : 'Particles spread out and move quickly.'}</p>
      </section>
    </Panel>
  )
}

function VirtualLabs() {
  const [acid, setAcid] = useState(25)
  const [base, setBase] = useState(25)
  const ph = Math.max(0, Math.min(14, 7 + (base - acid) / 10)).toFixed(1)
  return (
    <Panel title="Virtual Labs" description="Run a safe titration simulation." icon={FlaskConical}>
      <section className="space-y-5 rounded-lg border border-zinc-800 bg-zinc-900/50 p-5">
        <Field label={`Acid: ${acid} ml`}><input type="range" min="0" max="100" value={acid} onChange={(e) => setAcid(Number(e.target.value))} className="w-full" /></Field>
        <Field label={`Base: ${base} ml`}><input type="range" min="0" max="100" value={base} onChange={(e) => setBase(Number(e.target.value))} className="w-full" /></Field>
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-sm text-zinc-500">Estimated pH</p>
          <p className="mt-1 text-5xl font-semibold text-zinc-100">{ph}</p>
          <p className="mt-2 text-sm text-zinc-400">{ph < 6.5 ? 'Acidic solution' : ph > 7.5 ? 'Alkaline solution' : 'Near neutral'}</p>
        </div>
      </section>
    </Panel>
  )
}

function ComprehensionFallback() {
  return <AIWorkspace viewId="comprehension" />
}

function UnknownFeature({ viewId }) {
  const Icon = ICONS[viewId] || Beaker
  return (
    <Panel title={viewId} description="This workspace is available for notes and planning." icon={Icon}>
      <CornellNotes />
    </Panel>
  )
}

export default function FeatureView({ viewId }) {
  switch (viewId) {
    case 'dashboard':
      return <Dashboard />
    case 'flashcards':
      return <Flashcards />
    case 'exemplar':
      return <ExemplarEssays />
    case 'timed':
      return <TimedPractice />
    case 'mindmap':
      return <MindMap />
    case 'cornell':
      return <CornellNotes />
    case 'tutor':
    case 'paths':
    case 'feedback':
    case 'whiteboard':
      return <AIWorkspace viewId={viewId} />
    case 'comprehension':
      return <ComprehensionFallback />
    case 'essay':
      return <EssayPlanner />
    case 'desmos':
      return <DesmosView />
    case 'diagrams':
      return <ScienceDiagrams />
    case 'labs':
      return <VirtualLabs />
    case 'equations':
      return <EquationSolver />
    case 'progress':
      return <Dashboard />
    default:
      return <UnknownFeature viewId={viewId} />
  }
}
