import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, AlertTriangle, RefreshCw, Loader2, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getStats, getAlerts, getRecalls, recallBatch, resolveAlert, getBatches } from '../services/api';
import { AlertCard } from '../components/AlertCard';
import type { AlertItem, StatsResponse, RecallItem, BatchItem } from '../types';

export function RegulatorPage() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [recalls, setRecalls] = useState<RecallItem[]>([]);
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Recall modal state
  const [recallModal, setRecallModal] = useState<{ batchNumber: string } | null>(null);
  const [recallReason, setRecallReason] = useState('');
  const [recalling, setRecalling] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'REGULATOR') { navigate('/login'); return; }
    loadAll().finally(() => setLoading(false));
  }, [isAuthenticated, user, navigate]);

  const loadAll = useCallback(async () => {
    const [s, a, r, b] = await Promise.all([getStats(), getAlerts(), getRecalls(), getBatches()]);
    setStats(s); setAlerts(a); setRecalls(r); setBatches(b);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAll().finally(() => setRefreshing(false));
  };

  const handleRecallOpen = (batchNumber: string) => {
    setRecallModal({ batchNumber });
    setRecallReason('');
  };

  const handleRecallConfirm = async () => {
    if (!recallModal || !recallReason.trim()) return;
    setRecalling(true);
    const batch = batches.find(b => b.batchNumber === recallModal.batchNumber);
    if (!batch) { setMsg('❌ Batch not found.'); setRecalling(false); return; }
    try {
      await recallBatch(batch.id, recallReason);
      setMsg(`✅ Batch ${recallModal.batchNumber} recalled. All units flagged.`);
      setRecallModal(null);
      await loadAll();
      setTimeout(() => setMsg(null), 6000);
    } catch (err: any) {
      setMsg('❌ ' + (err?.response?.data?.error?.message ?? 'Recall failed'));
    } finally { setRecalling(false); }
  };

  const handleResolve = async (alertId: string) => {
    await resolveAlert(alertId);
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, resolvedAt: new Date().toISOString() } : a));
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
    </div>
  );

  const unresolvedAlerts = alerts.filter(a => !a.resolvedAt);
  const criticalAlerts = unresolvedAlerts.filter(a => a.riskLevel === 'CRITICAL');

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Regulator Dashboard</h1>
            <p className="text-slate-500 text-sm">{user?.orgName} · Drug safety oversight</p>
          </div>
        </div>
        <button onClick={handleRefresh} disabled={refreshing}
          className="flex items-center gap-2 text-sm text-slate-600 border border-slate-200 px-4 py-2 rounded-xl hover:bg-slate-50 transition-colors">
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {msg && (
        <div className={`mb-6 px-4 py-3 rounded-xl text-sm font-medium flex items-center justify-between ${msg.startsWith('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          <span>{msg}</span>
          <button onClick={() => setMsg(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Total Units', value: stats.totalUnits, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Verifications', value: stats.totalVerifications, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            { label: 'Suspicious', value: stats.suspiciousEvents, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Active Recalls', value: stats.activeRecalls, color: 'text-red-600', bg: 'bg-red-50' },
            { label: 'Critical Alerts', value: stats.criticalAlerts, color: 'text-red-700', bg: 'bg-red-50' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center mb-2`}>
                <span className={`text-sm font-bold ${color}`}>{value > 99 ? '99+' : value}</span>
              </div>
              <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Critical alerts banner */}
      {criticalAlerts.length > 0 && (
        <div className="bg-red-600 text-white rounded-2xl p-4 mb-6 flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 flex-shrink-0" />
          <div>
            <p className="font-bold">{criticalAlerts.length} CRITICAL alert{criticalAlerts.length > 1 ? 's' : ''} require immediate attention</p>
            <p className="text-red-100 text-sm">Review and take action below</p>
          </div>
        </div>
      )}

      {/* Alerts Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Fraud Alerts
            {unresolvedAlerts.length > 0 && (
              <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">{unresolvedAlerts.length}</span>
            )}
          </h2>
        </div>

        {unresolvedAlerts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-400">
            <Shield className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>No active fraud alerts. Supply chain is clean.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {unresolvedAlerts.map(alert => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onRecall={(batchNumber) => handleRecallOpen(batchNumber)}
                onResolve={handleResolve}
              />
            ))}
          </div>
        )}
      </div>

      {/* Recalls Section */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-4">Recall History</h2>
        {recalls.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center text-slate-400 text-sm">
            No recalls issued yet.
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-xs text-slate-500 uppercase tracking-wide">
                  <th className="text-left px-5 py-3">Batch</th>
                  <th className="text-left px-5 py-3">Medicine</th>
                  <th className="text-left px-5 py-3">Reason</th>
                  <th className="text-left px-5 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recalls.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-semibold text-red-700">{r.batch?.batchNumber}</td>
                    <td className="px-5 py-3 text-slate-700">{r.batch?.medicine?.name}</td>
                    <td className="px-5 py-3 text-slate-500 max-w-xs truncate">{r.reason}</td>
                    <td className="px-5 py-3 text-slate-500 whitespace-nowrap">{new Date(r.recalledAt).toLocaleDateString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recall Confirmation Modal */}
      {recallModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Recall Batch {recallModal.batchNumber}</h3>
                <p className="text-sm text-slate-500">This will flag all units as RECALLED immediately.</p>
              </div>
            </div>

            <div className="mb-4">
              <label className="text-sm font-semibold text-slate-700 block mb-1">Recall Reason *</label>
              <textarea
                value={recallReason}
                onChange={e => setRecallReason(e.target.value)}
                placeholder="Describe the reason for this recall..."
                rows={3}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setRecallModal(null)}
                className="flex-1 py-2.5 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={handleRecallConfirm} disabled={!recallReason.trim() || recalling}
                className="flex-1 py-2.5 text-sm bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {recalling && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirm Recall
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
