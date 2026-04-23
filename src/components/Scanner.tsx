import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Camera } from 'lucide-react';

interface ScannerProps {
  onScan: (text: string) => void;
  fps?: number;
  qrbox?: number;
  label?: string;
  active?: boolean;
}

export default function Scanner({ onScan, fps = 10, qrbox = 250, label, active = true }: ScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [hasError, setHasError] = useState(false);
  const [started, setStarted] = useState(false);

  const startScanner = () => {
    try {
      if (scannerRef.current) {
        scannerRef.current.clear();
      }

      const scanner = new Html5QrcodeScanner(
        'qr-reader',
        { 
          fps, 
          qrbox: { width: qrbox, height: qrbox },
          showTorchButtonIfSupported: true,
          aspectRatio: 1.0,
          rememberLastUsedCamera: true,
          supportedScanTypes: [0, 1] // Both QR and Barcode
        },
        false
      );

      scanner.render(
        (text) => {
          if (text) {
            onScan(text);
          }
        },
        (error) => {
          // ignore non-critical errors
        }
      );

      scannerRef.current = scanner;
      setStarted(true);
      setHasError(false);
    } catch (err) {
      console.error("Scanner Error:", err);
      setHasError(true);
    }
  };

  useEffect(() => {
    if (active && started) {
      // already started or will be started via button
    }
    
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.error("Cleanup error", err));
      }
    };
  }, [active, started]);

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {label && <p className="text-xs font-bold text-[#64748B] uppercase tracking-widest">{label}</p>}
      
      <div className="relative w-full max-w-sm aspect-square overflow-hidden rounded-[32px] border-4 border-dashed border-[#EEF2FF] bg-white shadow-xl flex items-center justify-center">
        {!started && (
          <button 
            onClick={startScanner}
            className="flex flex-col items-center gap-3 text-[#4F46E5] active:scale-95 transition-transform"
          >
            <div className="p-5 bg-[#EEF2FF] rounded-full">
              <Camera size={32} />
            </div>
            <span className="text-sm font-bold">Tap to Start Camera</span>
          </button>
        )}
        <div id="qr-reader" className={`w-full h-full ${!started ? 'hidden' : ''}`}></div>
      </div>

      {hasError && (
        <div className="p-4 bg-red-50 text-red-600 text-xs font-bold rounded-2xl border border-red-100 italic flex gap-2 items-center">
          Failed to access camera. Please check permissions.
        </div>
      )}

      <div className="text-center px-6">
        <p className="text-[10px] text-[#94A3B8] font-medium leading-relaxed italic">
          Position the ISBN barcode or Student QR within the frame
        </p>
      </div>
    </div>
  );
}
