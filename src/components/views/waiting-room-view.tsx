// Waiting room display — public "Now Serving" screen (spec #18)

'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api-client'
import { useApp } from '@/lib/app-store'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type Data = {
  clinic: { name: string; code: string | null }
  nowServing: Array<{ queueNumber: number; doctorName: string; specialty: string; roomName: string | null }>
  waiting: Array<{ queueNumber: number }>
}

export function WaitingRoomView() {
  const { user } = useApp()
  const [data, setData] = useState<Data | null>(null)
  const [clinicId, setClinicId] = useState(user?.clinicId || '')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    if (!clinicId) return
    try {
      const d = await api<Data>(`/api/waiting-room?clinicId=${clinicId}`)
      setData(d)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 5000) // refresh every 5s
    return () => clearInterval(id)
  }, [clinicId])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">{data?.clinic.name || 'Clinic'}</h1>
            <p className="text-slate-400">Now Serving</p>
          </div>
          {!user && (
            <select
              className="bg-slate-800 text-white px-3 py-2 rounded border border-slate-700"
              value={clinicId}
              onChange={(e) => setClinicId(e.target.value)}
            >
              <option value="">Select clinic...</option>
            </select>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <h2 className="text-xl font-semibold mb-4 text-slate-300">Now Serving</h2>
            {loading ? (
              <div className="text-slate-400">Loading...</div>
            ) : !data || data.nowServing.length === 0 ? (
              <Card className="bg-slate-800/50 border-slate-700">
                <div className="p-12 text-center text-slate-400">
                  No patients currently in consultation.
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.nowServing.map((s, i) => (
                  <Card key={i} className="bg-slate-800/80 border-slate-700">
                    <div className="p-6">
                      <div className="text-6xl font-bold text-cyan-400 mb-2">
                        #{String(s.queueNumber).padStart(3, '0')}
                      </div>
                      <div className="text-lg font-medium">{s.doctorName}</div>
                      <div className="text-sm text-slate-400">{s.specialty}</div>
                      {s.roomName && (
                        <div className="mt-3 inline-block bg-cyan-500/20 text-cyan-300 px-3 py-1 rounded-full text-sm">
                          Please proceed to {s.roomName}
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4 text-slate-300">Up Next</h2>
            {!data || data.waiting.length === 0 ? (
              <Card className="bg-slate-800/50 border-slate-700">
                <div className="p-8 text-center text-slate-400">Queue is empty.</div>
              </Card>
            ) : (
              <Card className="bg-slate-800/80 border-slate-700">
                <div className="p-4 space-y-2">
                  {data.waiting.map((w, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-slate-700/50 rounded">
                      <span className="text-slate-400 text-sm">Waiting</span>
                      <span className="text-2xl font-bold text-slate-200">#{String(w.queueNumber).padStart(3, '0')}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
