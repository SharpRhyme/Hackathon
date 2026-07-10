import { useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  Check,
  CreditCard,
  FolderPlus,
  ImagePlus,
  Loader2,
  Pencil,
  Play,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import {
  View,
  Card,
  Button,
  Field,
  Input,
  TextArea,
  Modal,
  EmptyState,
  Alert,
  IconButton,
  ProgressRing,
} from '../components/ui'
import Mascot from '../components/Mascot'
import { useStoredState, DECKS_KEY, logActivity } from '../lib/store'
import { apiUpload } from '../lib/api'

const DECK_COLORS = ['clay', 'sky', 'moss', 'gold', 'berry']
const COLOR_STYLES = {
  clay: 'bg-clay-wash text-clay-deep border-clay/30',
  sky: 'bg-sky-wash text-sky border-sky/30',
  moss: 'bg-moss-wash text-moss border-moss/30',
  gold: 'bg-gold-wash text-gold border-gold/30',
  berry: 'bg-berry-wash text-berry border-berry/30',
}
const INTERVALS_DAYS = [0, 1, 3, 7, 14, 30]

const dueCount = (deck) => deck.cards.filter((c) => c.due <= Date.now()).length

export default function Flashcards() {
  const [decks, setDecks] = useStoredState(DECKS_KEY, [])
  const [mode, setMode] = useState('decks') // decks | deck | study
  const [activeId, setActiveId] = useState(null)
  const [showCreate, setShowCreate] = useState(false)

  const activeDeck = decks.find((d) => d.id === activeId)

  const updateDeck = (id, updater) => {
    setDecks((prev) => prev.map((d) => (d.id === id ? updater(d) : d)))
  }

  if (mode === 'study' && activeDeck) {
    return (
      <StudySession
        deck={activeDeck}
        onGrade={(cardId, quality) => {
          updateDeck(activeDeck.id, (deck) => ({
            ...deck,
            cards: deck.cards.map((card) => {
              if (card.id !== cardId) return card
              const box = quality === 0 ? 1 : Math.min((card.box || 1) + quality, 5)
              return { ...card, box, due: Date.now() + INTERVALS_DAYS[box] * 86400000 }
            }),
          }))
        }}
        onExit={() => setMode('deck')}
      />
    )
  }

  if (mode === 'deck' && activeDeck) {
    return (
      <DeckDetail
        deck={activeDeck}
        onBack={() => setMode('decks')}
        onStudy={() => {
          logActivity('flashcards', `Studied deck "${activeDeck.name}"`)
          setMode('study')
        }}
        onUpdate={(updater) => updateDeck(activeDeck.id, updater)}
      />
    )
  }

  return (
    <View
      icon={CreditCard}
      eyebrow="Spaced repetition"
      title="Flashcards"
      description="Organise cards into decks, study what is due, and let Gemini build decks from your notes or photos."
      wide
      actions={
        <>
          <Mascot pose="type" size={4} />
          <Button onClick={() => setShowCreate(true)}>
            <FolderPlus className="h-4 w-4" /> New deck
          </Button>
        </>
      }
    >
      {decks.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No decks yet"
          hint="Create a deck, then add cards by hand or generate them from your notes."
        >
          <Button onClick={() => setShowCreate(true)}>
            <FolderPlus className="h-4 w-4" /> Create your first deck
          </Button>
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {decks.map((deck, i) => {
            const due = dueCount(deck)
            return (
              <Card
                key={deck.id}
                className="group flex flex-col transition-shadow hover:shadow-lift animate-fade-up"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div className="flex items-start justify-between">
                  <span className={`rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${COLOR_STYLES[deck.color] || COLOR_STYLES.clay}`}>
                    {deck.cards.length} cards
                  </span>
                  <DeckMenu
                    deck={deck}
                    onRename={(name) => updateDeck(deck.id, (d) => ({ ...d, name }))}
                    onDelete={() => setDecks((prev) => prev.filter((d) => d.id !== deck.id))}
                  />
                </div>
                <h2 className="mt-3 font-display text-xl font-semibold text-ink">{deck.name}</h2>
                <p className="mt-1 flex-1 text-sm text-faint">
                  {due > 0 ? `${due} card${due === 1 ? '' : 's'} due for review` : 'All caught up'}
                </p>
                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    disabled={deck.cards.length === 0}
                    onClick={() => {
                      setActiveId(deck.id)
                      logActivity('flashcards', `Studied deck "${deck.name}"`)
                      setMode('study')
                    }}
                  >
                    <Play className="h-3.5 w-3.5" /> Study
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setActiveId(deck.id)
                      setMode('deck')
                    }}
                  >
                    Open deck
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <CreateDeckModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={(name, color) => {
          const deck = { id: `deck-${Date.now()}`, name, color, cards: [] }
          setDecks((prev) => [...prev, deck])
          setShowCreate(false)
          setActiveId(deck.id)
          setMode('deck')
        }}
      />
    </View>
  )
}

function DeckMenu({ deck, onRename, onDelete }) {
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(deck.name)
  return (
    <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
      <IconButton label={`Rename ${deck.name}`} className="h-7 w-7" onClick={() => setRenaming(true)}>
        <Pencil className="h-3 w-3" />
      </IconButton>
      <IconButton
        label={`Delete ${deck.name}`}
        className="h-7 w-7 hover:text-[rgb(148,30,30)]"
        onClick={() => {
          if (window.confirm(`Delete "${deck.name}" and its ${deck.cards.length} cards?`)) onDelete()
        }}
      >
        <Trash2 className="h-3 w-3" />
      </IconButton>
      <Modal open={renaming} onClose={() => setRenaming(false)} title="Rename deck">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (name.trim()) {
              onRename(name.trim())
              setRenaming(false)
            }
          }}
          className="space-y-4"
        >
          <Input value={name} onChange={(e) => setName(e.target.value)} />
          <Button type="submit">Save name</Button>
        </form>
      </Modal>
    </div>
  )
}

function CreateDeckModal({ open, onClose, onCreate }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState('clay')
  return (
    <Modal open={open} onClose={onClose} title="New deck">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!name.trim()) return
          onCreate(name.trim(), color)
          setName('')
        }}
        className="space-y-4"
      >
        <Field label="Deck name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Biology: Cells" />
        </Field>
        <Field label="Colour">
          <div className="flex gap-2">
            {DECK_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`${c} colour`}
                aria-pressed={color === c}
                onClick={() => setColor(c)}
                className={`h-8 w-8 rounded-full border-2 transition-transform ${
                  color === c ? 'scale-110 border-ink' : 'border-transparent'
                } ${COLOR_STYLES[c].split(' ')[0]}`}
              />
            ))}
          </div>
        </Field>
        <Button type="submit" disabled={!name.trim()}>
          <FolderPlus className="h-4 w-4" /> Create deck
        </Button>
      </form>
    </Modal>
  )
}

