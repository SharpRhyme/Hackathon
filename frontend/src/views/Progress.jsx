import { useMemo } from 'react'
import { BarChart3 } from 'lucide-react'
import { View, Card, StatTile } from '../components/ui'
import Mascot from '../components/Mascot'
import { getDecks, getHistory, studyStreakDays, readStored } from '../lib/store'

// Sequential clay ramp, light to dark, for the activity heat strip.
const HEAT_STEPS = ['#EDE8DD', '#F2D2C0', '#E5A47E', '#C1502B', '#8F3517']

const TOOL_LABELS = {
  flashcards: 'Flashcards',
  blurt: 'Blurt Method',
  cornell: 'Bookshelf',
  mindmap: 'Mind Maps',
  timed: 'Timed Practice',
  exemplar: 'Exemplars',
  tutor: 'Study Chat',
  crawler: 'URL Studio',
  interview: 'Interview Sim',
  paths: 'Adaptive Paths',
  arcade: 'Break Room',
}

export default function Progress() {
  const { history, streak, weeks, toolCounts, totals } = useMemo(() => {
    const fullHistory = getHistory()
    const decks = getDecks()
    const sessions = readStored('learndifferent.sessions', [])

    // 12 weeks x 7 days grid, oldest column first, aligned so the last cell is today.
    const dayCounts = new Map()
    for (const item of fullHistory) {
      const key = new Date(item.at).toDateString()
      dayCounts.set(key, (dayCounts.get(key) || 0) + 1)
    }
    const gridWeeks = []
    const today = new Date()
    for (let w = 11; w >= 0; w--) {
      const column = []
      for (let d = 6; d >= 0; d--) {
        const date = new Date(today)
        date.setDate(today.getDate() - (w * 7 + d))
        column.push({ date, count: dayCounts.get(date.toDateString()) || 0 })
      }
      gridWeeks.push(column)
    }

    const counts = {}
    for (const item of fullHistory) counts[item.view] = (counts[item.view] || 0) + 1
    const ranked = Object.entries(counts)
      .map(([view, count]) => ({ view, count, label: TOOL_LABELS[view] || view }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)

    return {
      history: fullHistory,
      streak: studyStreakDays(fullHistory),
      weeks: gridWeeks,
      toolCounts: ranked,
      totals: {
        activities: fullHistory.length,
        cards: decks.reduce((s, d) => s + d.cards.length, 0),
        minutes: sessions.reduce((s, x) => s + (x.minutes || 0), 0),
      },
    }
  }, [])

  const maxCount = Math.max(1, ...toolCounts.map((t) => t.count))
  const heatLevel = (count) =>
    count === 0 ? 0 : count === 1 ? 1 : count <= 3 ? 2 : count <= 6 ? 3 : 4

  return (
    <View
      icon={BarChart3}
      eyebrow="Momentum"
      title="Progress"
      description="Proof that the work is adding up: your streak, your activity, and where your time actually goes."
      actions={<Mascot pose="cheer" size={4} />}
      wide
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Day streak" value={streak} sub="Consecutive days with study activity" tone="clay" />
        <StatTile label="Activities" value={totals.activities} sub="Everything logged, all time" tone="sky" />
        <StatTile label="Cards owned" value={totals.cards} sub="Across all decks" tone="gold" />
        <StatTile label="Focused minutes" value={totals.minutes} sub="From finished timed sessions" tone="moss" />
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold text-ink">Last 12 weeks</h2>
          <div className="flex items-center gap-1.5 text-xs text-faint">
            Less
            {HEAT_STEPS.map((color) => (
              <span key={color} className="h-3 w-3 rounded-[3px]" style={{ background: color }} aria-hidden="true" />
            ))}
            More
          </div>
        </div>
        <div className="mt-4 overflow-x-auto pb-1">
          <div className="flex gap-1" role="img" aria-label={`Activity heat map for the last 12 weeks. ${totals.activities} activities total.`}>
            {weeks.map((column, w) => (
              <div key={w} className="flex flex-col gap-1">
                {column.map((cell) => (
                  <span
                    key={cell.date.toISOString()}
                    className="h-3.5 w-3.5 rounded-[3px] transition-transform hover:scale-125"
                    style={{ background: HEAT_STEPS[heatLevel(cell.count)] }}
                    title={`${cell.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}: ${cell.count} ${cell.count === 1 ? 'activity' : 'activities'}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="font-display text-lg font-semibold text-ink">Where your effort goes</h2>
        {toolCounts.length === 0 ? (
          <p className="mt-3 text-sm text-faint">
            No activity yet. Use any tool and this chart starts filling in.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {toolCounts.map((tool) => (
              <li key={tool.view} className="grid grid-cols-[8rem_1fr_2.5rem] items-center gap-3">
                <span className="truncate text-sm font-medium text-soft">{tool.label}</span>
                <div
                  className="h-4 rounded-full bg-sunken"
                  role="meter"
                  aria-valuenow={tool.count}
                  aria-valuemax={maxCount}
                  aria-label={`${tool.label}: ${tool.count} activities`}
                >
                  <div
                    className="h-full rounded-full bg-clay transition-all duration-500"
                    style={{ width: `${Math.max(4, (tool.count / maxCount) * 100)}%` }}
                  />
                </div>
                <span className="text-right text-sm tabular-nums text-ink">{tool.count}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {history.length > 0 && (
        <Card>
          <h2 className="font-display text-lg font-semibold text-ink">Milestones</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {[
              totals.activities >= 1 && 'First study activity logged',
              streak >= 3 && `${streak} day streak, habit forming`,
              totals.cards >= 20 && `${totals.cards} flashcards in your collection`,
              totals.minutes >= 60 && `Over ${Math.floor(totals.minutes / 60)} hour${totals.minutes >= 120 ? 's' : ''} of deep focus`,
              totals.activities >= 25 && 'Twenty five activities, seriously consistent',
            ]
              .filter(Boolean)
              .map((milestone) => (
                <li key={milestone} className="flex items-center gap-2 rounded-xl bg-moss-wash px-3 py-2.5 text-sm text-moss">
                  <span aria-hidden="true">{'✓'}</span> {milestone}
                </li>
              ))}
          </ul>
        </Card>
      )}
    </View>
  )
}
