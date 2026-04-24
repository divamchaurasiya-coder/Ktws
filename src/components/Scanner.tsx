import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X } from 'lucide-react';
import { motion } from 'motion/react';

interface ScannerProps {
  onScan: (text: string) => void;
  fps?: number;
  qrbox?: number;
  label?: string;
  active?: boolean;
}

export default function Scanner({ onScan, fps = 15, qrbox = 280, label, active = true }: ScannerProps) {
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const [hasError, setHasError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [requesting, setRequesting] = useState(false);

  const stopScanner = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        setStarted(false);
      } catch (err) {
        console.error("Stop error", err);
      }
    }
  };

  const startScanner = async () => {
    setHasError(null);
    setRequesting(true);

    try {
      // 1. Get the element
      const elementId = "qr-video-container";
      
      // 2. Clear previous instance if any
      if (html5QrCodeRef.current) {
        await stopScanner();
      }

      // 3. Create new instance
      const html5QrCode = new Html5Qrcode(elementId);
      html5QrCodeRef.current = html5QrCode;

      // 4. Start
      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const minEdgeFraction = 0.7; // 70%
            const minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
            const qrboxSize = Math.floor(minEdgeSize * minEdgeFraction);
            return {
              width: qrboxSize > 300 ? 300 : qrboxSize,
              height: qrboxSize > 300 ? 150 : qrboxSize / 2
            };
          },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          onScan(decodedText);
          // Optional: Vibrate on success
          if (navigator.vibrate) navigator.vibrate(100);
        },
        () => {} // silent on failure
      );

      setStarted(true);
      setRequesting(false);
    } catch (err: any) {
      console.error("Scanner Start Error:", err);
      setRequesting(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setHasError("Camera permission denied. Please allow camera access in your settings.");
      } else {
        setHasError("Could not access camera. Make sure no other app is using it.");
      }
    }
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      {label && (
        <div className="bg-[#EEF2FF] px-4 py-2 rounded-full border border-[#E0E7FF] shadow-sm">
          <p className="text-[11px] font-black text-[#4F46E5] uppercase tracking-[0.1em]">{label}</p>
        </div>
      )}
      
      <div className="relative w-full max-w-sm aspect-square overflow-hidden rounded-[40px] border-8 border-white bg-white shadow-2xl flex items-center justify-center ring-4 ring-[#EEF2FF]">
        {/* The Preview Layer */}
        <div 
          id="qr-video-container" 
          className={`absolute inset-0 w-full h-full bg-black flex items-center justify-center transition-opacity duration-500 ${started ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        />

        {/* Overlay / UI Layer */}
        {!started ? (
          <div className="z-10 bg-white absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
            <button 
              onClick={startScanner}
              disabled={requesting}
              className={`group flex flex-col items-center gap-6 text-[#4F46E5] active:scale-95 transition-all ${requesting ? 'opacity-50' : ''}`}
            >
              <div className="relative">
                <div className="absolute inset-0 bg-[#4F46E5] rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity" />
                <div className="relative p-7 bg-[#EEF2FF] rounded-3xl border-2 border-[#E0E7FF]">
                  <Camera size={44} strokeWidth={2.5} />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-lg font-black tracking-tight">{requesting ? 'Initializing...' : 'Open Camera'}</p>
                <p className="text-xs font-bold text-[#94A3B8] uppercase tracking-widest">To Start Scanning</p>
              </div>
            </button>
          </div>
        ) : (
          <div className="absolute inset-0 z-20 pointer-events-none">
            {/* Corner Markers */}
            <div className="absolute top-8 left-8 w-12 h-12 border-t-4 border-l-4 border-white rounded-tl-2xl opacity-80" />
            <div className="absolute top-8 right-8 w-12 h-12 border-t-4 border-r-4 border-white rounded-tr-2xl opacity-80" />
            <div className="absolute bottom-8 left-8 w-12 h-12 border-b-4 border-l-4 border-white rounded-bl-2xl opacity-80" />
            <div className="absolute bottom-8 right-8 w-12 h-12 border-b-4 border-r-4 border-white rounded-br-2xl opacity-80" />
            
            {/* Scanning Line Animation */}
            <motion.div 
              animate={{ top: ['20%', '80%', '20%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="absolute left-[15%] right-[15%] h-[2px] bg-[#4F46E5] shadow-[0_0_15px_#4F46E5] z-30"
            />

            {/* Close Button (visible when started) */}
            <button 
              onClick={stopScanner}
              className="absolute top-6 right-6 p-3 bg-black/40 backdrop-blur-md rounded-2xl text-white pointer-events-auto active:scale-90 transition-transform"
            >
              <X size={20} />
            </button>
          </div>
        )}
      </div>

      {hasError && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 mx-6 bg-red-50 text-red-600 text-xs font-bold rounded-[24px] border border-red-100 flex flex-col gap-3 items-center text-center shadow-sm"
        >
          <p>{hasError}</p>
          <button onClick={startScanner} className="px-6 py-2 bg-red-100 rounded-full hover:bg-red-200 transition-colors">Try Again</button>
        </motion.div>
      )}

      <div className="text-center px-10">
        <p className="text-[11px] text-[#94A3B8] font-bold leading-relaxed tracking-tight">
          Position the ISBN Barcode or Student QR code clearly inside the white corners.
        </p>
      </div>
    </div>
  );
}
