import { ICONS } from './Sidebar'

const MOCK_CONTENT = {
  dashboard: {
    title: 'Dashboard',
    description: 'Your learning hub — track progress across all subjects.',
    stats: [
      { label: 'Study streak', value: '4 days' },
      { label: 'Cards due today', value: '12' },
      { label: 'Sessions this week', value: '7' },
    ],
  },
  flashcards: {
    title: 'Flashcards (SRS)',
    description: 'Spaced repetition system — cards resurface right before you forget.',
    mock: ['Front: What is active recall?', 'Back: Retrieving info from memory strengthens retention.'],
  },
  exemplar: {
    title: 'Exemplar Essays',
    description: 'Annotated model essays with structure breakdowns for visual learners.',
  },
  timed: {
    title: 'Timed Practice',
    description: 'Pomodoro-style timed sessions with gentle break reminders.',
  },
  mindmap: {
    title: 'Mind Maps',
    description: 'Visual concept mapping — drag nodes, link ideas, export as PNG.',
  },
  cornell: {
    title: 'Cornell Notes',
    description: 'Cue / Notes / Summary columns with auto-chunking for dyslexia-friendly reading.',
  },
  tutor: {
    title: 'AI Tutor',
    description: 'Socratic dialogue tutor — asks guiding questions instead of giving answers.',
  },
  paths: {
    title: 'Adaptive Paths',
    description: 'Personalized learning routes based on your strengths and gaps.',
  },
  progress: {
    title: 'Progress Dashboard',
    description: 'Visual progress rings, weekly heatmaps, and subject breakdowns.',
  },
  desmos: {
    title: 'Desmos Integration',
    description: 'Interactive graphing calculator embedded for visual math learners.',
    embed: true,
  },
  whiteboard: {
    title: 'Step-by-Step Whiteboard',
    description: 'Write out math steps; AI validates each line before you proceed.',
  },
  comprehension: {
    title: 'Comprehension Practice',
    description: 'Short passages with scaffolded questions — literal, inferential, evaluative.',
  },
  essay: {
    title: 'Essay Planner',
    description: 'Thesis → Arguments → Evidence → Conclusion scaffold with drag-and-drop.',
  },
  feedback: {
    title: 'AI Feedback',
    description: 'Upload or paste essays for structured feedback on structure, clarity, and grammar.',
  },
  diagrams: {
    title: 'Interactive Diagrams',
    description: 'Clickable cell diagrams, circuit builders, and force vector visualizers.',
  },
  labs: {
    title: 'Virtual Labs',
    description: 'Safe simulated experiments — adjust variables, observe outcomes.',
  },
  equations: {
    title: 'Equation Solver',
    description: 'Step-by-step chemistry and physics equation balancing with explanations.',
  },
}

export default function FeatureView({ viewId }) {
  const content = MOCK_CONTENT[viewId] || {
    title: viewId,
    description: 'Feature coming soon.',
  }
  const Icon = ICONS[viewId] || ICONS.dashboard

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <header>
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-violet-400" aria-hidden="true" />
          <h1 className="text-xl font-semibold text-zinc-100">{content.title}</h1>
        </div>
        <p className="mt-1 text-sm text-zinc-500">{content.description}</p>
      </header>

      {content.stats && (
        <div className="grid grid-cols-3 gap-3">
          {content.stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 text-center"
            >
              <p className="text-2xl font-semibold text-zinc-100">{stat.value}</p>
              <p className="mt-1 text-xs text-zinc-500">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {content.mock && (
        <div className="space-y-2">
          {content.mock.map((line, i) => (
            <div
              key={i}
              className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-400"
            >
              {line}
            </div>
          ))}
        </div>
      )}

      {content.embed && (
        <div className="overflow-hidden rounded-lg border border-zinc-800">
          <iframe
            src="https://www.desmos.com/calculator"
            title="Desmos Calculator"
            className="h-96 w-full bg-white"
            loading="lazy"
          />
        </div>
      )}

      {!content.stats && !content.mock && !content.embed && (
        <div className="rounded-lg border border-dashed border-zinc-800 p-12 text-center">
          <Icon className="mx-auto h-10 w-10 text-zinc-700" aria-hidden="true" />
          <p className="mt-4 text-sm text-zinc-500">
            Prototype shell — wire up backend logic post-hackathon.
          </p>
          <span className="mt-3 inline-block rounded-full border border-zinc-700 px-3 py-1 text-[10px] uppercase tracking-widest text-zinc-600">
            Mock UI
          </span>
        </div>
      )}
    </div>
  )
}
