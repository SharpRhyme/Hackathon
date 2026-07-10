import { useState } from 'react'
import { BookmarkPlus, FileText, Sparkles, Trash2 } from 'lucide-react'
import { View, Card, Button, Field, Input, TextArea, Chip, EmptyState, IconButton } from '../components/ui'
import AIOutput, { useAIStream, Markdown } from '../components/AIOutput'
import Mascot from '../components/Mascot'
import { useStoredState, logActivity } from '../lib/store'
import { useAccessibility } from '../context/AccessibilityContext'

const SUBJECT_PRESETS = ['English Literature', 'History', 'Biology', 'Chemistry', 'Physics', 'Economics', 'Geography']
const LEVEL_PRESETS = ['Year 10', 'Year 11', 'Year 12', 'GCSE', 'A Level', 'VCE', 'HSC', 'IB']

export default function Exemplars() {
  const [subject, setSubject] = useState('English Literature')
  const [level, setLevel] = useState('Year 12')
  const [question, setQuestion] = useState('')
  const [focus, setFocus] = useState('')
  const [library, setLibrary] = useStoredState('ld.exemplars', [])
  const [openSaved, setOpenSaved] = useState(null)
  const { settings } = useAccessibility()
  const stream = useAIStream('/api/exemplar/stream')

  const generate = (e) => {
    e.preventDefault()
    if (!question.trim()) return
    setOpenSaved(null)
    logActivity('exemplar', `Generated exemplar: ${question.trim().slice(0, 60)}`)
    stream.run({ subject, level, question, focus, profile: settings })
  }

  const saveCurrent = () => {
    setLibrary((prev) => [
      { id: Date.now(), subject, level, question: question.trim(), text: stream.text },
      ...prev,
    ])
  }

  return (
    <View
      icon={FileText}
      eyebrow="Model answers"
      title="Exemplar Essays"
      description="Generate a model answer for any question, at your level, with every technique annotated so you can steal the craft."
      wide
      actions={<Mascot pose="type" size={4} />}
    >
      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <Card>
            <form onSubmit={generate} className="space-y-4">
              <Field label="Subject">
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Any subject" />
              </Field>
              <div className="flex flex-wrap gap-1.5">
                {SUBJECT_PRESETS.map((s) => (
                  <Chip key={s} active={subject === s} onClick={() => setSubject(s)}>
                    {s}
                  </Chip>
                ))}
              </div>
              <Field label="Level or exam board">
                <Input value={level} onChange={(e) => setLevel(e.target.value)} placeholder="e.g. Year 12, A Level" />
              </Field>
              <div className="flex flex-wrap gap-1.5">
                {LEVEL_PRESETS.map((l) => (
                  <Chip key={l} active={level === l} onClick={() => setLevel(l)}>
                    {l}
                  </Chip>
                ))}
              </div>
              <Field label="Essay question or task">
                <TextArea
                  rows={3}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder='e.g. "How does Shakespeare present ambition in Macbeth?"'
                  required
                />
              </Field>
              <Field label="Focus" hint="optional">
                <Input
                  value={focus}
                  onChange={(e) => setFocus(e.target.value)}
                  placeholder="e.g. topic sentences, embedding quotes, analysis depth"
                />
              </Field>
              <Button type="submit" disabled={stream.status === 'thinking' || stream.status === 'streaming'}>
                <Sparkles className="h-4 w-4" /> Write the exemplar
              </Button>
            </form>
          </Card>

          <AIOutput
            text={stream.text}
            status={stream.status}
            error={stream.error}
            onStop={stream.stop}
            thinkingLabel="Drafting a model answer"
          />
          {stream.status === 'done' && stream.text && (
            <Button variant="soft" size="sm" className="mt-3" onClick={saveCurrent}>
              <BookmarkPlus className="h-3.5 w-3.5" /> Save to my library
            </Button>
          )}
        </div>

        <div className="space-y-3">
          <h2 className="font-display text-lg font-semibold text-ink">Saved exemplars</h2>
          {library.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Nothing saved yet"
              hint="Generate an exemplar and save the ones worth keeping."
            />
          ) : (
            <ul className="space-y-2">
              {library.map((item) => (
                <li key={item.id}>
                  <div className="group flex items-center gap-2 rounded-card border border-line bg-raised p-3.5 shadow-card transition-shadow hover:shadow-lift">
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => setOpenSaved(openSaved === item.id ? null : item.id)}
                    >
                      <p className="truncate text-sm font-medium text-ink">{item.question}</p>
                      <p className="mt-0.5 text-xs text-faint">
                        {item.subject} · {item.level}
                      </p>
                    </button>
                    <IconButton
                      label="Delete exemplar"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 hover:text-[rgb(148,30,30)]"
                      onClick={() => setLibrary((prev) => prev.filter((x) => x.id !== item.id))}
                    >
                      <Trash2 className="h-3 w-3" />
                    </IconButton>
                  </div>
                  {openSaved === item.id && (
                    <article className="mt-2 animate-fade-up rounded-card border border-line bg-raised p-4 shadow-card">
                      <Markdown>{item.text}</Markdown>
                    </article>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </View>
  )
}
