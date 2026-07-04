import {
  Type,
  Contrast,
  Palette,
  Volume2,
  VolumeX,
  Focus,
  Eye,
  Check,
} from 'lucide-react'
import { useAccessibility } from '../context/AccessibilityContext'

const COLORBLIND_OPTIONS = [
  { id: 'none', label: 'Default' },
  { id: 'protanopia', label: 'Protanopia' },
  { id: 'deuteranopia', label: 'Deuteranopia' },
  { id: 'tritanopia', label: 'Tritanopia' },
]

function ToggleRow({ icon: Icon, label, description, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 transition-colors hover:border-zinc-700">
      <div className="mt-0.5 rounded-md bg-zinc-800 p-2">
        <Icon className="h-4 w-4 text-violet-400" aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-zinc-200">{label}</span>
          <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
              checked ? 'bg-violet-600' : 'bg-zinc-700'
            }`}
          >
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                checked ? 'left-4' : 'left-0.5'
              }`}
            />
          </button>
        </div>
        {description && (
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">{description}</p>
        )}
      </div>
    </label>
  )
}

export default function AccessibilityPanel() {
  const { settings, toggle, setColorblindMode, speak, stopSpeaking } = useAccessibility()

  const handleTtsDemo = () => {
    if (window.speechSynthesis?.speaking) {
      stopSpeaking()
      return
    }
    speak(
      'Welcome to LearnDifferent. Text-to-speech is active. Use Control plus Space anywhere to hear page context.',
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <header>
        <h1 className="text-xl font-semibold text-zinc-100">Accessibility Settings</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Customize the interface for dyslexia, color vision, ADHD focus, and screen reading.
        </p>
      </header>

      <section aria-labelledby="typography-heading" className="space-y-3">
        <h2 id="typography-heading" className="text-xs font-semibold uppercase tracking-widest text-zinc-600">
          Typography & Vision
        </h2>
        <ToggleRow
          icon={Type}
          label="OpenDyslexic Font"
          description="Switch to OpenDyslexic — a typeface designed for dyslexic readers."
          checked={settings.dyslexiaFont}
          onChange={() => toggle('dyslexiaFont')}
        />
        <ToggleRow
          icon={Contrast}
          label="High Contrast Mode"
          description="Maximum contrast black/white palette for low vision users."
          checked={settings.highContrast}
          onChange={() => toggle('highContrast')}
        />
      </section>

      <section aria-labelledby="colorblind-heading" className="space-y-3">
        <h2 id="colorblind-heading" className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-zinc-600">
          <Palette className="h-3.5 w-3.5" aria-hidden="true" />
          Colorblind Palettes
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {COLORBLIND_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setColorblindMode(opt.id)}
              className={`relative rounded-lg border px-3 py-2.5 text-xs font-medium transition-colors ${
                settings.colorblindMode === opt.id
                  ? 'border-violet-500 bg-violet-950/40 text-violet-300'
                  : 'border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              {settings.colorblindMode === opt.id && (
                <Check className="absolute right-1.5 top-1.5 h-3 w-3 text-violet-400" />
              )}
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      <section aria-labelledby="adhd-heading" className="space-y-3">
        <h2 id="adhd-heading" className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-zinc-600">
          <Focus className="h-3.5 w-3.5" aria-hidden="true" />
          ADHD / Planning Layout
        </h2>
        <ToggleRow
          icon={Eye}
          label="Focus Mode"
          description="Wider line spacing, reduced sidebar noise, one-task-at-a-time layout."
          checked={settings.adhdFocus}
          onChange={() => toggle('adhdFocus')}
        />
      </section>

      <section aria-labelledby="tts-heading" className="space-y-3">
        <h2 id="tts-heading" className="text-xs font-semibold uppercase tracking-widest text-zinc-600">
          Text-to-Speech
        </h2>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-zinc-200">Browser TTS</p>
              <p className="mt-1 text-xs text-zinc-500">
                Press <kbd className="rounded border border-zinc-700 px-1 text-zinc-400">Ctrl+Space</kbd> globally to read the current view aloud.
              </p>
            </div>
            <button
              type="button"
              onClick={handleTtsDemo}
              className="flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-700"
            >
              {window.speechSynthesis?.speaking ? (
                <>
                  <VolumeX className="h-4 w-4" /> Stop
                </>
              ) : (
                <>
                  <Volume2 className="h-4 w-4" /> Test Voice
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-600">
          Keyboard Shortcuts
        </h2>
        <ul className="mt-3 space-y-2 text-sm text-zinc-400">
          <li className="flex justify-between">
            <span>Toggle AI voice (TTS)</span>
            <kbd className="rounded border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-xs">Ctrl+Space</kbd>
          </li>
          <li className="flex justify-between">
            <span>Open Accessibility panel</span>
            <kbd className="rounded border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-xs">Ctrl+Shift+A</kbd>
          </li>
          <li className="flex justify-between">
            <span>Go to Dashboard</span>
            <kbd className="rounded border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-xs">Ctrl+1</kbd>
          </li>
          <li className="flex justify-between">
            <span>URL Study Generator</span>
            <kbd className="rounded border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-xs">Ctrl+2</kbd>
          </li>
        </ul>
      </section>
    </div>
  )
}
