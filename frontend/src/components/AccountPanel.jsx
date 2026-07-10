import { useState } from 'react'
import { CheckCircle2, LogIn, LogOut, ShieldCheck, UserPlus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { View, Card, Button, Field, Input, Alert } from './ui'

export default function AccountPanel() {
  const { user, isAuthenticated, login, register, logout } = useAuth()
  const [mode, setMode] = useState('login')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setStatus('')
    try {
      if (mode === 'register') {
        await register(email, password, displayName)
        setStatus('Account created. Welcome in.')
      } else {
        await login(email, password)
        setStatus('Signed in.')
      }
      setPassword('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (isAuthenticated) {
    return (
      <View
        icon={ShieldCheck}
        eyebrow="Signed in"
        title="Account"
        description="Your profile and how your data is protected."
      >
        <Card>
          <div className="flex items-center gap-4">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-clay to-gold font-display text-2xl font-semibold text-white">
              {user.display_name[0]?.toUpperCase()}
            </span>
            <div>
              <p className="font-display text-xl font-semibold text-ink">{user.display_name}</p>
              <p className="text-sm text-faint">{user.email}</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-line bg-paper p-3.5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-faint">Password storage</p>
              <p className="mt-1 text-sm text-soft">Salted PBKDF2 hash on the local backend</p>
            </div>
            <div className="rounded-xl border border-line bg-paper p-3.5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-faint">Session</p>
              <p className="mt-1 text-sm text-soft">Signed token, expires automatically</p>
            </div>
          </div>
          <Button variant="ghost" className="mt-5" onClick={logout}>
            <LogOut className="h-4 w-4" /> Log out
          </Button>
        </Card>
      </View>
    )
  }

  return (
    <View
      icon={mode === 'register' ? UserPlus : LogIn}
      eyebrow="Welcome"
      title={mode === 'register' ? 'Create account' : 'Log in'}
      description="Accounts live on your local backend, nothing leaves your machine except AI requests."
    >
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <Field label="Display name">
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </Field>
          )}
          <Field label="Email">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Field label="Password" hint="8+ characters with a letter and a number">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </Field>

          {error && <Alert>{error}</Alert>}
          {status && (
            <p className="flex items-center gap-2 rounded-xl bg-moss-wash p-3 text-sm text-moss">
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" /> {status}
            </p>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {mode === 'register' ? <UserPlus className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
            {loading ? 'Working...' : mode === 'register' ? 'Create account' : 'Log in'}
          </Button>
        </form>
      </Card>

      <button
        type="button"
        onClick={() => {
          setMode((m) => (m === 'register' ? 'login' : 'register'))
          setError('')
          setStatus('')
        }}
        className="text-sm font-medium text-clay hover:underline"
      >
        {mode === 'register' ? 'Already have an account? Log in.' : 'Need an account? Create one.'}
      </button>
    </View>
  )
}
