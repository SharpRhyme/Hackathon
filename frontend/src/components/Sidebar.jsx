import {
  LayoutDashboard,
  Brain,
  Layers,
  TrendingUp,
  Calculator,
  PenLine,
  FlaskConical,
  BookOpen,
  Zap,
  CreditCard,
  FileText,
  Timer,
  Network,
  StickyNote,
  Bot,
  Route,
  BarChart3,
  LineChart,
  PenTool,
  BookMarked,
  Sparkles,
  Microscope,
  Atom,
  Accessibility,
  ChevronLeft,
  ChevronRight,
  Link2,
  UserCircle,
} from 'lucide-react'
import { useAccessibility } from '../context/AccessibilityContext'

const ICONS = {
  dashboard: LayoutDashboard,
  blurt: Zap,
  flashcards: CreditCard,
  exemplar: FileText,
  timed: Timer,
  mindmap: Network,
  cornell: StickyNote,
  tutor: Bot,
  paths: Route,
  progress: BarChart3,
  desmos: LineChart,
  whiteboard: PenTool,
  comprehension: BookMarked,
  essay: PenLine,
  feedback: Sparkles,
  diagrams: Atom,
  labs: Microscope,
  equations: Calculator,
  crawler: Link2,
  accessibility: Accessibility,
  account: UserCircle,
}

const NAV_SECTIONS = [
  {
    id: 'overview',
    label: 'Overview',
    items: [{ id: 'dashboard', label: 'Dashboard', icon: 'dashboard' }],
  },
  {
    id: 'study',
    label: 'Study Methods',
    items: [
      { id: 'blurt', label: 'Blurt Method', icon: 'blurt' },
      { id: 'flashcards', label: 'Flashcards (SRS)', icon: 'flashcards' },
      { id: 'exemplar', label: 'Exemplar Essays', icon: 'exemplar' },
      { id: 'timed', label: 'Timed Practice', icon: 'timed' },
      { id: 'mindmap', label: 'Mind Maps', icon: 'mindmap' },
      { id: 'cornell', label: 'Cornell Notes', icon: 'cornell' },
      { id: 'crawler', label: 'URL Study Generator', icon: 'crawler', highlight: true },
    ],
  },
  {
    id: 'generic',
    label: 'Generic',
    items: [
      { id: 'tutor', label: 'AI Tutor', icon: 'tutor' },
      { id: 'paths', label: 'Adaptive Paths', icon: 'paths' },
      { id: 'progress', label: 'Progress Dashboard', icon: 'progress' },
    ],
  },
  {
    id: 'math',
    label: 'Math',
    items: [
      { id: 'desmos', label: 'Desmos Integration', icon: 'desmos' },
      { id: 'whiteboard', label: 'Step-by-Step Whiteboard', icon: 'whiteboard' },
    ],
  },
  {
    id: 'english',
    label: 'English',
    items: [
      { id: 'comprehension', label: 'Comprehension Practice', icon: 'comprehension' },
      { id: 'essay', label: 'Essay Planner', icon: 'essay' },
      { id: 'feedback', label: 'AI Feedback', icon: 'feedback' },
    ],
  },
  {
    id: 'science',
    label: 'Science',
    items: [
      { id: 'diagrams', label: 'Interactive Diagrams', icon: 'diagrams' },
      { id: 'labs', label: 'Virtual Labs', icon: 'labs' },
      { id: 'equations', label: 'Equation Solver', icon: 'equations' },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    items: [
      { id: 'account', label: 'Account', icon: 'account' },
      { id: 'accessibility', label: 'Accessibility', icon: 'accessibility' },
    ],
  },
]

export default function Sidebar({ activeView, onNavigate }) {
  const { settings, setSettings } = useAccessibility()
  const collapsed = settings.sidebarCollapsed

  return (
    <aside
      className={`flex flex-col border-r border-zinc-800 bg-zinc-950 transition-all duration-200 ${
        collapsed ? 'w-14' : 'w-60'
      }`}
      aria-label="Main navigation"
    >
      <div className="flex h-12 items-center justify-between border-b border-zinc-800 px-3">
        {!collapsed && (
          <div className="flex items-center gap-2 overflow-hidden">
            <Brain className="h-5 w-5 shrink-0 text-violet-400" aria-hidden="true" />
            <span className="truncate text-sm font-semibold tracking-tight text-zinc-100">
              LearnDifferent
            </span>
          </div>
        )}
        <button
          type="button"
          onClick={() =>
            setSettings((s) => ({ ...s, sidebarCollapsed: !s.sidebarCollapsed }))
          }
          className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-thin py-2">
        {NAV_SECTIONS.map((section) => (
          <div
            key={section.id}
            className={`sidebar-section mb-1 ${activeView === section.items[0]?.id ? 'active-section' : ''}`}
          >
            {!collapsed && (
              <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
                {section.label}
              </p>
            )}
            <ul className="space-y-0.5 px-2">
              {section.items.map((item) => {
                const Icon = ICONS[item.icon] || BookOpen
                const isActive = activeView === item.id
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onNavigate(item.id)}
                      title={collapsed ? item.label : undefined}
                      className={`group flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors ${
                        isActive
                          ? 'bg-zinc-800/80 text-zinc-100'
                          : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                      } ${item.highlight && !isActive ? 'border border-violet-900/40' : ''}`}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <Icon
                        className={`h-4 w-4 shrink-0 ${
                          isActive ? 'text-violet-400' : 'text-zinc-500 group-hover:text-zinc-400'
                        }`}
                        aria-hidden="true"
                      />
                      {!collapsed && (
                        <span className="truncate">
                          {item.label}
                          {item.highlight && (
                            <span className="ml-1 text-[10px] text-violet-400">★</span>
                          )}
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {!collapsed && (
        <div className="border-t border-zinc-800 p-3">
          <p className="text-[10px] leading-relaxed text-zinc-600">
            <kbd className="rounded border border-zinc-700 bg-zinc-900 px-1 py-0.5 text-zinc-400">
              Ctrl
            </kbd>{' '}
            +{' '}
            <kbd className="rounded border border-zinc-700 bg-zinc-900 px-1 py-0.5 text-zinc-400">
              Space
            </kbd>{' '}
            — AI voice
          </p>
        </div>
      )}
    </aside>
  )
}

export { NAV_SECTIONS, ICONS }
