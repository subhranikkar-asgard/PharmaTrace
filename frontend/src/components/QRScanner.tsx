import { useEffect, useRef, useState } from 'react';
import { BrowserQRCodeReader } from '@zxing/browser';
import type { IScannerControls } from '@zxing/browser';
import { X, Camera, Loader2 } from 'lucide-react';

interface Props {
  onScan: (unitId: string) => void;
  onClose: () => void;
}

function extractUnitId(raw: string): string {
  try {
    const url = new URL(raw);
    const parts = url.pathname.split('/').filter(Boolean);
    const idx = parts.indexOf('verify');
    if (idx !== -1 && parts[idx + 1]) return parts[idx + 1];
  } catch { /* not a URL — use as-is */ }
  return raw.trim();
}

export function QRScanner({ onScan, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [status, setStatus] = useState<'starting' | 'active' | 'error'>('starting');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const reader = new BrowserQRCodeReader();
    let stopped = false;

    reader.decodeFromVideoDevice(
      undefined, // use default camera (rear on mobile)
      videoRef.current!,
      (result, err, controls) => {
        if (!controlsRef.current) {
          controlsRef.current = controls;
          if (!stopped) setStatus('active');
        }
        if (result && !stopped) {
          stopped = true;
          controls.stop();
          onScan(extractUnitId(result.getText()));
        }
        // Ignore per-frame decode errors — they are normal
        void err;
      }
    ).catch((err: Error) => {
      if (stopped) return;
      const msg = err?.message ?? '';
      if (msg.includes('ermission') || msg.includes('denied')) {
        setErrorMsg('Camera permission denied. Please allow camera access in your browser settings and try again.');
      } else if (msg.includes('ound') || msg.includes('device')) {
        setErrorMsg('No camera found. Make sure your device has a working camera.');
      } else {
        setErrorMsg('Could not start the camera. Try closing other apps using the camera and retry.');
      }
      setStatus('error');
    });

    return () => {
      stopped = true;
      controlsRef.current?.stop();
    };
  }, []);

  const handleClose = () => {
    controlsRef.current?.stop();
    onClose();
  };

  return (
    // Backdrop — stops click propagation to prevent accidental close
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4"
      onClick={handleClose}
    >
      {/* Modal card — clicks inside do NOT close the modal */}
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between bg-blue-600 px-5 py-4">
          <div className="flex items-center gap-2 text-white">
            <Camera className="w-5 h-5" />
            <span className="font-bold text-sm">Scan Medicine QR Code</span>
          </div>
          <button
            onClick={handleClose}
            className="text-white/80 hover:text-white transition-colors"
            aria-label="Close scanner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          {status === 'error' ? (
            /* Error state */
            <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center space-y-3">
              <p className="text-red-700 text-sm font-medium leading-snug">{errorMsg}</p>
              <button
                onClick={handleClose}
                className="text-sm font-semibold text-red-600 underline hover:text-red-800"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              {/* Video viewfinder — camera renders here, no library HTML injected */}
              <div className="relative rounded-xl overflow-hidden bg-black" style={{ height: 280 }}>
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                  autoPlay
                />

                {/* Loading overlay */}
                {status === 'starting' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 gap-3">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                    <p className="text-white text-sm font-medium">Starting camera…</p>
                  </div>
                )}

                {/* Scan frame overlay */}
                {status === 'active' && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-48 h-48 relative">
                      {/* Corner markers */}
                      <span className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-400 rounded-tl" />
                      <span className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-400 rounded-tr" />
                      <span className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-400 rounded-bl" />
                      <span className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-400 rounded-br" />
                      {/* Scan line animation */}
                      <div className="absolute left-1 right-1 h-0.5 bg-blue-400/80 animate-bounce" style={{ top: '50%' }} />
                    </div>
                  </div>
                )}
              </div>

              <p className="text-center text-xs text-slate-400 pb-1">
                Point the camera at the QR code on the medicine packaging
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
