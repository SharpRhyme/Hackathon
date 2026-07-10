import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Atom,
  BookMarked,
  Calculator,
  Eraser,
  FlaskConical,
  Highlighter,
  ImagePlus,
  PenLine,
  PenTool,
  RotateCcw,
  Send,
  Sparkles,
  Trash2,
  Type,
  Undo2,
} from 'lucide-react'
import { View, Card, Button, Field, Input, TextArea, Chip, IconButton } from '../components/ui'
import AIOutput, { useAIStream } from '../components/AIOutput'
import { logActivity } from '../lib/store'
import { useAccessibility } from '../context/AccessibilityContext'

// One streaming AI workspace, configured per tool.
function AIWorkspace({ icon, eyebrow, title, description, tool, promptLabel, placeholder, contextLabel }) {
  const [prompt, setPrompt] = useState('')
  const [context, setContext] = useState('')
  const { settings } = useAccessibility()
  const stream = useAIStream('/api/ai/stream')

  const run = (e) => {
    e.preventDefault()
    if (!prompt.trim()) return
    logActivity(tool === 'feedback' ? 'feedback' : tool, `${title}: ${prompt.trim().slice(0, 50)}`)
    stream.run({ tool, prompt, context, profile: settings })
  }

  return (
    <View icon={icon} eyebrow={eyebrow} title={title} description={description}>
      <Card>
        <form onSubmit={run} className="space-y-4">
          <Field label={promptLabel}>
            <TextArea rows={4} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={placeholder} required />
          </Field>
          <Field label={contextLabel || 'Extra context'} hint="optional">
            <TextArea rows={3} value={context} onChange={(e) => setContext(e.target.value)} placeholder="Paste notes, the passage, or your working so far..." />
          </Field>
          <Button type="submit" disabled={stream.status === 'thinking' || stream.status === 'streaming'}>
            <Send className="h-4 w-4" /> Go
          </Button>
        </form>
      </Card>
      <AIOutput text={stream.text} status={stream.status} error={stream.error} onStop={stream.stop} />
    </View>
  )
}

function DesmosView() {
  return (
    <div className="h-full bg-white">
      <iframe
        src="https://www.desmos.com/calculator"
        title="Desmos Graphing Calculator"
        className="h-full min-h-[calc(100vh-3.5rem)] w-full border-0 bg-white"
        allowFullScreen
      />
    </div>
  )
}

const PEN_COLORS = ['#1f2937', '#0f65c8', '#8f3a84', '#2f7d54', '#b26b22', '#b91c1c']
const HIGHLIGHTER_COLORS = ['#fde047', '#86efac', '#93c5fd', '#f9a8d4']

