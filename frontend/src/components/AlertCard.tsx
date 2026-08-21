import { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { RiskScoreBadge } from './RiskScoreBadge';
import { SupplyChainTimeline } from './SupplyChainTimeline';
import type { AlertItem } from '../types';

interface Props {
  alert: AlertItem;
  onRecall: (batchId: string, batchNumber: string) => void;
  onResolve: (alertId: string) => void;
}

export function AlertCard({ alert, onRecall, onResolve }: Props) {
  const [expanded, setExpanded] = useState(false);

  const borderColor =
    alert.riskLevel === 'CRITICAL' ? 'border-red-300' :
    alert.riskLevel === 'HIGH' ? 'border-orange-300' :
    alert.riskLevel === 'MEDIUM' ? 'border-amber-300' : 'border-slate-200';

  const headerBg =
    alert.riskLevel === 'CRITICAL' ? 'bg-red-50' :
    alert.riskLevel === 'HIGH' ? 'bg-orange-50' :
    alert.riskLevel === 'MEDIUM' ? 'bg-amber-50' : 'bg-slate-50';

  return (
    <div className={`border-2 ${borderColor} rounded-xl overflow-hidden bg-white shadow-sm`}>
      <div className={`${headerBg} px-5 py-4`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <div className="min-w-0">
              <p className="font-bold text-slate-900 truncate">{alert.unit?.unitId ?? alert.unitId}</p>
              <p className="text-sm text-slate-500 truncate">
                {alert.unit?.batch?.medicine?.name} · Batch: {alert.unit?.batch?.batchNumber}
              </p>
            </div>
          </div>
          <RiskScoreBadge score={alert.riskScore} level={alert.riskLevel} />
        </div>

        {/* Reasons */}
        <ul className="mt-3 space-y-1">
          {alert.reasons.map((r, i) => (
            <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
              <span className="text-amber-500 font-bold flex-shrink-0">•</span>
              {r}
            </li>
          ))}
        </ul>

        <p className="text-xs text-slate-400 mt-2">
          Raised: {new Date(alert.createdAt).toLocaleString('en-IN')}
          {alert.resolvedAt && <span className="ml-2 text-green-600">✓ Resolved</span>}
        </p>
      </div>

      {/* Action row */}
      <div className="px-5 py-3 bg-white border-t border-slate-100 flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setExpanded(e => !e)}
          className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {expanded ? 'Hide' : 'Investigate'}
        </button>

        {!alert.resolvedAt && (
          <>
            <button
              onClick={() => onRecall(alert.unit?.batch?.batchNumber ?? '', alert.unit?.batch?.batchNumber ?? '')}
              className="flex items-center gap-1.5 text-sm bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              🚨 Recall Batch
            </button>
            <button
              onClick={() => onResolve(alert.id)}
              className="flex items-center gap-1.5 text-sm text-slate-500 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Resolve
            </button>
          </>
        )}
      </div>

      {/* Expanded investigation panel */}
      {expanded && (
        <div className="px-5 py-4 border-t border-slate-100 bg-slate-50">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Unit Details</p>
          <div className="grid grid-cols-2 gap-2 text-sm mb-4">
            <div className="bg-white rounded-lg p-2 border border-slate-100">
              <p className="text-xs text-slate-400">Status</p>
              <p className="font-semibold text-slate-700">{alert.unit?.status}</p>
            </div>
            <div className="bg-white rounded-lg p-2 border border-slate-100">
              <p className="text-xs text-slate-400">Risk Level</p>
              <p className="font-semibold text-slate-700">{alert.riskLevel}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
