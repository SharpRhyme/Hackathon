import { useEffect, useState } from 'react'

// localStorage-backed state, shared by every feature.
export function useStoredState(key, fallback) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw === null ? fallback : JSON.parse(raw) ?? fallback
    } catch {
      return fallback
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Storage full or blocked; keep going with in-memory state.
    }
  }, [key, value])

  return [value, setValue]
}

export function readStored(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? fallback : JSON.parse(raw) ?? fallback
  } catch {
    return fallback
  }
}

// ---------------------------------------------------------------- history

const HISTORY_KEY = 'ld.history'
const HISTORY_LIMIT = 300

// Records one activity event: {at, view, label}. Consumed by Overview and Progress.
export function logActivity(view, label) {
  try {
    const list = readStored(HISTORY_KEY, [])
    list.unshift({ at: Date.now(), view, label })
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, HISTORY_LIMIT)))
  } catch {
    // Best effort only.
  }
}

export function getHistory() {
  return readStored(HISTORY_KEY, [])
}

export function studyStreakDays(history = getHistory()) {
  const days = new Set(history.map((h) => new Date(h.at).toDateString()))
  let streak = 0
  const cursor = new Date()
  for (;;) {
    if (days.has(cursor.toDateString())) {
      streak += 1
      cursor.setDate(cursor.getDate() - 1)
    } else if (streak === 0 && cursor.toDateString() === new Date().toDateString()) {
      cursor.setDate(cursor.getDate() - 1)
    } else {
      break
    }
  }
  return streak
}

// ------------------------------------------------------------- study data

// Decks: [{id, name, color, cards: [{id, front, back, box, due}]}]
export const DECKS_KEY = 'ld.decks'
// Notebooks: [{id, title, color, pages: [{id, title, cues, notes, summary, updatedAt}]}]
export const BOOKS_KEY = 'ld.notebooks'
export const MINDMAPS_KEY = 'ld.mindmaps'
export const MASCOT_KEY = 'ld.mascot'

export function migrateLegacyData() {
  try {
    if (!localStorage.getItem(DECKS_KEY)) {
      const legacyCards = readStored('learndifferent.flashcards', null)
      const decks = [
        {
          id: 'starter',
          name: 'Study Skills',
          color: 'clay',
          cards:
            Array.isArray(legacyCards) && legacyCards.length
              ? legacyCards
              : [
                  { id: 1, front: 'What is active recall?', back: 'Pulling information out of memory to strengthen it.', box: 1, due: Date.now() },
                  { id: 2, front: 'What is the Cornell method?', back: 'A notes page split into cues, notes, and a summary.', box: 1, due: Date.now() },
                  { id: 3, front: 'Why space out reviews?', back: 'Reviewing just before you forget makes memories more durable.', box: 1, due: Date.now() },
                ],
        },
      ]
      localStorage.setItem(DECKS_KEY, JSON.stringify(decks))
    }
    if (!localStorage.getItem(BOOKS_KEY)) {
      const legacyNotes = readStored('learndifferent.cornell', [])
      const books = [
        {
          id: 'first',
          title: 'My First Notebook',
          color: '#B2842C',
          pages: (Array.isArray(legacyNotes) ? legacyNotes : []).map((n, i) => ({
            id: n.id || i + 1,
            title: n.title || 'Untitled page',
            cues: n.cues || '',
            notes: n.notes || '',
            summary: n.summary || '',
            updatedAt: n.updatedAt || new Date().toISOString(),
          })),
        },
      ]
      localStorage.setItem(BOOKS_KEY, JSON.stringify(books))
    }
  } catch {
    // Never block app start on migration.
  }
}

export function getDecks() {
  return readStored(DECKS_KEY, [])
}

export function getBooks() {
  return readStored(BOOKS_KEY, [])
}

// Builds a compact plain-text context bundle from selected sources for the AI chat.
export function buildStudyContext({ decks = false, books = false, maps = false } = {}) {
  const parts = []
  if (decks) {
    for (const deck of getDecks()) {
      const cards = deck.cards
        .slice(0, 40)
        .map((c) => `Q: ${c.front} A: ${c.back}`)
        .join('\n')
      parts.push(`FLASHCARD DECK "${deck.name}" (${deck.cards.length} cards):\n${cards}`)
    }
  }
  if (books) {
    for (const book of getBooks()) {
      for (const page of book.pages.slice(0, 12)) {
        parts.push(
          `NOTEBOOK "${book.title}", page "${page.title}":\nCues: ${page.cues}\nNotes: ${page.notes}\nSummary: ${page.summary}`,
        )
      }
    }
  }
  if (maps) {
    const allMaps = readStored(MINDMAPS_KEY, [])
    for (const map of allMaps) {
      const labels = (map.nodes || []).map((n) => n.label).join(', ')
      parts.push(`MIND MAP "${map.name}": ${labels}`)
    }
  }
  return parts.join('\n\n').slice(0, 22000)
}
