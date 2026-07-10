import { useMemo, useState } from 'react'
import { Check, Globe, Link2, Loader2, Sparkles, FileSearch, PenLine } from 'lucide-react'
import { View, Card, Button, Input, Alert } from '../components/ui'
import AIOutput, { useAIStream } from '../components/AIOutput'
import Mascot from '../components/Mascot'
import { logActivity } from '../lib/store'

const STAGES = [
  { id: 'connect', icon: Globe, title: 'Visiting the page', detail: 'Opening the site and fetching its content' },
  { id: 'read', icon: FileSearch, title: 'Reading it', detail: 'Stripping menus and ads, keeping the real text' },
  { id: 'compose', icon: PenLine, title: 'Writing your study kit', detail: 'Gemini distills it into recall questions and hooks' },
]

export default function URLStudio() {
  const [url, setUrl] = useState('')
  const [submittedUrl, setSubmittedUrl] = useState('')
  const stream = useAIStream('/api/crawl/stream')

  const stageState = useMemo(() => {
    const reached = new Set(stream.stages.map((s) => s.stage))
    const readEvent = stream.stages.find((s) => s.stage === 'read')
    const active =
      stream.status === 'thinking'
        ? reached.has('compose')
          ? 'compose'
          : reached.has('read')
            ? 'compose'
            : reached.has('connect')
              ? 'read'
              : 'connect'
        : null
    return { reached, active, readEvent }
  }, [stream.stages, stream.status])

  const working = stream.status === 'thinking' || stream.status === 'streaming'

  const domain = useMemo(() => {
    try {
      return new URL(submittedUrl).hostname
    } catch {
      return ''
    }
  }, [submittedUrl])

  const generate = (e) => {
    e.preventDefault()
    if (!url.trim() || working) return
    setSubmittedUrl(url.trim())
    logActivity('crawler', `Generated study kit from ${url.trim()}`)
    stream.run({ url: url.trim() })
  }

  return (
    <View
      icon={Link2}
      eyebrow="Agentic"
      title="URL Studio"
      description="Paste any article, wiki page, or blog post. Watch the agent open it, read it, and turn it into study material in front of you."
      actions={<Mascot pose={working ? 'scout' : 'wave'} size={4} />}
    >
      <Card>
        <form onSubmit={generate} className="flex gap-2">
          <div className="relative flex-1">
            <Link2 className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" aria-hidden="true" />
            <Input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://en.wikipedia.org/wiki/Photosynthesis"
              className="pl-10"
              required
              aria-label="Webpage URL"
            />
          </div>
          <Button type="submit" disabled={working}>
            {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Generate
          </Button>
        </form>
      </Card>

      {stream.status !== 'idle' && (
        <Card className="animate-fade-up">
          <div className="flex items-center gap-3 border-b border-line pb-4">
            {domain ? (
              <img
                src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
                alt=""
                className={`h-10 w-10 rounded-xl border border-line bg-raised p-1.5 ${working ? 'animate-float-y' : ''}`}
              />
            ) : (
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-wash text-sky">
                <Globe className="h-5 w-5" />
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">
                {stageState.readEvent?.detail || domain || 'Working...'}
              </p>
              <p className="truncate text-xs text-faint">
                {submittedUrl}
                {stageState.readEvent?.chars ? ` · ${stageState.readEvent.chars.toLocaleString()} characters read` : ''}
              </p>
            </div>
          </div>

          <ol className="mt-4 space-y-1">
            {STAGES.map((stage, index) => {
              const done =
                stream.status === 'done' ||
                stream.status === 'streaming' ||
                (stageState.reached.has(stage.id) && stageState.active !== stage.id)
              const isActive = !done && stageState.active === stage.id
              const upcoming = !done && !isActive
              return (
                <li key={stage.id} className="flex items-center gap-3 rounded-xl px-2 py-2">
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border transition-all ${
                      done
                        ? 'border-moss/40 bg-moss-wash text-moss'
                        : isActive
                          ? 'border-clay/50 bg-clay-wash text-clay'
                          : 'border-line bg-paper text-faint/60'
                    }`}
                    aria-hidden="true"
                  >
                    {done ? <Check className="h-3.5 w-3.5" /> : isActive ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <stage.icon className="h-3.5 w-3.5" />}
                  </span>
                  <div className={upcoming ? 'opacity-45' : ''}>
                    <p className={`text-sm font-medium ${isActive ? 'shimmer-text' : 'text-ink'}`}>{stage.title}</p>
                    <p className="text-xs text-faint">{stage.detail}</p>
                  </div>
                  {index < STAGES.length - 1 && <span className="sr-only">then</span>}
                </li>
              )
            })}
          </ol>
        </Card>
      )}

      {stream.status === 'error' ? (
        <Alert>{stream.error}</Alert>
      ) : (
        <AIOutput
          text={stream.text}
          status={stream.status === 'thinking' ? 'idle' : stream.status}
          error={stream.error}
          onStop={stream.stop}
        />
      )}
    </View>
  )
}