function MathWhiteboard() {
  const canvasRef = useRef(null)
  const drawingRef = useRef(false)
  const lastPointRef = useRef(null)
  const historyRef = useRef([])
  const [tool, setTool] = useState('pen')
  const [color, setColor] = useState(PEN_COLORS[0])
  const [highlightColor, setHighlightColor] = useState(HIGHLIGHTER_COLORS[0])
  const [size, setSize] = useState(5)
  const [textSize, setTextSize] = useState(24)
  const [textDraft, setTextDraft] = useState('')
  const [questionText, setQuestionText] = useState('')
  const [typedWorking, setTypedWorking] = useState('')
  const [questionImage, setQuestionImage] = useState(null)
  const [hasBoardWork, setHasBoardWork] = useState(false)
  const { settings } = useAccessibility()
  const stream = useAIStream('/api/ai/stream')

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }, [])

  const pushHistory = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    historyRef.current = [...historyRef.current.slice(-14), canvas.toDataURL('image/png')]
  }

  const pointFromEvent = (event) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    }
  }

  const drawLine = (from, to) => {
    const ctx = canvasRef.current.getContext('2d')
    ctx.save()
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over'
    ctx.globalAlpha = tool === 'highlighter' ? 0.35 : 1
    ctx.strokeStyle = tool === 'highlighter' ? highlightColor : color
    ctx.lineWidth = tool === 'eraser' ? size * 3 : tool === 'highlighter' ? size * 4 : size
    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(to.x, to.y)
    ctx.stroke()
    ctx.restore()
  }

  const addTextAt = (point) => {
    if (!textDraft.trim()) return
    pushHistory()
    const ctx = canvasRef.current.getContext('2d')
    ctx.save()
    ctx.fillStyle = color
    ctx.font = `${textSize}px Karla, Arial, sans-serif`
    ctx.textBaseline = 'top'
    const lines = textDraft.split('\n')
    lines.forEach((line, i) => ctx.fillText(line, point.x, point.y + i * textSize * 1.25))
    ctx.restore()
    setTextDraft('')
    setHasBoardWork(true)
  }

  const onPointerDown = (event) => {
    const canvas = canvasRef.current
    canvas.setPointerCapture(event.pointerId)
    const point = pointFromEvent(event)
    if (tool === 'text') {
      addTextAt(point)
      return
    }
    pushHistory()
    drawingRef.current = true
    lastPointRef.current = point
    setHasBoardWork(true)
  }

  const onPointerMove = (event) => {
    if (!drawingRef.current || tool === 'text') return
    const point = pointFromEvent(event)
    drawLine(lastPointRef.current, point)
    lastPointRef.current = point
  }

  const stopDrawing = () => {
    drawingRef.current = false
    lastPointRef.current = null
  }

  const undo = () => {
    const previous = historyRef.current.pop()
    if (!previous) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const image = new Image()
    image.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(image, 0, 0)
      setHasBoardWork(historyRef.current.length > 0)
    }
    image.src = previous
  }

  const clearBoard = () => {
    pushHistory()
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.save()
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.restore()
    setHasBoardWork(false)
  }

  const boardFile = () =>
    new Promise((resolve) => {
      const canvas = canvasRef.current
      const out = document.createElement('canvas')
      out.width = canvas.width
      out.height = canvas.height
      const ctx = out.getContext('2d')
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, out.width, out.height)
      ctx.drawImage(canvas, 0, 0)
      out.toBlob((blob) => {
        resolve(blob ? new File([blob], 'math-whiteboard.png', { type: 'image/png' }) : null)
      }, 'image/png')
    })

  const submit = async (event) => {
    event.preventDefault()
    if (!questionText.trim() && !questionImage) return
    if (!hasBoardWork && !typedWorking.trim()) return
    const files = []
    if (hasBoardWork) {
      const file = await boardFile()
      if (file) files.push(file)
    }
    if (questionImage) files.push(questionImage)
    const prompt = [
      'Review this math working.',
      `ORIGINAL QUESTION TEXT:\n${questionText.trim() || '(question is attached as an image)'}`,
      `TYPED WORKING:\n${typedWorking.trim() || '(working is on the whiteboard image)'}`,
      hasBoardWork ? 'The attached math-whiteboard.png contains the student whiteboard working.' : '',
      questionImage ? `The attached ${questionImage.name} is the original question or prompt image.` : '',
      'Be clear about what evidence came from the question text, the question image, the typed working, and the whiteboard image.',
    ].filter(Boolean).join('\n\n')
    logActivity('whiteboard', `Math whiteboard: ${(questionText || typedWorking).slice(0, 50)}`)
    stream.run(
      { tool: 'whiteboard', prompt, context: questionText, profile: settings },
      { files, path: '/api/chat/stream', multipart: true },
    )
  }

  const canSubmit = (questionText.trim() || questionImage) && (hasBoardWork || typedWorking.trim())

  return (
    <View
      icon={PenTool}
      eyebrow="Math"
      title="Math Whiteboard"
      description="Draw or type your working, then send it with the original question so Gemini can check the step you are on."
      wide
    >
      <form onSubmit={submit} className="grid gap-4 xl:grid-cols-[1fr_23rem]">
        <section className="overflow-hidden rounded-card border border-line bg-raised shadow-card">
          <div className="flex flex-wrap items-center gap-2 border-b border-line bg-paper/70 p-3">
            {[
              { id: 'pen', label: 'Pen', icon: PenTool },
              { id: 'highlighter', label: 'Highlighter', icon: Highlighter },
              { id: 'eraser', label: 'Eraser', icon: Eraser },
              { id: 'text', label: 'Text', icon: Type },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTool(item.id)}
                className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors ${
                  tool === item.id ? 'border-clay bg-clay-wash text-clay-deep' : 'border-line bg-raised text-soft hover:bg-sunken'
                }`}
              >
                <item.icon className="h-4 w-4" /> {item.label}
              </button>
            ))}
            <div className="h-7 w-px bg-line" />
            {(tool === 'highlighter' ? HIGHLIGHTER_COLORS : PEN_COLORS).map((swatch) => (
              <button
                key={swatch}
                type="button"
                onClick={() => (tool === 'highlighter' ? setHighlightColor(swatch) : setColor(swatch))}
                className={`h-7 w-7 rounded-full border-2 ${
                  (tool === 'highlighter' ? highlightColor : color) === swatch ? 'border-ink' : 'border-line'
                }`}
                style={{ backgroundColor: swatch }}
                aria-label={`Use color ${swatch}`}
              />
            ))}
            <label className="ml-auto flex items-center gap-2 text-xs font-medium text-faint">
              Size
              <input
                type="range"
                min="2"
                max="18"
                value={size}
                onChange={(e) => setSize(Number(e.target.value))}
                className="w-24 accent-[rgb(var(--c-clay))]"
              />
            </label>
            <IconButton label="Undo" onClick={undo}>
              <Undo2 className="h-4 w-4" />
            </IconButton>
            <IconButton label="Clear whiteboard" onClick={clearBoard}>
              <Trash2 className="h-4 w-4" />
            </IconButton>
          </div>
          {tool === 'text' && (
            <div className="grid gap-2 border-b border-line bg-raised p-3 sm:grid-cols-[1fr_auto]">
              <Input
                value={textDraft}
                onChange={(e) => setTextDraft(e.target.value)}
                placeholder="Type text, then click the board to place it"
                aria-label="Whiteboard text"
              />
              <label className="flex items-center gap-2 text-xs font-medium text-faint">
                Text size
                <input
                  type="range"
                  min="14"
                  max="44"
                  value={textSize}
                  onChange={(e) => setTextSize(Number(e.target.value))}
                  className="w-24 accent-[rgb(var(--c-clay))]"
                />
              </label>
            </div>
          )}
          <canvas
            ref={canvasRef}
            width={1200}
            height={760}
            className="block aspect-[30/19] w-full touch-none bg-white"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={stopDrawing}
            onPointerCancel={stopDrawing}
            aria-label="Math whiteboard drawing area"
          />
        </section>

        <aside className="space-y-4">
          <Card className="space-y-4">
            <Field label="Original question text" hint="or attach a photo below">
              <TextArea
                rows={4}
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="Paste or type the exact question..."
              />
            </Field>
            <Field label="Original question image" hint="optional">
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-line bg-paper px-3 py-3 text-sm text-soft hover:border-clay/50">
                <ImagePlus className="h-4 w-4 text-clay" />
                <span className="min-w-0 flex-1 truncate">{questionImage?.name || 'Attach a photo or screenshot'}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => setQuestionImage(e.target.files?.[0] || null)}
                />
              </label>
            </Field>
            <Field label="Typed working" hint="optional alternative to drawing">
              <TextArea
                rows={5}
                value={typedWorking}
                onChange={(e) => setTypedWorking(e.target.value)}
                placeholder="Type your steps here if writing is easier..."
              />
            </Field>
            <div className="rounded-xl border border-line bg-paper p-3 text-xs leading-relaxed text-faint">
              {hasBoardWork ? 'Whiteboard image will be sent.' : 'Whiteboard is blank.'}{' '}
              {questionImage ? 'Question image will be sent.' : 'Add text or an image for the original question.'}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={!canSubmit || stream.status === 'thinking' || stream.status === 'streaming'}>
                <Send className="h-4 w-4" /> Check working
              </Button>
              <Button type="button" variant="ghost" onClick={stream.reset}>
                <RotateCcw className="h-4 w-4" /> Reset response
              </Button>
            </div>
          </Card>
          <AIOutput text={stream.text} status={stream.status} error={stream.error} onStop={stream.stop} compact />
        </aside>
      </form>
    </View>
  )
}

function EssayPlanner() {
  const [topic, setTopic] = useState('')
  const [points, setPoints] = useState(['', '', ''])
  const thesis = topic
    ? `This essay argues that ${topic.toLowerCase().replace(/\.$/, '')} can be understood through ${
        points.filter(Boolean).join(', ') || 'three linked points'
      }.`
    : ''

  return (
    <View
      icon={PenLine}
      eyebrow="Writing"
      title="Essay Planner"
      description="Lock the thesis and the order of your arguments before you write a single paragraph."
    >
      <Card className="space-y-4">
        <Field label="Question or topic">
          <Input value={topic} onChange={(e) => setTopic(e.target.value)} />
        </Field>
        {points.map((point, i) => (
          <Field key={i} label={`Argument ${i + 1}`}>
            <Input
              value={point}
              onChange={(e) => setPoints((prev) => prev.map((p, idx) => (idx === i ? e.target.value : p)))}
            />
          </Field>
        ))}
        <div className="rounded-xl border border-clay/25 bg-clay-wash p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clay-deep/70">Draft thesis</p>
          <p className="mt-2 text-sm leading-relaxed text-ink">{thesis || 'Add a topic to generate a draft thesis.'}</p>
        </div>
      </Card>
    </View>
  )
}

function EquationSolver() {
  const [equation, setEquation] = useState('2x + 6 = 18')
  const solution = useMemo(() => solveEquation(equation), [equation])

  return (
    <View
      icon={Calculator}
      eyebrow="Math"
      title="Equation Solver"
      description="Instant local solving for linear and quadratic equations, with the steps written out."
    >
      <Card>
        <Field label="Equation">
          <Input value={equation} onChange={(e) => setEquation(e.target.value)} placeholder="2x + 6 = 18 or x^2 - 5x + 6 = 0" />
        </Field>
        <div className="mt-4 rounded-xl border border-line bg-paper p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-faint">Working</p>
          <pre className="mt-2 whitespace-pre-wrap font-mono text-sm leading-relaxed text-ink">{solution}</pre>
        </div>
      </Card>
    </View>
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
  const descriptions = {
    solid: 'Particles are tightly packed in a fixed structure. They vibrate but stay in place.',
    liquid: 'Particles stay close but slide past each other, so the liquid takes the shape of its container.',
    gas: 'Particles spread out and move quickly in every direction, filling the space available.',
  }
  return (
    <View
      icon={Atom}
      eyebrow="Science"
      title="Interactive Diagrams"
      description="Flip between states of matter and watch the particle model change."
    >
      <Card>
        <div className="flex flex-wrap gap-1.5">
          {['solid', 'liquid', 'gas'].map((p) => (
            <Chip key={p} active={phase === p} onClick={() => setPhase(p)} className="capitalize">
              {p}
            </Chip>
          ))}
        </div>
        <div
          className="mt-5 grid gap-2 rounded-xl border border-line bg-paper p-6 transition-all"
          style={{ gridTemplateColumns: phase === 'gas' ? 'repeat(5,1fr)' : 'repeat(4,1fr)' }}
          aria-label={`Particle diagram for a ${phase}`}
        >
          {Array.from({ length: 16 }).map((_, i) => (
            <div
              key={i}
              className={`aspect-square rounded-full transition-all duration-500 ${
                phase === 'solid' ? 'bg-moss' : phase === 'liquid' ? 'bg-sky' : 'bg-gold opacity-70'
              }`}
              style={{
                transform:
                  phase === 'gas'
                    ? `translate(${(i % 3) * 9}px, ${(i % 4) * -7}px)`
                    : phase === 'liquid'
                      ? `translate(${(i % 2) * 4}px, 0)`
                      : undefined,
              }}
            />
          ))}
        </div>
        <p className="mt-4 text-sm leading-relaxed text-soft">{descriptions[phase]}</p>
      </Card>
    </View>
  )
}

function VirtualLabs() {
  const [acid, setAcid] = useState(25)
  const [base, setBase] = useState(25)
  const ph = Math.max(0, Math.min(14, 7 + (base - acid) / 10))
  const phColor = ph < 4 ? 'rgb(178 42 42)' : ph < 6.5 ? 'rgb(var(--c-gold))' : ph <= 7.5 ? 'rgb(var(--c-moss))' : 'rgb(var(--c-berry))'
  return (
    <View
      icon={FlaskConical}
      eyebrow="Science"
      title="Virtual Labs"
      description="A safe titration bench. Slide the volumes and watch the pH respond."
    >
      <Card className="space-y-5">
        <Field label={`Acid: ${acid} ml`}>
          <input
            type="range"
            min="0"
            max="100"
            value={acid}
            onChange={(e) => setAcid(Number(e.target.value))}
            className="w-full accent-[rgb(178,42,42)]"
          />
        </Field>
        <Field label={`Base: ${base} ml`}>
          <input
            type="range"
            min="0"
            max="100"
            value={base}
            onChange={(e) => setBase(Number(e.target.value))}
            className="w-full accent-[rgb(55,106,160)]"
          />
        </Field>
        <div className="flex items-center gap-5 rounded-xl border border-line bg-paper p-5">
          <div
            className="grid h-20 w-20 shrink-0 place-items-center rounded-full font-display text-2xl font-semibold text-white transition-colors"
            style={{ backgroundColor: phColor }}
            aria-label={`pH ${ph.toFixed(1)}`}
          >
            {ph.toFixed(1)}
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">
              {ph < 6.5 ? 'Acidic solution' : ph > 7.5 ? 'Alkaline solution' : 'Near neutral'}
            </p>
            <p className="mt-1 text-sm text-faint">
              The pH scale runs 0 to 14. Neutral is 7. Balance the volumes to neutralise.
            </p>
          </div>
        </div>
      </Card>
    </View>
  )
}

export default function SubjectTools({ viewId }) {
  switch (viewId) {
    case 'desmos':
      return <DesmosView />
    case 'essay':
      return <EssayPlanner />
    case 'equations':
      return <EquationSolver />
    case 'diagrams':
      return <ScienceDiagrams />
    case 'labs':
      return <VirtualLabs />
    case 'whiteboard':
      return <MathWhiteboard />
    case 'comprehension':
      return (
        <AIWorkspace
          icon={BookMarked}
          eyebrow="English"
          title="Comprehension Practice"
          description="Paste a passage or name a topic. Get a short summary and five questions that climb from literal to inferential."
          tool="comprehension"
          promptLabel="Passage or topic"
          placeholder="Paste a paragraph, or write a topic like plate tectonics..."
        />
      )
    case 'feedback':
      return (
        <AIWorkspace
          icon={Sparkles}
          eyebrow="English"
          title="Essay Feedback"
          description="Paste your writing and get rubric feedback on thesis, structure, evidence, and clarity, plus the one revision to do first."
          tool="feedback"
          promptLabel="Your writing"
          placeholder="Paste your paragraph or full essay..."
          contextLabel="The question it answers"
        />
      )
    default:
      return null
  }
}
