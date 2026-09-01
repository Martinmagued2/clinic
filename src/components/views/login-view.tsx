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
        </form>

        <div className="mt-6 text-xs text-muted-foreground bg-muted/50 rounded-md p-4">
          <div className="font-medium mb-1">Demo accounts (dev seed):</div>
          <div>Admin: admin@clinic.test / admin123</div>
          <div>Doctor: ahmed@clinic.test / doctor123</div>
          <div>Reception: reception1@clinic.test / reception123</div>
          <div>Nurse: nurse1@clinic.test / nurse123</div>
        </div>
      </div>
    </div>
  )
}
