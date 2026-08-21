import { AlertTriangle, AlertCircle } from 'lucide-react';
import { RiskScoreBadge } from '../RiskScoreBadge';
import { SupplyChainTimeline } from '../SupplyChainTimeline';
import type { VerificationResponse } from '../../types';

interface Props { data: VerificationResponse }

export function SuspiciousCard({ data }: Props) {
  return (
    <div className="border-2 border-amber-300 bg-amber-50 rounded-2xl overflow-hidden shadow-md">
      {/* Header */}
      <div className="bg-amber-500 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-8 h-8 text-white" />
          <div>
            <p className="text-white font-bold text-xl">SUSPICIOUS PRODUCT</p>
            <p className="text-amber-100 text-sm">Fraud indicators detected</p>
          </div>
        </div>
        <RiskScoreBadge score={data.riskScore} level={data.riskLevel} />
      </div>

      <div className="px-6 py-5 space-y-4">
        {/* Medicine info */}
        <div className="bg-white rounded-lg p-3 border border-amber-200">
          <p className="font-semibold text-slate-800">{data.medicine.name} {data.medicine.strength} · {data.medicine.form}</p>
          <p className="text-sm text-slate-500">Unit: {data.unitId} · Batch: {data.batch.batchNumber}</p>
        </div>

        {/* Risk score large display */}
        <div className="text-center py-2">
          <div className="text-5xl font-extrabold text-amber-600">{data.riskScore}</div>
          <div className="text-sm text-slate-500 mt-1">Risk Score out of 100</div>
        </div>

        {/* Fraud reasons */}
        <div className="bg-white rounded-xl border border-amber-200 overflow-hidden">
          <div className="bg-amber-100 px-4 py-2">
            <p className="text-amber-800 font-semibold text-sm">⚠ Fraud Indicators</p>
          </div>
          <ul className="divide-y divide-amber-100">
            {data.reasons.map((r, i) => (
              <li key={i} className="flex items-start gap-3 px-4 py-3">
                <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-slate-700">{r}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Warning banner */}
        {data.supplyChain && data.supplyChain.length > 0 && (
          <div className="pt-1">
            <p className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-amber-500 rounded-full inline-block" />
              Supply Chain Journey
            </p>
            <SupplyChainTimeline steps={data.supplyChain} />
          </div>
        )}

        {/* Warning banner */}
        <div className="bg-amber-600 text-white rounded-xl px-4 py-3 text-center">
          <p className="font-bold text-lg">⛔ DO NOT DISPENSE</p>
          <p className="text-amber-100 text-sm mt-0.5">Contact your pharmacist or local authority immediately</p>
        </div>
      </div>
    </div>
  );
}
