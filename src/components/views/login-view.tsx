// Login screen

'use client'

import { useState } from 'react'
import { api, ApiError } from '@/lib/api-client'
import { useApp } from '@/lib/app-store'
import { HeartPulse, Loader2 } from 'lucide-react'

export function LoginView() {
  const { setUser } = useApp()
  const [email, setEmail] = useState('admin@clinic.test')
  const [password, setPassword] = useState('admin123')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showForgot, setShowForgot] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const data = await api<{ user: { id: string; email: string; name: string; role: string; clinicId: string | null; branchId: string | null; doctorId: string | null } }>(
        '/api/auth',
        { method: 'POST', body: JSON.stringify({ email, password }) },
      )
      setUser(data.user)
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Login failed.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4">
            <HeartPulse className="w-9 h-9 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Clinic Command Center</h1>
          <p className="text-muted-foreground mt-1">Sign in to your clinic workspace</p>
        </div>

        <form onSubmit={onSubmit} className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground py-2 rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Sign In
          </button>
          <div className="text-right">
            <button
              type="button"
              onClick={() => setShowForgot(!showForgot)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Forgot password?
            </button>
          </div>
        </form>

        {showForgot && (
          <ForgotPasswordForm onClose={() => setShowForgot(false)} />
        )}

        <div className="mt-6 text-xs text-muted-foreground bg-muted/50 rounded-md p-4">
          <div className="font-medium mb-1">Demo accounts (dev seed):</div>
          <div>Admin: admin@clinic.test / admin123</div>
          <div>Doctor: ahmed@clinic.test / doctor123</div>
          <div>Reception: reception1@clinic.test / reception123</div>
          <div>Nurse: nurse1@clinic.test / nurse123</div>
          <div className="mt-1 pt-1 border-t border-muted">
            <div className="font-medium">Patient Portal:</div>
            <div>ahmed.ali@patient.portal / patient123</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ForgotPasswordForm({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const requestReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const data = await api<{ token?: string; message: string }>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })
      setMessage(data.message)
      if (data.token) setToken(data.token)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed.')
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await api('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password: newPassword }),
      })
      setMessage('Password reset successfully! You can now log in.')
      setToken(null)
      setNewPassword('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-4 bg-card border rounded-xl p-4 shadow-sm">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-medium">Reset Password</h3>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">Close</button>
      </div>
      {!token && (
        <form onSubmit={requestReset} className="space-y-2">
          <input
            type="email"
            placeholder="Your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border rounded-md bg-background text-sm"
          />
          <button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground py-2 rounded-md text-sm">
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
      )}
      {token && (
        <form onSubmit={resetPassword} className="space-y-2">
          <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
            Dev token: <code className="text-xs break-all">{token}</code>
          </div>
          <input
            type="password"
            placeholder="New password (min 8 chars)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
            className="w-full px-3 py-2 border rounded-md bg-background text-sm"
          />
          <button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground py-2 rounded-md text-sm">
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      )}
      {message && <div className="text-xs text-green-600 mt-2">{message}</div>}
      {error && <div className="text-xs text-destructive mt-2">{error}</div>}
    </div>
  )
}
