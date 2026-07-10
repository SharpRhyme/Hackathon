import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

// Shared UI kit. Every view builds from these pieces so the app feels like one product.

export function View({ icon: Icon, eyebrow, title, description, actions, children, wide = false }) {
  return (
    <div className={`view-shell mx-auto w-full space-y-7 px-7 py-9 ${wide ? 'max-w-7xl' : 'max-w-4xl'}`}>
      <header className="flex flex-wrap items-end justify-between gap-5 animate-fade-up">
        <div className="min-w-0">
          {eyebrow && (
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-clay">{eyebrow}</p>
          )}
          <div className="flex items-center gap-3">
            {Icon && (
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px] bg-clay-wash text-clay">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
            )}
            <h1 className="font-display text-[1.95rem] font-semibold leading-tight text-ink text-balance">
              {title}
            </h1>
          </div>
          {description && <p className="mt-2.5 max-w-2xl text-[15px] leading-relaxed text-faint">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </header>
      {children}
    </div>
  )
}

export function Card({ className = '', children, ...props }) {
  return (
    <section
      {...props}
      className={`rounded-card border border-line bg-raised p-6 shadow-card ${className}`}
    >
      {children}
    </section>
  )
}

const BUTTON_STYLES = {
  primary: 'bg-clay text-white hover:bg-clay-deep active:bg-clay-deep',
  soft: 'bg-clay-wash text-clay-deep hover:bg-clay/15',
  ghost: 'bg-sunken text-ink hover:bg-line/80',
  danger: 'bg-[rgb(178,42,42)] text-white hover:bg-[rgb(148,30,30)]',
  success: 'bg-moss text-white hover:brightness-105',
  quiet: 'text-faint hover:bg-sunken hover:text-ink',
}

export function Button({ variant = 'primary', size = 'md', className = '', children, ...props }) {
  const sizing =
    size === 'sm' ? 'px-3 py-1.5 text-xs rounded-lg gap-1.5' : size === 'lg' ? 'px-6 py-3 text-[15px] rounded-xl gap-2.5' : 'px-4 py-2.5 text-[13px] rounded-xl gap-2'
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center justify-center font-medium tracking-[-0.01em] transition-[background-color,transform] duration-100 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45 ${sizing} ${BUTTON_STYLES[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

export function IconButton({ label, className = '', children, ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...props}
      className={`grid h-8 w-8 place-items-center rounded-lg bg-sunken text-soft transition-colors hover:bg-line/80 hover:text-ink active:scale-[0.96] disabled:opacity-45 ${className}`}
    >
      {children}
    </button>
  )
}

export function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-faint">{label}</span>
      {hint && <span className="ml-2 text-xs normal-case tracking-normal text-faint/70">{hint}</span>}
      <div className="mt-1.5">{children}</div>
    </label>
  )
}

export function Input(props) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg border border-line bg-raised px-3.5 py-2 text-[13px] text-ink placeholder:text-faint/70 transition-[border-color,box-shadow] focus:border-clay focus:shadow-[0_0_0_3px_rgb(var(--c-clay)/0.18)] focus:outline-none ${props.className || ''}`}
    />
  )
}

export function TextArea(props) {
  return (
    <textarea
      {...props}
      className={`w-full resize-y rounded-lg border border-line bg-raised px-3.5 py-2.5 text-[13px] leading-relaxed text-ink placeholder:text-faint/70 transition-[border-color,box-shadow] focus:border-clay focus:shadow-[0_0_0_3px_rgb(var(--c-clay)/0.18)] focus:outline-none ${props.className || ''}`}
    />
  )
}

export function Chip({ active = false, className = '', children, ...props }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      {...props}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
        active
          ? 'border-clay bg-clay-wash text-clay-deep'
          : 'border-line bg-raised text-faint hover:border-faint hover:text-ink'
      } ${className}`}
    >
      {children}
    </button>
  )
}

export function Segmented({ value, onChange, options, label }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-xl border border-line bg-sunken p-1">
      {options.map((option) => {
        const selected = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all ${
              selected ? 'bg-raised text-ink shadow-card' : 'text-faint hover:text-ink'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export function Modal({ open, onClose, title, children, wide = false }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    ref.current?.querySelector('input, textarea, button')?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`w-full ${wide ? 'max-w-2xl' : 'max-w-md'} animate-pop-in rounded-card border border-line bg-raised p-6 shadow-lift`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
          <IconButton label="Close" onClick={onClose}>
            <X className="h-4 w-4" />
          </IconButton>
        </div>
        {children}
      </div>
    </div>
  )
}

export function EmptyState({ icon: Icon, title, hint, children }) {
  return (
    <div className="grid place-items-center rounded-card border border-dashed border-line bg-raised/60 px-6 py-12 text-center">
      {Icon && (
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-sunken text-faint">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </span>
      )}
      <p className="mt-3 font-medium text-ink">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-sm text-faint">{hint}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  )
}

export function StatTile({ label, value, sub, tone = 'clay' }) {
  const tones = {
    clay: 'bg-clay-wash text-clay-deep',
    moss: 'bg-moss-wash text-moss',
    sky: 'bg-sky-wash text-sky',
    gold: 'bg-gold-wash text-gold',
    berry: 'bg-berry-wash text-berry',
  }
  return (
    <div className="rounded-card border border-line bg-raised p-4 shadow-card">
      <p className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${tones[tone]}`}>
        {label}
      </p>
      <p className="mt-2 font-display text-3xl font-semibold text-ink">{value}</p>
      {sub && <p className="mt-1 text-xs text-faint">{sub}</p>}
    </div>
  )
}

// Circular progress ring used by timers and progress meters.
export function ProgressRing({ size = 220, stroke = 12, progress = 0, color = 'rgb(var(--c-clay))', track = 'rgb(var(--c-sunken))', children }) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - Math.min(Math.max(progress, 0), 1))
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.3s ease' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  )
}

export function Alert({ tone = 'error', children }) {
  const tones = {
    error: 'border-[rgb(178,42,42)]/30 bg-[rgb(178,42,42)]/8 text-[rgb(148,30,30)]',
    info: 'border-sky/30 bg-sky-wash text-sky',
    warn: 'border-gold/40 bg-gold-wash text-gold',
  }
  return (
    <div role="alert" className={`rounded-xl border p-3.5 text-sm ${tones[tone]}`}>
      {children}
    </div>
  )
}

export function Kbd({ children }) {
  return (
    <kbd className="rounded-md border border-line bg-sunken px-1.5 py-0.5 font-sans text-[10px] font-semibold text-soft">
      {children}
    </kbd>
  )
}
