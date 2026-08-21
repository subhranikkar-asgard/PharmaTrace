import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, Loader2, QrCode } from 'lucide-react';
import { verifyUnit } from '../services/api';
import { VerifiedCard } from '../components/VerifyResult/VerifiedCard';
import { SuspiciousCard } from '../components/VerifyResult/SuspiciousCard';
import { RecalledCard } from '../components/VerifyResult/RecalledCard';
import type { VerificationResponse } from '../types';

function getResultType(data: VerificationResponse): 'verified' | 'suspicious' | 'recalled' {
  if (data.status === 'RECALLED') return 'recalled';
  if (data.riskScore >= 30) return 'suspicious';
  return 'verified';
}

export function VerifyPage() {
  const { unitId: paramUnitId } = useParams<{ unitId?: string }>();
  const navigate = useNavigate();

  const [unitId, setUnitId] = useState(paramUnitId ?? '');
  const [result, setResult] = useState<VerificationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = useCallback(async (id?: string) => {
    const targetId = (id ?? unitId).trim();
    if (!targetId) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await verifyUnit(targetId);
      setResult(data);
      navigate(`/verify/${targetId}`, { replace: true });
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message ?? 'Verification failed. Check unit ID.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [unitId, navigate]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleVerify();
  };

  const resultType = result ? getResultType(result) : null;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 py-10">

        {/* Hero */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg">
            <Search className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900">Verify Medicine</h1>
          <p className="text-slate-500 mt-2">Enter the unit ID printed on the medicine packaging to verify its authenticity</p>
        </div>

        {/* Search box */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <label className="block text-sm font-semibold text-slate-700 mb-2">Medicine Unit ID</label>
          <div className="flex gap-3">
            <input
              type="text"
              value={unitId}
              onChange={e => setUnitId(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. B2026-001-000001"
              className="flex-1 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={() => handleVerify()}
              disabled={loading || !unitId.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-xl transition-colors flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </div>

          {/* Demo shortcuts */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-400 mb-2 font-medium">Quick demo:</p>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'B2026-001-000001', label: '✓ Clean', color: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' },
                { id: 'B2026-001-000002', label: '⚠ Sold', color: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' },
                { id: 'B2026-002-000001', label: '🚨 Recalled', color: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' },
              ].map(({ id, label, color }) => (
                <button
                  key={id}
                  onClick={() => { setUnitId(id); handleVerify(id); }}
                  className={`text-xs font-medium px-3 py-1.5 rounded-lg border ${color} transition-colors`}
                >
                  {label}: {id}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6 flex items-center gap-2 text-red-700">
            <span className="text-lg">⚠</span>
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <p className="text-slate-500 text-sm">Checking authenticity...</p>
          </div>
        )}

        {/* Result */}
        {result && !loading && (
          <div className="animate-[fadeIn_0.3s_ease-in]">
            {resultType === 'verified' && <VerifiedCard data={result} />}
            {resultType === 'suspicious' && <SuspiciousCard data={result} />}
            {resultType === 'recalled' && <RecalledCard data={result} />}
          </div>
        )}

        {/* Empty state */}
        {!result && !loading && !error && (
          <div className="text-center py-12 text-slate-400">
            <QrCode className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Scan a QR code or enter a unit ID above to verify</p>
          </div>
        )}
      </div>
    </div>
  );
}
