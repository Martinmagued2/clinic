// Inventory management view (spec #79)

'use client'

import { useEffect, useState } from 'react'
import { api, ApiError } from '@/lib/api-client'
import { useApp } from '@/lib/app-store'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Package, AlertTriangle, ArrowUp, ArrowDown } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/format'
import { toast } from 'sonner'

type Item = {
  id: string; name: string; category: string; unit: string; stockQuantity: number
  minStockLevel: number; costPrice: number; sellPrice: number; expiryDate: string | null
  status: string; supplier: { name: string } | null
}

export function InventoryView() {
  const { hasPermission } = useApp()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', category: 'GENERAL', unit: 'piece', stockQuantity: '0', minStockLevel: '0', costPrice: '0', sellPrice: '0' })

  const load = async () => {
    try { const d = await api<{ items: Item[] }>('/api/inventory'); setItems(d.items) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api('/api/inventory', { method: 'POST', body: JSON.stringify({ ...form, stockQuantity: Number(form.stockQuantity), minStockLevel: Number(form.minStockLevel), costPrice: Number(form.costPrice), sellPrice: Number(form.sellPrice) }) })
      toast.success('Item added.'); setShowForm(false); load()
    } catch (err) { toast.error(err instanceof ApiError ? err.message : 'Failed.') }
  }

  const adjust = async (id: string, type: 'IN' | 'OUT') => {
    const qty = prompt(`Enter quantity to ${type === 'IN' ? 'add' : 'remove'}:`)
    if (!qty) return
    try {
      await api(`/api/inventory/${id}`, { method: 'POST', body: JSON.stringify({ type, quantity: Number(qty) }) })
      toast.success('Stock adjusted.'); load()
    } catch (err) { toast.error(err instanceof ApiError ? err.message : 'Failed.') }
  }

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Inventory</h2>
        {hasPermission('settings.manage') && <Button onClick={() => setShowForm(!showForm)}><Plus className="w-4 h-4 mr-1.5" /> New Item</Button>}
      </div>

      {showForm && (
        <Card><form onSubmit={create} className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
          <div><Label>Category</Label><select className="w-full h-9 px-3 border rounded-md text-sm bg-background" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}><option value="MEDICATION">Medication</option><option value="SUPPLY">Supply</option><option value="CONSUMABLE">Consumable</option><option value="EQUIPMENT">Equipment</option><option value="GENERAL">General</option></select></div>
          <div><Label>Unit</Label><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></div>
          <div><Label>Stock Qty</Label><Input type="number" value={form.stockQuantity} onChange={(e) => setForm({ ...form, stockQuantity: e.target.value })} /></div>
          <div><Label>Min Level</Label><Input type="number" value={form.minStockLevel} onChange={(e) => setForm({ ...form, minStockLevel: e.target.value })} /></div>
          <div><Label>Cost Price</Label><Input type="number" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} /></div>
          <div><Label>Sell Price</Label><Input type="number" value={form.sellPrice} onChange={(e) => setForm({ ...form, sellPrice: e.target.value })} /></div>
          <Button type="submit" className="md:col-span-3">Add Item</Button>
        </form></Card>
      )}

      <Card>
        {loading ? <div className="text-center py-8 text-muted-foreground">Loading...</div> : items.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground"><Package className="w-10 h-10 mx-auto mb-2 opacity-50" />No inventory items.</div>
        ) : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground"><tr>
              <th className="text-left px-4 py-3">Name</th><th className="text-left px-4 py-3">Category</th>
              <th className="text-right px-4 py-3">Stock</th><th className="text-right px-4 py-3">Min Level</th>
              <th className="text-right px-4 py-3">Cost</th><th className="text-right px-4 py-3">Sell</th>
              <th className="text-left px-4 py-3">Expiry</th><th className="text-right px-4 py-3">Actions</th>
            </tr></thead>
            <tbody className="divide-y">
              {items.map((item) => (
                <tr key={item.id} className={item.stockQuantity <= item.minStockLevel ? 'bg-red-50' : ''}>
                  <td className="px-4 py-3 font-medium">{item.name} {item.stockQuantity <= item.minStockLevel && <AlertTriangle className="w-3 h-3 inline text-red-500 ml-1" />}</td>
                  <td className="px-4 py-3"><Badge variant="outline">{item.category}</Badge></td>
                  <td className="px-4 py-3 text-right font-mono">{item.stockQuantity} {item.unit}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{item.minStockLevel}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(item.costPrice)}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(item.sellPrice)}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{item.expiryDate ? formatDate(item.expiryDate) : '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="ghost" onClick={() => adjust(item.id, 'IN')}><ArrowUp className="w-3 h-3" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => adjust(item.id, 'OUT')}><ArrowDown className="w-3 h-3" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </Card>
    </div>
  )
}
