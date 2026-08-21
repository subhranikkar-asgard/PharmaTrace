import { CheckCircle, MapPin, Clock } from 'lucide-react';
import type { SupplyChainStep } from '../types';

const stageColors: Record<string, string> = {
  MANUFACTURER: 'bg-blue-500',
  DISTRIBUTOR:  'bg-purple-500',
  WHOLESALER:   'bg-indigo-500',
  PHARMACY:     'bg-teal-500',
};

const stageLabels: Record<string, string> = {
  MANUFACTURER: 'Manufacturer',
  DISTRIBUTOR:  'Distributor',
  WHOLESALER:   'Wholesaler',
  PHARMACY:     'Pharmacy',
};

interface Props { steps: SupplyChainStep[] }

export function SupplyChainTimeline({ steps }: Props) {
  if (!steps || steps.length === 0) {
    return <p className="text-slate-400 text-sm italic">No supply chain data yet.</p>;
  }

  return (
    <ol className="relative border-l-2 border-slate-200 ml-3 space-y-6">
      {steps.map((step, i) => {
        const dot = stageColors[step.stage] ?? 'bg-slate-400';
        const label = stageLabels[step.stage] ?? step.stage;
        return (
          <li key={i} className="ml-6">
            <span className={`absolute -left-[11px] flex items-center justify-center w-5 h-5 rounded-full ${dot} ring-2 ring-white`}>
              <CheckCircle className="w-3 h-3 text-white" />
            </span>
            <div className="bg-white border border-slate-100 rounded-lg p-3 shadow-sm">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
              <p className="font-semibold text-slate-800 mt-0.5">{step.organization}</p>
              <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />{step.location || 'Unknown'}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(step.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
              {step.auditHash && (
                <p className="mt-1.5 text-[10px] text-slate-400 font-mono truncate">
                  Hash: {step.auditHash.slice(0, 20)}...
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
