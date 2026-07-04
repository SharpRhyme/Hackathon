import { useState } from 'react'
import { AlertCircle, CheckCircle2, LogIn, LogOut, ShieldCheck, UserPlus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

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
        setStatus('Account created. Your study tools can now save local profile data.')
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
      <div className="mx-auto max-w-2xl space-y-5 p-6">
        <header>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-400" aria-hidden="true" />
            <h1 className="text-xl font-semibold text-zinc-100">Account</h1>
          </div>
          <p className="mt-1 text-sm text-zinc-500">Signed in profile and local storage status.</p>
        </header>

        <section className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5">
          <p className="text-xs uppercase tracking-widest text-zinc-600">Current user</p>
          <p className="mt-2 text-lg font-semibold text-zinc-100">{user.display_name}</p>
          <p className="text-sm text-zinc-500">{user.email}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-zinc-800 bg-zinc-950 p-3">
              <p className="text-xs text-zinc-500">Password storage</p>
              <p className="mt-1 text-sm text-zinc-300">Salted PBKDF2 hash on local backend</p>
            </div>
            <div className="rounded-md border border-zinc-800 bg-zinc-950 p-3">
              <p className="text-xs text-zinc-500">Session</p>
              <p className="mt-1 text-sm text-zinc-300">Signed token, expires automatically</p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="mt-5 inline-flex items-center gap-2 rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
          >
            <LogOut className="h-4 w-4" /> Log out
          </button>
        </section>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md space-y-5 p-6">
      <header>
        <div className="flex items-center gap-2">
          {mode === 'register' ? (
            <UserPlus className="h-5 w-5 text-violet-400" aria-hidden="true" />
          ) : (
            <LogIn className="h-5 w-5 text-violet-400" aria-hidden="true" />
          )}
          <h1 className="text-xl font-semibold text-zinc-100">
            {mode === 'register' ? 'Create Account' : 'Log In'}
          </h1>
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          Accounts are stored locally by the FastAPI backend.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-900/50 p-5">
        {mode === 'register' && (
          <div>
            <label htmlFor="display-name" className="block text-xs font-medium uppercase tracking-widest text-zinc-600">
              Display name
            </label>
            <input
              id="display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-200 focus:border-violet-600 focus:outline-none focus:ring-1 focus:ring-violet-600"
            />
          </div>
        )}
        <div>
          <label htmlFor="account-email" className="block text-xs font-medium uppercase tracking-widest text-zinc-600">
            Email
          </label>
          <input
            id="account-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-200 focus:border-violet-600 focus:outline-none focus:ring-1 focus:ring-violet-600"
            required
          />
        </div>
        <div>
          <label htmlFor="account-password" className="block text-xs font-medium uppercase tracking-widest text-zinc-600">
            Password
          </label>
          <input
            id="account-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            className="mt-1.5 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-200 focus:border-violet-600 focus:outline-none focus:ring-1 focus:ring-violet-600"
            required
          />
          <p className="mt-1 text-xs text-zinc-600">Use at least 8 characters with a letter and number.</p>
        </div>

        {error && (
          <div role="alert" className="flex items-start gap-2 rounded-md border border-red-900/50 bg-red-950/30 p-3 text-sm text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
          </div>
        )}
        {status && (
          <div className="flex items-start gap-2 rounded-md border border-emerald-900/50 bg-emerald-950/30 p-3 text-sm text-emerald-300">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {status}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
        >
          {mode === 'register' ? <UserPlus className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
          {loading ? 'Working...' : mode === 'register' ? 'Create account' : 'Log in'}
        </button>
      </form>

      <button
        type="button"
        onClick={() => {
          setMode((m) => (m === 'register' ? 'login' : 'register'))
          setError('')
          setStatus('')
        }}
        className="text-sm text-violet-400 hover:underline"
      >
        {mode === 'register' ? 'Already have an account? Log in.' : 'Need an account? Create one.'}
      </button>
    </div>
  )
}
