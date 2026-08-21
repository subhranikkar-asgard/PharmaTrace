import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera } from 'lucide-react';

interface Props {
  onScan: (unitId: string) => void;
  onClose: () => void;
}

function extractUnitId(raw: string): string {
  // If it's a URL like https://...pharmatrace.../verify/B2026-001-000001
  // extract the last path segment
  try {
    const url = new URL(raw);
    const parts = url.pathname.split('/').filter(Boolean);
    const verifyIndex = parts.indexOf('verify');
    if (verifyIndex !== -1 && parts[verifyIndex + 1]) {
      return parts[verifyIndex + 1];
    }
  } catch {
    // not a URL — use as-is
  }
  return raw.trim();
}

export function QRScanner({ onScan, onClose }: Props) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const elementId = 'pharmatrace-qr-reader';

  useEffect(() => {
    const scanner = new Html5Qrcode(elementId);
    scannerRef.current = scanner;

    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText) => {
        // Success — extract unit ID and notify parent
        const unitId = extractUnitId(decodedText);
        scanner.stop().catch(() => {});
        onScan(unitId);
      },
      () => { /* scan failures are normal — ignore per-frame errors */ }
    ).then(() => {
      setScanning(true);
    }).catch((err) => {
      setError(
        err?.message?.includes('Permission')
          ? 'Camera permission denied. Please allow camera access and try again.'
          : 'Could not start camera. Make sure your device has a camera.'
      );
    });

    return () => {
      scanner.stop().catch(() => {});
    };
  }, []);

  const handleClose = () => {
    scannerRef.current?.stop().catch(() => {});
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">

        {/* Header */}
        <div className="bg-blue-600 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <Camera className="w-5 h-5" />
            <span className="font-bold">Scan Medicine QR Code</span>
          </div>
          <button onClick={handleClose} className="text-white/80 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scanner */}
        <div className="p-4">
          {error ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
              <p className="text-red-700 text-sm font-medium">{error}</p>
              <button onClick={handleClose}
                className="mt-3 text-sm text-red-600 underline hover:text-red-800">
                Close
              </button>
            </div>
          ) : (
            <>
              {/* html5-qrcode mounts itself into this div */}
              <div id={elementId} className="rounded-xl overflow-hidden" />

              {!scanning && (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <span className="ml-2 text-slate-500 text-sm">Starting camera...</span>
                </div>
              )}

              <p className="text-center text-xs text-slate-400 mt-3">
                Point the camera at the QR code on the medicine packaging
              </p>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
