// Documents view (spec #33)

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

export function DocumentsView() {
  const { viewParam, setView } = useApp() // viewParam = patientId (optional filter)
  const [docs, setDocs] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [patientIdForUpload, setPatientIdForUpload] = useState<string>('')

  const load = async () => {
    try {
      const url = viewParam ? `/api/documents?patientId=${viewParam}` : '/api/documents'
      const data = await api<{ documents: Doc[] }>(url)
      setDocs(data.documents)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (viewParam) setPatientIdForUpload(viewParam)
    load()
  }, [viewParam])

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!patientIdForUpload) {
      toast.error('Please select a patient first.')
      return
    }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('patientId', patientIdForUpload)
      fd.append('category', 'OTHER')
      await fetch('/api/documents', { method: 'POST', body: fd, credentials: 'same-origin' })
      toast.success('Document uploaded.')
      load()
    } catch {
      toast.error('Upload failed.')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">
          Documents {viewParam ? '(filtered)' : ''}
        </h2>
        <div className="flex gap-2">
          {!viewParam && (
            <select
              className="h-9 px-3 border rounded-md text-sm bg-background"
              value={patientIdForUpload}
              onChange={(e) => setPatientIdForUpload(e.target.value)}
            >
              <option value="">Select patient for upload...</option>
              {/* patients would be loaded — for simplicity, instruct user to upload from patient profile */}
            </select>
          )}
          <input ref={fileRef} type="file" onChange={upload} className="hidden" accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx" />
          <Button size="sm" disabled={uploading || !patientIdForUpload} onClick={() => fileRef.current?.click()}>
            <Upload className="w-4 h-4 mr-1.5" /> {uploading ? 'Uploading...' : 'Upload'}
          </Button>
        </div>
      </div>

      <Card>
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : docs.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <div>No documents yet.</div>
            {viewParam === null && <div className="text-xs mt-1">Upload documents from a patient's profile.</div>}
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
                <Badge variant="outline" className="text-xs">{d.category}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
