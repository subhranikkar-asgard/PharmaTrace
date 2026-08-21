import { CheckCircle2, Calendar, Building2, Package } from 'lucide-react';
import { SupplyChainTimeline } from '../SupplyChainTimeline';
import { RiskScoreBadge } from '../RiskScoreBadge';
import type { VerificationResponse } from '../../types';

interface Props { data: VerificationResponse }

export function VerifiedCard({ data }: Props) {
  return (
    <div className="border-2 border-green-200 bg-green-50 rounded-2xl overflow-hidden shadow-md">
      {/* Header */}
      <div className="bg-green-600 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-8 h-8 text-white" />
          <div>
            <p className="text-white font-bold text-xl">VERIFIED</p>
            <p className="text-green-100 text-sm">Authentic medicine unit</p>
          </div>
        </div>
        <RiskScoreBadge score={data.riskScore} level={data.riskLevel} />
      </div>

      {/* Medicine Info */}
      <div className="px-6 py-5 space-y-4">
        <div className="flex items-start gap-3">
          <Package className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-bold text-slate-900 text-lg">{data.medicine.name} {data.medicine.strength}</p>
            <p className="text-slate-500 text-sm">{data.medicine.form}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-white rounded-lg p-3 border border-green-100">
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wide">Batch</p>
            <p className="font-semibold text-slate-800 mt-0.5">{data.batch.batchNumber}</p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-green-100">
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wide">Unit ID</p>
            <p className="font-semibold text-slate-800 mt-0.5 text-xs">{data.unitId}</p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-green-100">
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wide flex items-center gap-1">
              <Building2 className="w-3 h-3" /> Manufacturer
            </p>
            <p className="font-semibold text-slate-800 mt-0.5">{data.manufacturer}</p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-green-100">
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wide flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Expiry
            </p>
            <p className="font-semibold text-slate-800 mt-0.5">
              {new Date(data.batch.expiryDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Supply Chain */}
        <div className="pt-2">
          <p className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full inline-block" />
            Supply Chain Journey
          </p>
          <SupplyChainTimeline steps={data.supplyChain} />
        </div>

        <p className="text-xs text-slate-400 text-center pt-2">
          Scan #{data.scanCount} · {data.lastScannedAt
            ? `Last scanned ${new Date(data.lastScannedAt).toLocaleTimeString()}`
            : 'First scan'}
        </p>
      </div>
    </div>
  );
}
