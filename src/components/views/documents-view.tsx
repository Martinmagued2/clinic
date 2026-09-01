// Documents view (spec #33) — list + upload with patient selector

'use client'

import { useEffect, useState, useRef } from 'react'
import { api } from '@/lib/api-client'
import { useApp } from '@/lib/app-store'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, Upload, FolderOpen } from 'lucide-react'
import { formatDate } from '@/lib/format'
import { toast } from 'sonner'

type Doc = {
  id: string
  fileName: string
  fileType: string
  fileSize: number
  category: string
  description: string | null
  createdAt: string
  patient: { id: string; firstName: string; lastName: string; patientCode: string }
  uploadedBy: { name: string }
}

type Patient = { id: string; firstName: string; lastName: string; patientCode: string }

export function DocumentsView() {
  const { viewParam } = useApp() // viewParam = patientId (optional filter)
  const [docs, setDocs] = useState<Doc[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [filterPatientId, setFilterPatientId] = useState(viewParam || '')
  const [uploadPatientId, setUploadPatientId] = useState(viewParam || '')
  const [category, setCategory] = useState('OTHER')
  const fileRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    try {
      const url = filterPatientId ? `/api/documents?patientId=${filterPatientId}` : '/api/documents'
      const data = await api<{ documents: Doc[] }>(url)
      setDocs(data.documents)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    api<{ patients: Patient[] }>('/api/patients?pageSize=200').then((d) => setPatients(d.patients)).catch(() => {})
  }, [])

  useEffect(() => {
    setFilterPatientId(viewParam || '')
    setUploadPatientId(viewParam || '')
    load()
  }, [viewParam, filterPatientId])

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!uploadPatientId) {
      toast.error('Please select a patient first.')
      return
    }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('patientId', uploadPatientId)
      fd.append('category', category)
      const res = await fetch('/api/documents', { method: 'POST', body: fd, credentials: 'same-origin' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error?.message || 'Upload failed')
      }
      toast.success('Document uploaded.')
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <h2 className="text-lg font-semibold">Documents {viewParam ? '(filtered)' : ''}</h2>

      <Card>
        <div className="p-3 border-b flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-muted-foreground block mb-1">Filter by patient</label>
            <select
              className="w-full h-9 px-3 border rounded-md text-sm bg-background"
              value={filterPatientId}
              onChange={(e) => setFilterPatientId(e.target.value)}
            >
              <option value="">All patients</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.firstName} {p.lastName} ({p.patientCode})</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-muted-foreground block mb-1">Upload to patient</label>
            <select
              className="w-full h-9 px-3 border rounded-md text-sm bg-background"
              value={uploadPatientId}
              onChange={(e) => setUploadPatientId(e.target.value)}
            >
              <option value="">Select patient...</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.firstName} {p.lastName} ({p.patientCode})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Category</label>
            <select
              className="h-9 px-3 border rounded-md text-sm bg-background"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="OTHER">Other</option>
              <option value="MEDICAL_REPORT">Medical Report</option>
              <option value="LAB_RESULT">Lab Result</option>
              <option value="XRAY">X-Ray</option>
              <option value="SCAN">Scan</option>
            </select>
          </div>
          <div>
            <input ref={fileRef} type="file" onChange={upload} className="hidden" accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx" />
            <Button size="sm" disabled={uploading || !uploadPatientId} onClick={() => fileRef.current?.click()}>
              <Upload className="w-4 h-4 mr-1.5" /> {uploading ? 'Uploading...' : 'Upload'}
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : docs.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <div>No documents yet.</div>
          </div>
        ) : (
          <div className="divide-y">
            {docs.map((d) => (
              <div key={d.id} className="p-3 flex items-center gap-3">
                <FileText className="w-5 h-5 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <a
                    href={`/api/documents/${d.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium hover:underline truncate block"
                  >
                    {d.fileName}
                  </a>
                  <div className="text-xs text-muted-foreground">
                    {d.patient.firstName} {d.patient.lastName} ({d.patient.patientCode}) · {formatDate(d.createdAt)} · {d.uploadedBy.name}
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">{d.category.replace(/_/g, ' ')}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
