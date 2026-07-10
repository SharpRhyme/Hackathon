import { useState } from 'react'
import { Route, Sparkles } from 'lucide-react'
import { View, Card, Button, Field, Input, TextArea, Segmented } from '../components/ui'
import AIOutput, { useAIStream } from '../components/AIOutput'
import Mascot from '../components/Mascot'
import { logActivity } from '../lib/store'
import { useAccessibility } from '../context/AccessibilityContext'

export default function Paths() {
  const [goal, setGoal] = useState('')
  const [days, setDays] = useState('7')
  const [level, setLevel] = useState('mixed')
  const [struggles, setStruggles] = useState('')
  const { settings } = useAccessibility()
  const stream = useAIStream('/api/ai/stream')

  const generate = (e) => {
    e.preventDefault()
    if (!goal.trim()) return
    logActivity('paths', `Generated path: ${goal.trim().slice(0, 60)}`)
    stream.run({
      tool: 'adaptive',
      prompt: `GOAL: ${goal.trim()}\nDAYS AVAILABLE: ${days}\nCONFIDENCE LEVEL: ${level}\nKNOWN STRUGGLES: ${struggles.trim() || 'not specified'}`,
      profile: settings,
    })
  }

  return (
    <View
      icon={Route}
      eyebrow="Plan"
      title="Adaptive Paths"
      description="Tell it the goal and the deadline. Get a step-by-step route with a diagnostic, time estimates, and difficulty levels."
      actions={<Mascot pose="think" size={4} />}
    >
      <Card>
        <form onSubmit={generate} className="space-y-4">
          <Field label="What do you need to learn?">
            <Input
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. Quadratic graphs for a test"
              required
            />
          </Field>
          <div className="flex flex-wrap items-end gap-6">
            <Field label="Days until you need it">
              <Input
                type="number"
                min="1"
                max="90"
                value={days}
                onChange={(e) => setDays(e.target.value)}
                className="w-28"
              />
            </Field>
            <Field label="Where are you now?">
              <Segmented
                label="Confidence level"
                value={level}
                onChange={setLevel}
                options={[
                  { value: 'beginner', label: 'New to it' },
                  { value: 'mixed', label: 'Patchy' },
                  { value: 'revising', label: 'Revising' },
                ]}
              />
            </Field>
          </div>
          <Field label="Anything you keep getting wrong?" hint="optional">
            <TextArea rows={2} value={struggles} onChange={(e) => setStruggles(e.target.value)} placeholder="e.g. I mix up factorising and expanding" />
          </Field>
          <Button type="submit" disabled={stream.status === 'thinking' || stream.status === 'streaming'}>
            <Sparkles className="h-4 w-4" /> Build my path
          </Button>
        </form>
      </Card>

      <AIOutput
        text={stream.text}
        status={stream.status}
        error={stream.error}
        onStop={stream.stop}
        thinkingLabel="Mapping your route"
      />
    </View>
  )
}
