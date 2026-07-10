import {
  Accessibility,
  AlignCenter,
  AlignLeft,
  Baseline,
  Captions,
  Check,
  Contrast,
  Eye,
  Focus,
  MousePointer2,
  Move,
  Palette,
  RectangleHorizontal,
  RotateCcw,
  Rows3,
  ScanLine,
  Type,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { useAccessibility } from '../context/AccessibilityContext'
import { View, Card, Button, Kbd } from './ui'

const THEME_PRESETS = [
  { id: 'porcelain', label: 'Porcelain', paper: '#F5F5F7', accent: '#0066CC', ink: '#1B1B1F' },
  { id: 'sunrise', label: 'Sunrise', paper: '#FDF6EE', accent: '#E05D38', ink: '#2E201A' },
  { id: 'paper', label: 'Paper', paper: '#F6F3EC', accent: '#C14E2B', ink: '#201D17' },
  { id: 'meadow', label: 'Meadow', paper: '#F3F7F1', accent: '#2C7A4A', ink: '#1A211B' },
  { id: 'ocean', label: 'Ocean', paper: '#F0F6F9', accent: '#0D7499', ink: '#161F26' },
  { id: 'lavender', label: 'Lavender', paper: '#F7F5FA', accent: '#704AB6', ink: '#201C28' },
  { id: 'dusk', label: 'Dusk', paper: '#18181D', accent: '#F0A64C', ink: '#EEEEF3' },
]

const SANS_FONTS = ['System', 'Inter', 'Atkinson Hyperlegible', 'Karla', 'Nunito', 'IBM Plex Sans', 'Lora']
const DISPLAY_FONTS = ['System', 'Inter', 'Fraunces', 'Space Grotesk', 'Lora', 'Karla', 'IBM Plex Sans']

const COLORBLIND_OPTIONS = [
  { id: 'none', label: 'Default' },
  { id: 'protanopia', label: 'Protanopia' },
  { id: 'deuteranopia', label: 'Deuteranopia' },
  { id: 'tritanopia', label: 'Tritanopia' },
]

function ToggleRow({ icon: Icon, label, description, checked, onChange }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-line bg-raised p-3.5 transition-colors hover:border-faint/50">
      <div className="mt-0.5 rounded-lg bg-clay-wash p-2">
        <Icon className="h-4 w-4 text-clay" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-ink">{label}</span>
          <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            onClick={() => onChange(!checked)}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
              checked ? 'bg-clay' : 'bg-line'
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                checked ? 'left-[1.375rem]' : 'left-0.5'
              }`}
            />
          </button>
        </div>
        {description && <p className="mt-1 text-xs leading-relaxed text-faint">{description}</p>}
      </div>
    </div>
  )
}

function SectionTitle({ children }) {
  return (
    <h2 className="pt-2 text-xs font-bold uppercase tracking-[0.16em] text-faint">{children}</h2>
  )
}

export default function AccessibilityPanel() {
  const {
    settings,
    toggle,
    setColorblindMode,
    setReadingWidth,
    setTextAlign,
    resetAccessibility,
    speak,
    stopSpeaking,
    speaking,
    voices,
    setSettings,
  } = useAccessibility()

  const handleTtsDemo = () => {
    if (speaking) {
      stopSpeaking()
      return
    }
    speak(
      'Welcome to LearnDifferent. Text to speech is working. Press Control plus Space anywhere to hear the current page.',
    )
  }

  return (
    <View
      icon={Accessibility}
      eyebrow="Your setup"
      title="Accessibility"
      description="Shape the whole app around how you read, focus, and listen. Everything here applies instantly and is remembered."
    >
      <div className="space-y-3">
        <SectionTitle>Appearance</SectionTitle>
        <Card>
          <p className="text-sm font-medium text-ink">Theme</p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Colour theme">
            {THEME_PRESETS.map((theme) => {
              const active = (settings.theme || 'porcelain') === theme.id
              return (
                <button
                  key={theme.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setSettings((s) => ({ ...s, theme: theme.id }))}
                  className={`rounded-xl border-2 p-2.5 text-left transition-all ${
                    active ? 'border-clay shadow-card' : 'border-line hover:border-faint'
                  }`}
                  style={{ backgroundColor: theme.paper }}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="h-4 w-4 rounded-full" style={{ backgroundColor: theme.accent }} aria-hidden="true" />
                    <span className="h-4 w-4 rounded-full border" style={{ backgroundColor: theme.ink, borderColor: theme.accent }} aria-hidden="true" />
                  </span>
                  <span className="mt-2 block text-xs font-semibold" style={{ color: theme.ink }}>
                    {theme.label}
                    {active ? ' ✓' : ''}
                  </span>
                </button>
              )
            })}
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-faint">App font</span>
              <select
                value={settings.fontSans || 'System'}
                onChange={(e) => setSettings((s) => ({ ...s, fontSans: e.target.value }))}
                className="mt-1.5 w-full rounded-xl border border-line bg-raised px-3 py-2.5 text-sm text-ink focus:border-clay focus:outline-none"
              >
                {SANS_FONTS.map((font) => (
                  <option key={font} value={font} style={{ fontFamily: font }}>
                    {font}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-faint">Heading font</span>
              <select
                value={settings.fontDisplay || 'System'}
                onChange={(e) => setSettings((s) => ({ ...s, fontDisplay: e.target.value }))}
                className="mt-1.5 w-full rounded-xl border border-line bg-raised px-3 py-2.5 text-sm text-ink focus:border-clay focus:outline-none"
              >
                {DISPLAY_FONTS.map((font) => (
                  <option key={font} value={font} style={{ fontFamily: font }}>
                    {font}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </Card>

        <SectionTitle>Typography and vision</SectionTitle>
        <ToggleRow
          icon={Type}
          label="OpenDyslexic font"
          description="Switch to OpenDyslexic, a typeface designed for dyslexic readers."
          checked={settings.dyslexiaFont}
          onChange={() => toggle('dyslexiaFont')}
        />
        <ToggleRow
          icon={Contrast}
          label="High contrast mode"
          description="Maximum contrast palette for low vision. The whole app switches, not just text."
          checked={settings.highContrast}
          onChange={() => toggle('highContrast')}
        />
        <ToggleRow
          icon={Baseline}
          label="Large text"
          description="Increase interface and reading text without relying on browser zoom."
          checked={settings.largeText}
          onChange={() => toggle('largeText')}
        />
        <ToggleRow
          icon={Rows3}
          label="Extra line spacing"
          description="More breathing room between lines, buttons, and form controls."
          checked={settings.extraSpacing}
          onChange={() => toggle('extraSpacing')}
        />
        <ToggleRow
          icon={ScanLine}
          label="Reading guide"
          description="A subtle ruled guide behind text-heavy reading areas."
          checked={settings.readingGuide}
          onChange={() => toggle('readingGuide')}
        />

        <SectionTitle>
          <span className="inline-flex items-center gap-1.5">
            <Palette className="h-3.5 w-3.5" aria-hidden="true" /> Colour vision
          </span>
        </SectionTitle>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {COLORBLIND_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setColorblindMode(opt.id)}
              className={`relative rounded-xl border px-3 py-2.5 text-xs font-medium transition-colors ${
                settings.colorblindMode === opt.id
                  ? 'border-clay bg-clay-wash text-clay-deep'
                  : 'border-line bg-raised text-soft hover:border-faint'
              }`}
            >
              {settings.colorblindMode === opt.id && (
                <Check className="absolute right-1.5 top-1.5 h-3 w-3 text-clay" aria-hidden="true" />
              )}
              {opt.label}
            </button>
          ))}
        </div>

        <SectionTitle>
          <span className="inline-flex items-center gap-1.5">
            <Focus className="h-3.5 w-3.5" aria-hidden="true" /> Focus and motion
          </span>
        </SectionTitle>
        <ToggleRow
          icon={Eye}
          label="Focus mode"
          description="Wider line spacing and a quieter sidebar, one task at a time."
          checked={settings.adhdFocus}
          onChange={() => toggle('adhdFocus')}
        />
        <ToggleRow
          icon={Move}
          label="Reduced motion"
          description="Disables animations and transitions for motion sensitivity."
          checked={settings.reducedMotion}
          onChange={() => toggle('reducedMotion')}
        />
        <ToggleRow
          icon={RectangleHorizontal}
          label="Reduced transparency"
          description="Solid panels instead of translucent surfaces."
          checked={settings.reducedTransparency}
          onChange={() => toggle('reducedTransparency')}
        />
        <ToggleRow
          icon={MousePointer2}
          label="Large focus ring"
          description="Makes keyboard focus very obvious on every control."
          checked={settings.wideFocusRing}
          onChange={() => toggle('wideFocusRing')}
        />

        <SectionTitle>Reading layout</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          <Card className="p-3.5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-faint">Width</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {['narrow', 'normal', 'wide'].map((width) => (
                <button
                  key={width}
                  type="button"
                  onClick={() => setReadingWidth(width)}
                  className={`rounded-lg border px-2 py-2 text-xs capitalize transition-colors ${
                    settings.readingWidth === width
                      ? 'border-clay bg-clay-wash text-clay-deep'
                      : 'border-line bg-paper text-soft hover:border-faint'
                  }`}
                >
                  {width}
                </button>
              ))}
            </div>
          </Card>
          <Card className="p-3.5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-faint">Alignment</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                { id: 'left', label: 'Left', icon: AlignLeft },
                { id: 'center', label: 'Center', icon: AlignCenter },
              ].map((align) => (
                <button
                  key={align.id}
                  type="button"
                  onClick={() => setTextAlign(align.id)}
                  className={`flex items-center justify-center gap-2 rounded-lg border px-2 py-2 text-xs transition-colors ${
                    settings.textAlign === align.id
                      ? 'border-clay bg-clay-wash text-clay-deep'
                      : 'border-line bg-paper text-soft hover:border-faint'
                  }`}
                >
                  <align.icon className="h-3.5 w-3.5" aria-hidden="true" /> {align.label}
                </button>
              ))}
            </div>
          </Card>
        </div>
        <ToggleRow
          icon={Captions}
          label="Caption-friendly mode"
          description="Keeps AI text in tighter chunks for captions and screen magnifiers."
          checked={settings.captionsMode}
          onChange={() => toggle('captionsMode')}
        />
        <ToggleRow
          icon={Type}
          label="Underline links"
          description="Links are identifiable without relying on colour alone."
          checked={settings.underlineLinks}
          onChange={() => toggle('underlineLinks')}
        />

        <SectionTitle>Text to speech</SectionTitle>
        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-ink">Read aloud voice</p>
              <p className="mt-1 text-xs text-faint">
                Press <Kbd>Ctrl</Kbd> + <Kbd>Space</Kbd> anywhere to read the current page, or use
                the speaker buttons on any AI response.
              </p>
            </div>
            <Button variant={speaking ? 'danger' : 'soft'} onClick={handleTtsDemo}>
              {speaking ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              {speaking ? 'Stop' : 'Test voice'}
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-faint">Voice</span>
              <select
                value={settings.ttsVoice}
                onChange={(e) => setSettings((s) => ({ ...s, ttsVoice: e.target.value }))}
                className="mt-1.5 w-full rounded-xl border border-line bg-raised px-3 py-2.5 text-sm text-ink focus:border-clay focus:outline-none"
              >
                <option value="">System default</option>
                {voices.map((voice) => (
                  <option key={voice.name} value={voice.name}>
                    {voice.name} ({voice.lang})
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-faint">
                Speed: {Number(settings.ttsRate || 1).toFixed(2)}x
              </span>
              <input
                type="range"
                min="0.5"
                max="1.8"
                step="0.05"
                value={settings.ttsRate || 1.25}
                onChange={(e) => setSettings((s) => ({ ...s, ttsRate: Number(e.target.value) }))}
                className="mt-3 w-full accent-[rgb(193,78,43)]"
              />
            </label>
          </div>
        </Card>

        <SectionTitle>Keyboard shortcuts</SectionTitle>
        <Card>
          <ul className="space-y-2.5 text-sm text-soft">
            <li className="flex justify-between">
              <span>Read page aloud</span>
              <span><Kbd>Ctrl</Kbd> + <Kbd>Space</Kbd></span>
            </li>
            <li className="flex justify-between">
              <span>Open accessibility settings</span>
              <span><Kbd>Ctrl</Kbd> + <Kbd>Shift</Kbd> + <Kbd>A</Kbd></span>
            </li>
            <li className="flex justify-between">
              <span>Go to Overview</span>
              <span><Kbd>Ctrl</Kbd> + <Kbd>1</Kbd></span>
            </li>
            <li className="flex justify-between">
              <span>Open Study Chat</span>
              <span><Kbd>Ctrl</Kbd> + <Kbd>2</Kbd></span>
            </li>
          </ul>
        </Card>

        <Button variant="ghost" onClick={resetAccessibility}>
          <RotateCcw className="h-4 w-4" /> Reset accessibility settings
        </Button>
      </div>
    </View>
  )
}
