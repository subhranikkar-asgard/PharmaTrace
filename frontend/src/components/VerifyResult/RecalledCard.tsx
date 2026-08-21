import { XCircle } from 'lucide-react';
import type { VerificationResponse } from '../../types';

interface Props { data: VerificationResponse }

export function RecalledCard({ data }: Props) {
  return (
    <div className="border-2 border-red-300 bg-red-50 rounded-2xl overflow-hidden shadow-md">
      {/* Header */}
      <div className="bg-red-600 px-6 py-4 flex items-center gap-3">
        <XCircle className="w-10 h-10 text-white flex-shrink-0" />
        <div>
          <p className="text-white font-bold text-2xl">RECALLED PRODUCT</p>
          <p className="text-red-100 text-sm">This batch has been recalled by authorities</p>
        </div>
      </div>

      <div className="px-6 py-5 space-y-4">
        {/* Batch Info */}
        <div className="bg-white rounded-lg p-4 border border-red-200">
          <p className="font-bold text-slate-900 text-lg">{data.medicine.name} {data.medicine.strength}</p>
          <p className="text-slate-600 text-sm mt-1">Batch: <span className="font-semibold">{data.batch.batchNumber}</span></p>
          <p className="text-slate-600 text-sm">Unit: <span className="font-semibold text-xs">{data.unitId}</span></p>
        </div>

        {/* Recall Reason */}
        {data.recallReason && (
          <div className="bg-red-100 border border-red-200 rounded-xl p-4">
            <p className="text-red-700 text-xs font-semibold uppercase tracking-wide mb-1">Recall Reason</p>
            <p className="text-red-800 font-medium">{data.recallReason}</p>
          </div>
        )}

        {/* Risk Score */}
        <div className="text-center">
          <div className="text-5xl font-extrabold text-red-600">{data.riskScore}</div>
          <div className="text-sm text-slate-500 mt-1">Risk Score · {data.riskLevel}</div>
        </div>

        {/* Critical Warning */}
        <div className="bg-red-700 text-white rounded-xl px-4 py-4 text-center">
          <p className="font-bold text-xl">🚨 DO NOT USE</p>
          <p className="text-red-100 text-sm mt-1">Return this medicine to the pharmacy immediately</p>
          <p className="text-red-200 text-xs mt-1">Recalled by: CDSCO</p>
        </div>
      </div>
    </div>
  );
}
