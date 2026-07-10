import {
  Accessibility,
  Atom,
  BarChart3,
  BookMarked,
  BookOpen,
  Bot,
  Brain,
  Calculator,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileText,
  Gamepad2,
  Home,
  LineChart,
  Link2,
  Library,
  Microscope,
  Network,
  PenLine,
  PenTool,
  Route,
  Sparkles,
  Timer,
  UserCircle,
  Video,
  Zap,
} from 'lucide-react'
import { useAccessibility } from '../context/AccessibilityContext'

const ICONS = {
  dashboard: Home,
  blurt: Zap,
  flashcards: CreditCard,
  exemplar: FileText,
  timed: Timer,
  mindmap: Network,
  cornell: Library,
  tutor: Bot,
  interview: Video,
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
  arcade: Gamepad2,
  accessibility: Accessibility,
  account: UserCircle,
}

const NAV_SECTIONS = [
  {
    id: 'home',
    label: 'Home',
    items: [
      { id: 'dashboard', label: 'Home', icon: 'dashboard' },
      { id: 'progress', label: 'Progress', icon: 'progress' },
      { id: 'arcade', label: 'Arcade & Pomodoro', icon: 'arcade' },
    ],
  },
  {
    id: 'notes',
    label: 'Notes & Ideas',
    items: [
      { id: 'cornell', label: 'Bookshelf', icon: 'cornell' },
      { id: 'mindmap', label: 'Mind Maps', icon: 'mindmap' },
      { id: 'crawler', label: 'URL Studio', icon: 'crawler' },
    ],
  },
  {
    id: 'practice',
    label: 'Practice & Recall',
    items: [
      { id: 'flashcards', label: 'Flashcards', icon: 'flashcards' },
      { id: 'blurt', label: 'Blurt Method', icon: 'blurt' },
      { id: 'timed', label: 'Timed Practice', icon: 'timed' },
      { id: 'interview', label: 'Interview Sim', icon: 'interview' },
    ],
  },
  {
    id: 'ai',
    label: 'AI Coaching',
    items: [
      { id: 'tutor', label: 'Study Chat', icon: 'tutor' },
      { id: 'paths', label: 'Adaptive Paths', icon: 'paths' },
      { id: 'exemplar', label: 'Exemplar Essays', icon: 'exemplar' },
      { id: 'feedback', label: 'Essay Feedback', icon: 'feedback' },
    ],
  },
  {
    id: 'math',
    label: 'Maths Tools',
    items: [
      { id: 'desmos', label: 'Graphing', icon: 'desmos' },
      { id: 'whiteboard', label: 'Math Whiteboard', icon: 'whiteboard' },
      { id: 'equations', label: 'Equation Solver', icon: 'equations' },
    ],
  },
  {
    id: 'english-science',
    label: 'English & Science',
    items: [
      { id: 'essay', label: 'Essay Planner', icon: 'essay' },
      { id: 'comprehension', label: 'Comprehension', icon: 'comprehension' },
      { id: 'diagrams', label: 'Diagrams', icon: 'diagrams' },
      { id: 'labs', label: 'Virtual Labs', icon: 'labs' },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    items: [
      { id: 'accessibility', label: 'Appearance & Access', icon: 'accessibility' },
      { id: 'account', label: 'Account', icon: 'account' },
    ],
  },
]

export default function Sidebar({ activeView, onNavigate }) {
  const { settings, setSettings } = useAccessibility()
  const collapsed = settings.sidebarCollapsed

  return (
    <aside
      className={`sidebar-shell flex flex-col border-r border-line bg-raised/92 backdrop-blur-xl transition-all duration-300 ${
        collapsed ? 'w-[4.75rem]' : 'w-[18rem]'
      }`}
      aria-label="Main navigation"
    >
      <div className="flex h-[4.35rem] items-center justify-between border-b border-line/70 px-3.5">
        {!collapsed && (
          <div className="flex items-center gap-3 overflow-hidden">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-ink text-white shadow-card">
              <Brain className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-semibold tracking-tight text-ink">
                LearnDifferent
              </span>
              <span className="block truncate text-[11px] font-medium text-faint">Study workspace</span>
            </span>
          </div>
        )}
        <button
          type="button"
          onClick={() => setSettings((s) => ({ ...s, sidebarCollapsed: !s.sidebarCollapsed }))}
          className="grid h-8 w-8 place-items-center rounded-full text-faint transition-colors hover:bg-sunken hover:text-ink"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-thin px-2 py-3.5">
        {NAV_SECTIONS.map((section) => {
          const sectionActive = section.items.some((item) => item.id === activeView)
          return (
            <div
              key={section.id}
              className={`sidebar-section mb-3 ${sectionActive ? 'active-section' : ''}`}
            >
              {!collapsed && (
                <p className="px-3.5 pb-1.5 pt-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-faint">
                  {section.label}
                </p>
              )}
              <ul className="space-y-1">
                {section.items.map((item) => {
                  const Icon = ICONS[item.icon] || BookOpen
                  const isActive = activeView === item.id
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => onNavigate(item.id)}
                        title={collapsed ? item.label : undefined}
                        className={`nav-item group flex w-full items-center gap-3 rounded-[13px] px-3 py-2.5 text-left text-[13px] font-medium transition-all ${
                          item.id === 'dashboard' ? 'home-nav-item' : ''
                        } ${
                          isActive
                            ? 'active bg-ink text-white shadow-card'
                            : 'text-soft hover:bg-sunken/75 hover:text-ink'
                        }`}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        <Icon
                          className={`h-[17px] w-[17px] shrink-0 ${
                            isActive ? 'text-white' : 'text-faint group-hover:text-soft'
                          }`}
                          aria-hidden="true"
                        />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </nav>
    </aside>
  )
}

export { NAV_SECTIONS, ICONS }
