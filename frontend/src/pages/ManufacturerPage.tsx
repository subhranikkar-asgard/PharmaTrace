import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Plus, QrCode, Truck, Loader2, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getBatches, getMedicines, createBatch, getOrganizations, createTransfer, getBatch, deleteBatch } from '../services/api';
import { QRDisplay } from '../components/QRDisplay';
import type { BatchItem, Organization } from '../types';

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  RECALLED: 'bg-red-100 text-red-700',
};

const UNIT_STATUS_COLORS: Record<string, string> = {
  AT_PHARMACY: 'bg-teal-100 text-teal-700',
  SOLD: 'bg-slate-100 text-slate-600',
  RECALLED: 'bg-red-100 text-red-700',
  MANUFACTURED: 'bg-blue-100 text-blue-700',
  AT_DISTRIBUTOR: 'bg-purple-100 text-purple-700',
  AT_WHOLESALER: 'bg-indigo-100 text-indigo-700',
};

export function ManufacturerPage() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);
  const [expandedBatchData, setExpandedBatchData] = useState<BatchItem | null>(null);
  const [selectedQR, setSelectedQR] = useState<string | null>(null);
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);
  const [transferOrg, setTransferOrg] = useState('');
  const [transferLocation, setTransferLocation] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; batchNumber: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Create batch form state
  const [form, setForm] = useState({
    medicineId: '', batchNumber: '', quantity: 10,
    manufactureDate: '2026-01-15', expiryDate: '2027-12-31',
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'MANUFACTURER') { navigate('/login'); return; }
    Promise.all([getBatches(), getMedicines(), getOrganizations()])
      .then(([b, m, o]) => { setBatches(b); setMedicines(m); setOrgs(o.filter((o: Organization) => o.type !== 'MANUFACTURER' && o.type !== 'REGULATOR')); })
      .finally(() => setLoading(false));
  }, [isAuthenticated, user, navigate]);

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const newBatch = await createBatch(form);
      setBatches(prev => [newBatch, ...prev]);
      setShowCreate(false);
      setMsg(`✅ Batch ${form.batchNumber} created with ${form.quantity} units.`);
      setTimeout(() => setMsg(null), 4000);
    } catch (err: any) {
      setMsg('❌ ' + (err?.response?.data?.error?.message ?? 'Create failed'));
    } finally { setCreating(false); }
  };

  const handleExpandBatch = async (batchId: string) => {
    if (expandedBatch === batchId) { setExpandedBatch(null); return; }
    setExpandedBatch(batchId);
    const data = await getBatch(batchId);
    setExpandedBatchData(data);
  };

  const handleTransfer = async () => {
    if (!selectedUnits.length || !transferOrg || !transferLocation) return;
    setTransferring(true);
    try {
      const org = orgs.find(o => o.id === transferOrg);
      await createTransfer({ unitIds: selectedUnits, toOrganizationId: transferOrg, location: transferLocation, lat: 28.6139, lng: 77.2090 });
      setMsg(`✅ ${selectedUnits.length} unit(s) transferred to ${org?.name}.`);
      setSelectedUnits([]);
      const data = await getBatch(expandedBatch!);
      setExpandedBatchData(data);
      setTimeout(() => setMsg(null), 4000);
    } catch (err: any) {
      setMsg('❌ ' + (err?.response?.data?.error?.message ?? 'Transfer failed'));
    } finally { setTransferring(false); }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      const result = await deleteBatch(deleteConfirm.id);
      setBatches(prev => prev.filter(b => b.id !== deleteConfirm.id));
      if (expandedBatch === deleteConfirm.id) setExpandedBatch(null);
      setMsg(`✅ Batch ${deleteConfirm.batchNumber} deleted (${result.unitsDeleted} units removed).`);
      setDeleteConfirm(null);
      setTimeout(() => setMsg(null), 5000);
    } catch (err: any) {
      setMsg('❌ ' + (err?.response?.data?.error?.message ?? 'Delete failed'));
      setDeleteConfirm(null);
    } finally { setDeleting(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manufacturer Dashboard</h1>
          <p className="text-slate-500 text-sm">{user?.orgName} · {batches.length} batches</p>
        </div>
        <button
          onClick={() => setShowCreate(s => !s)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> New Batch
        </button>
      </div>

      {msg && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${msg.startsWith('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {msg}
        </div>
      )}

      {/* Create Batch Form */}
      {showCreate && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
          <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" /> Create New Batch
          </h2>
          <form onSubmit={handleCreateBatch} className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-600 block mb-1">Medicine</label>
              <select value={form.medicineId} onChange={e => setForm(f => ({ ...f, medicineId: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" required>
                <option value="">Select medicine…</option>
                {medicines.map((m: any) => (
                  <option key={m.id} value={m.id}>{m.name} {m.strength} {m.form}</option>
                ))}
              </select>
            </div>
            {[
              { label: 'Batch Number', key: 'batchNumber', type: 'text', placeholder: 'B2026-003' },
              { label: 'Quantity', key: 'quantity', type: 'number', placeholder: '100' },
              { label: 'Manufacture Date', key: 'manufactureDate', type: 'date', placeholder: '' },
              { label: 'Expiry Date', key: 'expiryDate', type: 'date', placeholder: '' },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key}>
                <label className="text-xs font-semibold text-slate-600 block mb-1">{label}</label>
                <input type={type} placeholder={placeholder}
                  value={String((form as any)[key])}
                  onChange={e => setForm(f => ({ ...f, [key]: type === 'number' ? parseInt(e.target.value) : e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" required />
              </div>
            ))}
            <div className="col-span-2 flex gap-3 pt-2">
              <button type="submit" disabled={creating}
                className="bg-blue-600 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                {creating && <Loader2 className="w-4 h-4 animate-spin" />} Create Batch
              </button>
              <button type="button" onClick={() => setShowCreate(false)}
                className="px-5 py-2 rounded-xl text-sm text-slate-600 border border-slate-200 hover:bg-slate-50">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* QR Modal */}
      {selectedQR && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedQR(null)}>
          <div className="bg-white rounded-2xl p-8 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-slate-900 mb-4 text-center">QR Code</h3>
            <QRDisplay value={selectedQR} size={220} />
            <button onClick={() => setSelectedQR(null)}
              className="mt-4 w-full py-2 text-sm text-slate-500 hover:text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50">
              Close
            </button>
          </div>
        </div>
      )}

      {/* Batch list */}
      <div className="space-y-4">
        {batches.length === 0 && (
          <div className="text-center py-12 text-slate-400 bg-white rounded-2xl border border-slate-200">
            <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>No batches yet. Create one above.</p>
          </div>
        )}
        {batches.map(batch => (
          <div key={batch.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Batch header */}
            <div className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-50"
              onClick={() => handleExpandBatch(batch.id)}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                  <Package className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-bold text-slate-900">{batch.batchNumber}</p>
                  <p className="text-sm text-slate-500">{batch.medicine?.name} {batch.medicine?.strength} · {batch._count?.units ?? batch.quantity} units</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[batch.status] ?? 'bg-slate-100 text-slate-600'}`}>
                  {batch.status}
                </span>
                <span className="text-xs text-slate-400">
                  Exp: {new Date(batch.expiryDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                </span>
                {batch.status !== 'RECALLED' && (
                  <button
                    onClick={e => { e.stopPropagation(); setDeleteConfirm({ id: batch.id, batchNumber: batch.batchNumber }); }}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete batch"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                {expandedBatch === batch.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </div>
            </div>

            {/* Expanded units */}
            {expandedBatch === batch.id && expandedBatchData && (
              <div className="border-t border-slate-100 px-6 py-4 bg-slate-50">
                {/* Transfer form */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
                  <p className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <Truck className="w-4 h-4 text-blue-500" /> Transfer Selected Units
                  </p>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <select value={transferOrg} onChange={e => setTransferOrg(e.target.value)}
                      className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
                      <option value="">To organization…</option>
                      {orgs.map(o => <option key={o.id} value={o.id}>{o.name} ({o.type})</option>)}
                    </select>
                    <input placeholder="Location (e.g. Delhi)" value={transferLocation}
                      onChange={e => setTransferLocation(e.target.value)}
                      className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <button onClick={handleTransfer} disabled={!selectedUnits.length || !transferOrg || !transferLocation || transferring}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 flex items-center gap-2">
                    {transferring && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Transfer {selectedUnits.length > 0 ? `${selectedUnits.length} units` : 'units'}
                  </button>
                </div>

                {/* Unit table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-slate-500 uppercase tracking-wide">
                        <th className="text-left pb-2 pr-4">
                          <input type="checkbox"
                            onChange={e => setSelectedUnits(e.target.checked ? (expandedBatchData.units ?? []).map(u => u.unitId) : [])}
                            checked={selectedUnits.length === (expandedBatchData.units?.length ?? 0)}
                          />
                        </th>
                        <th className="text-left pb-2 pr-4">Unit ID</th>
                        <th className="text-left pb-2 pr-4">Status</th>
                        <th className="text-left pb-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(expandedBatchData.units ?? []).map(unit => (
                        <tr key={unit.id} className="hover:bg-white">
                          <td className="py-2 pr-4">
                            <input type="checkbox"
                              checked={selectedUnits.includes(unit.unitId)}
                              onChange={e => setSelectedUnits(prev =>
                                e.target.checked ? [...prev, unit.unitId] : prev.filter(id => id !== unit.unitId)
                              )}
                            />
                          </td>
                          <td className="py-2 pr-4 font-mono text-xs text-slate-700">{unit.unitId}</td>
                          <td className="py-2 pr-4">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${UNIT_STATUS_COLORS[unit.status] ?? 'bg-slate-100 text-slate-600'}`}>
                              {unit.status}
                            </span>
                          </td>
                          <td className="py-2">
                            <button
                              onClick={() => setSelectedQR(`${import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:5173'}/verify/${unit.unitId}`)}
                              className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-xs"
                            >
                              <QrCode className="w-3.5 h-3.5" /> QR
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Delete Batch?</h3>
                <p className="text-sm text-slate-500">This cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-slate-700 mb-6">
              Batch <span className="font-mono font-semibold">{deleteConfirm.batchNumber}</span> and all its units will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                className="flex-1 border border-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
