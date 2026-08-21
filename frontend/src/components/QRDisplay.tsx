import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

interface Props { value: string; size?: number }

export function QRDisplay({ value, size = 200 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (canvasRef.current && value) {
      QRCode.toCanvas(canvasRef.current, value, {
        width: size,
        margin: 2,
        color: { dark: '#0f172a', light: '#ffffff' },
      });
    }
  }, [value, size]);

  return (
    <div className="flex flex-col items-center gap-2">
      <canvas ref={canvasRef} className="rounded-lg border border-slate-200 shadow-sm" />
      <p className="text-[10px] text-slate-400 font-mono text-center break-all max-w-[200px]">{value}</p>
    </div>
  );
}
