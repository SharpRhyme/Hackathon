import { useState } from 'react'
import { ArrowLeft, BookOpen, Library, Plus, Save, Sparkles, Trash2 } from 'lucide-react'
import { View, Card, Button, Field, Input, TextArea, Modal, IconButton } from '../components/ui'
import AIOutput, { useAIStream } from '../components/AIOutput'
import Mascot from '../components/Mascot'
import { useStoredState, BOOKS_KEY, logActivity } from '../lib/store'
import { useAccessibility } from '../context/AccessibilityContext'

const BOOK_COLORS = ['#B2842C', '#C14E2B', '#4A7A44', '#376AA0', '#843F81', '#8A4A2F', '#3E7D74']

export default function Bookshelf() {
  const [books, setBooks] = useStoredState(BOOKS_KEY, [])
  const [openBookId, setOpenBookId] = useState(null)
  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newColor, setNewColor] = useState(BOOK_COLORS[0])

  const openBook = books.find((b) => b.id === openBookId)

  const updateBook = (id, updater) => {
    setBooks((prev) => prev.map((b) => (b.id === id ? updater(b) : b)))
  }

  if (openBook) {
    return (
      <BookView
        book={openBook}
        onBack={() => setOpenBookId(null)}
        onUpdate={(updater) => updateBook(openBook.id, updater)}
        onDelete={() => {
          setBooks((prev) => prev.filter((b) => b.id !== openBook.id))
          setOpenBookId(null)
        }}
      />
    )
  }

  // Distribute books across shelves of up to 7 spines.
  const shelves = []
  for (let i = 0; i < books.length; i += 7) shelves.push(books.slice(i, i + 7))
  if (shelves.length === 0) shelves.push([])

  return (
    <View
      icon={Library}
      eyebrow="Cornell notes"
      title="Bookshelf"
      description="Every notebook is a book on the shelf. Open one to write Cornell pages: cues, notes, and a summary."
      wide
      actions={
        <>
          <Mascot pose="read" size={4} />
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> New notebook
          </Button>
        </>
      }
    >
      <div className="animate-fade-up rounded-card border border-line bg-gradient-to-b from-sky-wash/40 to-paper p-6 shadow-card">
        <div className="mx-auto max-w-3xl">
          {shelves.map((shelf, shelfIndex) => (
            <div key={shelfIndex} className="relative px-4">
              <div className="flex items-end justify-start gap-1.5 px-6 pt-6">
                {shelf.map((book) => (
                  <button
                    key={book.id}
                    type="button"
                    onClick={() => setOpenBookId(book.id)}
                    className="book-spine flex h-40 w-12 flex-col items-center justify-between py-2"
                    style={{ backgroundColor: book.color }}
                    aria-label={`Open notebook "${book.title}", ${book.pages.length} pages`}
                    title={book.title}
                  >
                    <span className="h-1.5 w-6 rounded-sm bg-white/40" aria-hidden="true" />
                    <span className="spine-label max-h-24 overflow-hidden font-pixel text-[15px] leading-none text-white/95">
                      {book.title.slice(0, 14)}
                    </span>
                    <span className="rounded-sm bg-black/25 px-1 font-pixel text-[12px] leading-tight text-white/90">
                      {book.pages.length}
                    </span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCreating(true)}
                  className="grid h-40 w-12 place-items-center rounded-sm border-2 border-dashed border-line bg-raised/60 text-faint transition-colors hover:border-clay hover:text-clay"
                  aria-label="Add a new notebook"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
              <div className="shelf-wood h-6 rounded-sm" aria-hidden="true" />
              <div className="shelf-side absolute -left-0 top-0 hidden h-full w-4 rounded-sm sm:block" aria-hidden="true" />
              <div className="shelf-side absolute -right-0 top-0 hidden h-full w-4 rounded-sm sm:block" aria-hidden="true" />
            </div>
          ))}
          <p className="mt-4 text-center font-pixel text-lg text-faint">
            {books.length === 0 ? 'The shelf is empty. Add your first notebook.' : `${books.length} notebook${books.length === 1 ? '' : 's'} on the shelf`}
          </p>
        </div>
      </div>

      <Modal open={creating} onClose={() => setCreating(false)} title="New notebook">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!newTitle.trim()) return
            const book = { id: `book-${Date.now()}`, title: newTitle.trim(), color: newColor, pages: [] }
            setBooks((prev) => [...prev, book])
            setNewTitle('')
            setCreating(false)
            setOpenBookId(book.id)
            logActivity('cornell', `Created notebook "${book.title}"`)
          }}
          className="space-y-4"
        >
          <Field label="Title">
            <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="e.g. Chemistry Term 3" />
          </Field>
          <Field label="Cover colour">
            <div className="flex gap-2">
              {BOOK_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Colour ${c}`}
                  aria-pressed={newColor === c}
                  onClick={() => setNewColor(c)}
                  className={`h-9 w-6 rounded-sm border-2 transition-transform ${newColor === c ? 'scale-110 border-ink' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </Field>
          <Button type="submit" disabled={!newTitle.trim()}>
            <Plus className="h-4 w-4" /> Put it on the shelf
          </Button>
        </form>
      </Modal>
    </View>
  )
}