function DeckDetail({ deck, onBack, onStudy, onUpdate }) {
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const due = dueCount(deck)

  const addCard = (e) => {
    e.preventDefault()
    if (!front.trim() || !back.trim()) return
    onUpdate((d) => ({
      ...d,
      cards: [...d.cards, { id: Date.now(), front: front.trim(), back: back.trim(), box: 1, due: Date.now() }],
    }))
    setFront('')
    setBack('')
  }

  return (
    <View
      icon={CreditCard}
      eyebrow="Deck"
      title={deck.name}
      description={`${deck.cards.length} cards, ${due} due now.`}
      wide
      actions={
        <>
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" /> All decks
          </Button>
          <Button onClick={onStudy} disabled={deck.cards.length === 0}>
            <Play className="h-4 w-4" /> Study now
          </Button>
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-4">
          <Card>
            <h2 className="font-display text-lg font-semibold text-ink">Add a card</h2>
            <form onSubmit={addCard} className="mt-3 space-y-3">
              <Field label="Front">
                <Input value={front} onChange={(e) => setFront(e.target.value)} placeholder="Question or prompt" />
              </Field>
              <Field label="Back">
                <TextArea rows={3} value={back} onChange={(e) => setBack(e.target.value)} placeholder="Answer" />
              </Field>
              <Button type="submit" variant="soft" disabled={!front.trim() || !back.trim()}>
                <Plus className="h-4 w-4" /> Add card
              </Button>
            </form>
          </Card>

          <AIGenerator
            onAccept={(cards) =>
              onUpdate((d) => ({
                ...d,
                cards: [
                  ...d.cards,
                  ...cards.map((c, i) => ({
                    id: Date.now() + i,
                    front: c.front,
                    back: c.back,
                    box: 1,
                    due: Date.now(),
                  })),
                ],
              }))
            }
          />
        </div>

        <Card>
          <h2 className="font-display text-lg font-semibold text-ink">Cards in this deck</h2>
          {deck.cards.length === 0 ? (
            <p className="mt-3 text-sm text-faint">No cards yet. Add one on the left, or generate a batch with AI.</p>
          ) : (
            <ul className="mt-3 max-h-[34rem] space-y-2 overflow-y-auto pr-1 scrollbar-thin">
              {deck.cards.map((card) => (
                <li
                  key={card.id}
                  className="group/card flex items-start gap-3 rounded-xl border border-line bg-paper p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink">{card.front}</p>
                    <p className="mt-1 text-sm text-faint">{card.back}</p>
                    <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-wide text-faint/60">
                      Box {card.box || 1} of 5
                      {card.due <= Date.now() ? ' · due now' : ''}
                    </p>
                  </div>
                  <IconButton
                    label="Delete card"
                    className="h-7 w-7 opacity-0 transition-opacity group-hover/card:opacity-100 hover:text-[rgb(148,30,30)]"
                    onClick={() => onUpdate((d) => ({ ...d, cards: d.cards.filter((c) => c.id !== card.id) }))}
                  >
                    <Trash2 className="h-3 w-3" />
                  </IconButton>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </View>
  )
}

function AIGenerator({ onAccept }) {
  const [topic, setTopic] = useState('')
  const [notes, setNotes] = useState('')
  const [count, setCount] = useState(10)
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(null)
  const fileInput = useRef(null)

  const generate = async () => {
    setLoading(true)
    setError('')
    setPreview(null)
    try {
      const res = await apiUpload('/api/flashcards/generate', { topic, notes, count }, files)
      const data = await res.json()
      setPreview(data.cards)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-clay/25 bg-gradient-to-b from-clay-wash/60 to-raised">
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
        <Sparkles className="h-4 w-4 text-clay" aria-hidden="true" /> Generate cards with AI
      </h2>
      <p className="mt-1 text-sm text-faint">
        Give a topic, paste notes, or attach photos of your notes and worksheets. Gemini turns them into cards.
      </p>
      <div className="mt-3 space-y-3">
        <div className="grid grid-cols-[1fr_5.5rem] gap-3">
          <Field label="Topic">
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Photosynthesis" />
          </Field>
          <Field label="Cards">
            <Input
              type="number"
              min="3"
              max="30"
              value={count}
              onChange={(e) => setCount(Number(e.target.value) || 10)}
            />
          </Field>
        </div>
        <Field label="Notes" hint="optional">
          <TextArea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Paste class notes, a textbook extract, anything..." />
        </Field>

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInput}
            type="file"
            multiple
            accept="image/*,.pdf,.txt,.md"
            className="sr-only"
            onChange={(e) => setFiles((prev) => [...prev, ...Array.from(e.target.files || [])])}
          />
          <Button variant="ghost" size="sm" onClick={() => fileInput.current?.click()}>
            <ImagePlus className="h-3.5 w-3.5" /> Attach notes or photos
          </Button>
          {files.map((file, i) => (
            <span key={`${file.name}-${i}`} className="inline-flex items-center gap-1 rounded-lg bg-sunken px-2 py-1 text-xs text-soft">
              {file.name.length > 22 ? `${file.name.slice(0, 20)}...` : file.name}
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

        <Button onClick={generate} disabled={loading || (!topic.trim() && !notes.trim() && files.length === 0)}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading ? 'Building your deck...' : 'Generate cards'}
        </Button>

        {error && <Alert>{error}</Alert>}

        {preview && (
          <div className="animate-fade-up rounded-xl border border-line bg-raised p-3">
            <p className="text-sm font-semibold text-ink">{preview.length} cards ready</p>
            <ul className="mt-2 max-h-56 space-y-1.5 overflow-y-auto pr-1 scrollbar-thin">
              {preview.map((card, i) => (
                <li key={i} className="rounded-lg bg-paper p-2.5 text-xs">
                  <p className="font-medium text-ink">{card.front}</p>
                  <p className="mt-0.5 text-faint">{card.back}</p>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                variant="success"
                onClick={() => {
                  onAccept(preview)
                  setPreview(null)
                  setFiles([])
                  setNotes('')
                  logActivity('flashcards', `Generated ${preview.length} cards with AI`)
                }}
              >
                <Check className="h-3.5 w-3.5" /> Add all to deck
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setPreview(null)}>
                Discard
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

function StudySession({ deck, onGrade, onExit }) {
  const queue = useMemo(() => {
    const due = deck.cards.filter((c) => c.due <= Date.now())
    return (due.length ? due : deck.cards).map((c) => c.id)
    // Snapshot at mount so grading does not reshuffle the session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [position, setPosition] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [results, setResults] = useState({ again: 0, good: 0, easy: 0 })

  const card = deck.cards.find((c) => c.id === queue[position])
  const finished = position >= queue.length

  const grade = (quality, key) => {
    onGrade(card.id, quality)
    setResults((r) => ({ ...r, [key]: r[key] + 1 }))
    setFlipped(false)
    setPosition((p) => p + 1)
  }

  return (
    <View
      icon={CreditCard}
      eyebrow={deck.name}
      title={finished ? 'Session complete' : `Card ${position + 1} of ${queue.length}`}
      actions={
        <Button variant="ghost" onClick={onExit}>
          <ArrowLeft className="h-4 w-4" /> Back to deck
        </Button>
      }
    >
      {finished ? (
        <Card className="grid place-items-center py-10 text-center animate-pop-in">
          <ProgressRing size={150} stroke={10} progress={1} color="rgb(var(--c-moss))">
            <Check className="h-10 w-10 text-moss" aria-hidden="true" />
          </ProgressRing>
          <h2 className="mt-4 font-display text-2xl font-semibold text-ink">Nice work</h2>
          <p className="mt-1 text-sm text-faint">
            {results.easy} easy, {results.good} good, {results.again} to see again soon.
          </p>
          <Button className="mt-5" onClick={onExit}>
            Done
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="h-1.5 overflow-hidden rounded-full bg-sunken" role="progressbar" aria-valuenow={position} aria-valuemax={queue.length}>
            <div
              className="h-full rounded-full bg-clay transition-all duration-300"
              style={{ width: `${(position / queue.length) * 100}%` }}
            />
          </div>

          <div className="flip-scene">
            <button
              type="button"
              onClick={() => setFlipped((f) => !f)}
              className={`flip-card block h-72 w-full ${flipped ? 'flipped' : ''}`}
              aria-label={flipped ? 'Showing answer. Click to see question.' : 'Showing question. Click to reveal answer.'}
            >
              <div className="flip-face grid place-items-center rounded-card border border-line bg-raised p-8 shadow-card">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-faint">Question</p>
                  <p className="mt-3 font-display text-2xl font-medium leading-snug text-ink">{card?.front}</p>
                  <p className="mt-6 text-xs text-faint/70">Click or press Enter to flip</p>
                </div>
              </div>
              <div className="flip-face back grid place-items-center rounded-card border border-clay/30 bg-clay-wash p-8 shadow-card">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-clay-deep/60">Answer</p>
                  <p className="mt-3 text-lg leading-relaxed text-ink">{card?.back}</p>
                </div>
              </div>
            </button>
          </div>

          {flipped ? (
            <div className="grid grid-cols-3 gap-3 animate-fade-up">
              <Button variant="danger" onClick={() => grade(0, 'again')}>
                Again
              </Button>
              <Button variant="soft" onClick={() => grade(1, 'good')}>
                Good
              </Button>
              <Button variant="success" onClick={() => grade(2, 'easy')}>
                Easy
              </Button>
            </div>
          ) : (
            <p className="text-center text-sm text-faint">Think of the answer first, then flip the card.</p>
          )}
        </div>
      )}
    </View>
  )
}
