import { useMemo } from 'react'
import {
  ArrowRight,
  Bot,
  CreditCard,
  Flame,
  Gamepad2,
  Library,
  Link2,
  Timer,
  Video,
  Zap,
} from 'lucide-react'
import { View, Card, StatTile, Button } from '../components/ui'
import Mascot from '../components/Mascot'
import { ICONS } from '../components/Sidebar'
import { getDecks, getBooks, getHistory, studyStreakDays, readStored } from '../lib/store'
import { useAuth } from '../context/AuthContext'

function timeGreeting() {
  const hour = new Date().getHours()
  if (hour < 5) return 'Burning the midnight oil'
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function timeAgo(ts) {
  const mins = Math.floor((Date.now() - ts) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.floor(hours / 24)
  return days === 1 ? 'yesterday' : `${days} days ago`
}

export default function Overview({ onNavigate }) {
  const { user } = useAuth()
  const { decks, books, history, streak, dueCards, sessions } = useMemo(() => {
    const allDecks = getDecks()
    const allBooks = getBooks()
    const fullHistory = getHistory()
    return {
      decks: allDecks,
      books: allBooks,
      history: fullHistory,
      streak: studyStreakDays(fullHistory),
      dueCards: allDecks.reduce(
        (sum, deck) => sum + deck.cards.filter((c) => c.due <= Date.now()).length,
        0,
      ),
      sessions: readStored('learndifferent.sessions', []),
    }
  }, [])

  const recommendations = useMemo(() => {
    const recs = []
    if (dueCards > 0) {
      recs.push({
        id: 'flashcards',
        icon: CreditCard,
        title: `Review ${dueCards} due card${dueCards === 1 ? '' : 's'}`,
        reason: 'Spaced repetition works best when you catch cards on their due day.',
      })
    }
    const lastBlurt = history.find((h) => h.view === 'blurt')
    if (!lastBlurt || Date.now() - lastBlurt.at > 2 * 86400000) {
      recs.push({
        id: 'blurt',
        icon: Zap,
        title: 'Do a two minute blurt',
        reason: 'Pick a topic and write everything you remember. Gemini will find the gaps.',
      })
    }
    if (books.every((b) => b.pages.length === 0)) {
      recs.push({
        id: 'cornell',
        icon: Library,
        title: 'Start your first notebook',
        reason: 'Your bookshelf is empty. Cornell pages make revision much faster later.',
      })
    }
    recs.push({
      id: 'interview',
      icon: Video,
      title: 'Try the Interview Simulator',
      reason: 'Practice speaking answers out loud with an AI interviewer and instant feedback.',
    })
    recs.push({
      id: 'crawler',
      icon: Link2,
      title: 'Turn an article into study material',
      reason: 'Paste any URL and watch the URL Studio build recall questions from it.',
    })
    return recs.slice(0, 3)
  }, [dueCards, history, books])

  const stats = [
    { label: 'Day streak', value: streak, sub: streak > 0 ? 'Keep it going' : 'Start today', tone: 'clay' },
    { label: 'Cards due', value: dueCards, sub: `${decks.reduce((s, d) => s + d.cards.length, 0)} cards total`, tone: 'sky' },
    { label: 'Notebooks', value: books.length, sub: `${books.reduce((s, b) => s + b.pages.length, 0)} pages saved`, tone: 'gold' },
    { label: 'Focus sessions', value: sessions.length, sub: 'Timed practice runs', tone: 'moss' },
  ]

  const shortcuts = [
    { id: 'tutor', label: 'Ask Study Chat', icon: Bot },
    { id: 'timed', label: 'Start a timer', icon: Timer },
    { id: 'arcade', label: 'Take a break', icon: Gamepad2 },
  ]

  return (
    <View
      eyebrow={new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
      title={`${timeGreeting()}, ${user?.display_name || 'friend'}`}
      description="Here is where your study is at, and the smartest next move."
      wide
    >
      <section className="mascot-welcome grid items-center gap-5 overflow-hidden rounded-card border border-line bg-raised px-5 py-5 shadow-card md:grid-cols-[1fr_15rem] animate-fade-up">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-clay">Study buddy online</p>
          <h2 className="mt-2 font-display text-2xl font-semibold leading-tight text-ink">
            Small steps count. Pick the next one.
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-faint">
            Jump into chat, sketch working on the math board, or review what is due today.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => onNavigate('tutor')}>
              Ask Study Chat <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" onClick={() => onNavigate('whiteboard')}>
              Open Whiteboard
            </Button>
          </div>
        </div>
        <div className="grid min-h-44 place-items-center">
          <Mascot pose="wave" />
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 animate-fade-up">
        {stats.map((stat) => (
          <StatTile key={stat.label} {...stat} />
        ))}
      </div>

      <section aria-label="Recommended next steps" className="animate-fade-up">
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold text-ink">
          <Flame className="h-5 w-5 text-clay" aria-hidden="true" /> Recommended next
        </h2>
        <div className="grid gap-3 lg:grid-cols-3">
          {recommendations.map((rec) => (
            <Card key={rec.id} className="group flex flex-col transition-shadow hover:shadow-lift">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-clay-wash text-clay">
                <rec.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-3 font-semibold text-ink">{rec.title}</h3>
              <p className="mt-1 flex-1 text-sm leading-relaxed text-faint">{rec.reason}</p>
              <Button
                variant="soft"
                size="sm"
                className="mt-4 self-start"
                onClick={() => onNavigate(rec.id)}
              >
                Open <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Card>
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr] animate-fade-up">
        <Card>
          <h2 className="font-display text-lg font-semibold text-ink">Recent activity</h2>
          {history.length === 0 ? (
            <p className="mt-3 text-sm text-faint">
              Nothing yet. Everything you do here shows up as a timeline, so future you can see the work add up.
            </p>
          ) : (
            <ol className="mt-3 space-y-1">
              {history.slice(0, 8).map((item, i) => {
                const Icon = ICONS[item.view] || Zap
                return (
                  <li key={`${item.at}-${i}`}>
                    <button
                      type="button"
                      onClick={() => onNavigate(item.view)}
                      className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-sunken"
                    >
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-sunken text-faint">
                        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm text-soft">{item.label}</span>
                      <span className="shrink-0 text-xs text-faint/70">{timeAgo(item.at)}</span>
                    </button>
                  </li>
                )
              })}
            </ol>
          )}
        </Card>

        <Card>
          <h2 className="font-display text-lg font-semibold text-ink">Jump back in</h2>
          <div className="mt-3 space-y-2">
            {shortcuts.map((shortcut) => (
              <button
                key={shortcut.id}
                type="button"
                onClick={() => onNavigate(shortcut.id)}
                className="flex w-full items-center gap-3 rounded-xl border border-line bg-paper px-3 py-3 text-left text-sm font-medium text-soft transition-all hover:border-clay/40 hover:text-ink hover:shadow-card"
              >
                <shortcut.icon className="h-4 w-4 text-clay" aria-hidden="true" />
                {shortcut.label}
                <ArrowRight className="ml-auto h-3.5 w-3.5 text-faint" aria-hidden="true" />
              </button>
            ))}
          </div>
          <p className="mt-4 rounded-xl bg-sunken/70 p-3 text-xs leading-relaxed text-faint">
            Tip: press Ctrl+Space anywhere to have the page read aloud, and Ctrl+Shift+A to open
            accessibility settings.
          </p>
        </Card>
      </div>
    </View>
  )
}