function emptyPage() {
  return { id: Date.now(), title: '', cues: '', notes: '', summary: '', updatedAt: new Date().toISOString() }
}

function BookView({ book, onBack, onUpdate, onDelete }) {
  const [activePageId, setActivePageId] = useState(book.pages[0]?.id ?? null)
  const [draft, setDraft] = useState(() => book.pages[0] || emptyPage())
  const { settings } = useAccessibility()
  const summaryStream = useAIStream('/api/ai/stream')

  const selectPage = (page) => {
    setActivePageId(page.id)
    setDraft(page)
    summaryStream.reset()
  }

  const newPage = () => {
    const page = emptyPage()
    setActivePageId(page.id)
    setDraft(page)
    summaryStream.reset()
  }

  const savePage = (e) => {
    e?.preventDefault()
    if (!draft.title.trim()) return
    const saved = { ...draft, updatedAt: new Date().toISOString() }
    onUpdate((b) => {
      const exists = b.pages.some((p) => p.id === saved.id)
      return {
        ...b,
        pages: exists ? b.pages.map((p) => (p.id === saved.id ? saved : p)) : [saved, ...b.pages],
      }
    })
    setActivePageId(saved.id)
    logActivity('cornell', `Saved "${saved.title}" in ${book.title}`)
  }

  const summarize = () => {
    if (!draft.notes.trim() && !draft.cues.trim()) return
    summaryStream.run({
      tool: 'summarize',
      prompt: `Summarize this Cornell page.\nTITLE: ${draft.title}\nCUES:\n${draft.cues}\nNOTES:\n${draft.notes}`,
      profile: settings,
    })
  }

  return (
    <View
      icon={BookOpen}
      eyebrow="Notebook"
      title={book.title}
      description={`${book.pages.length} page${book.pages.length === 1 ? '' : 's'}.`}
      wide
      actions={
        <>
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" /> Bookshelf
          </Button>
          <IconButton
            label="Delete this notebook"
            className="hover:text-[rgb(148,30,30)]"
            onClick={() => {
              if (window.confirm(`Delete "${book.title}" and all ${book.pages.length} pages?`)) onDelete()
            }}
          >
            <Trash2 className="h-4 w-4" />
          </IconButton>
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[0.62fr_1.38fr]">
        <Card className="h-fit">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-ink">Pages</h2>
            <Button size="sm" variant="soft" onClick={newPage}>
              <Plus className="h-3.5 w-3.5" /> New page
            </Button>
          </div>
          {book.pages.length === 0 ? (
            <p className="mt-3 text-sm text-faint">No pages yet. Write your first one on the right.</p>
          ) : (
            <ul className="mt-3 space-y-1.5">
              {book.pages.map((page) => (
                <li key={page.id} className="group/page relative">
                  <button
                    type="button"
                    onClick={() => selectPage(page)}
                    className={`w-full rounded-xl border px-3 py-2.5 text-left transition-colors ${
                      page.id === activePageId
                        ? 'border-clay/40 bg-clay-wash'
                        : 'border-line bg-paper hover:bg-sunken'
                    }`}
                  >
                    <p className="truncate pr-6 text-sm font-medium text-ink">{page.title || 'Untitled page'}</p>
                    <p className="mt-0.5 truncate text-xs text-faint">
                      {page.summary || page.notes || 'Empty page'}
                    </p>
                  </button>
                  <IconButton
                    label={`Delete page ${page.title}`}
                    className="absolute right-2 top-2 h-6 w-6 opacity-0 group-hover/page:opacity-100 hover:text-[rgb(148,30,30)]"
                    onClick={() => {
                      onUpdate((b) => ({ ...b, pages: b.pages.filter((p) => p.id !== page.id) }))
                      if (page.id === activePageId) newPage()
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </IconButton>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <form onSubmit={savePage} className="space-y-4">
          <Card className="space-y-4" style={{ borderTop: `4px solid ${book.color}` }}>
            <Field label="Page title">
              <Input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="e.g. Atomic structure, lesson 2"
              />
            </Field>
            <div className="grid gap-4 md:grid-cols-[0.7fr_1.3fr]">
              <Field label="Cues" hint="questions and keywords">
                <TextArea rows={12} value={draft.cues} onChange={(e) => setDraft({ ...draft, cues: e.target.value })} />
              </Field>
              <Field label="Notes">
                <TextArea rows={12} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
              </Field>
            </div>
            <Field label="Summary" hint="in your own words">
              <TextArea rows={3} value={draft.summary} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={!draft.title.trim()}>
                <Save className="h-4 w-4" /> Save page
              </Button>
              <Button
                variant="soft"
                onClick={summarize}
                disabled={(!draft.notes.trim() && !draft.cues.trim()) || summaryStream.status === 'thinking' || summaryStream.status === 'streaming'}
              >
                <Sparkles className="h-4 w-4" /> AI cues and summary
              </Button>
            </div>
            <AIOutput
              compact
              text={summaryStream.text}
              status={summaryStream.status}
              error={summaryStream.error}
              onStop={summaryStream.stop}
              thinkingLabel="Reading your page"
            />
          </Card>
        </form>
      </div>
    </View>
  )
}
