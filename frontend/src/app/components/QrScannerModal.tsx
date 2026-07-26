import { useEffect, useState, useRef } from "react";
// Use window global if import fails
const Html5QrcodeGlobal = (window as any).Html5Qrcode;
const Html5QrcodeSupportedFormatsGlobal = (window as any).Html5QrcodeSupportedFormats;

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Camera, RefreshCw, X, Loader2, AlertCircle } from "lucide-react";

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
}

export function QrScannerModal({ isOpen, onClose, onScanSuccess }: QrScannerModalProps) {
  const [isScannerStarted, setIsScannerStarted] = useState(false);
  const [cameras, setCameras] = useState<any[]>([]);
  const [currentCameraId, setCurrentCameraId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<any>(null);

  useEffect(() => {
    if (isOpen) {
      loadCameras();
    } else {
      stopScanner();
    }
    return () => {
      stopScanner();
    };
  }, [isOpen]);

  const loadCameras = async () => {
    try {
      const Html5QrcodeClass = Html5QrcodeGlobal || (await import("html5-qrcode")).Html5Qrcode;
      const devices = await Html5QrcodeClass.getCameras();
      if (devices && devices.length > 0) {
        setCameras(devices);
        const backCamera = devices.find((d: any) => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('rear') || d.label.toLowerCase().includes('environment'));
        setCurrentCameraId(backCamera ? backCamera.id : devices[0].id);
        setError(null);
      } else {
        setError("No cameras found on this device.");
      }
    } catch (err) {
      console.error("Error getting cameras", err);
      setError("Camera permission denied or not available.");
    }
  };

  const startScanner = async (cameraId: string) => {
    if (scannerRef.current) {
      await stopScanner();
    }

    try {
      const Html5QrcodeClass = Html5QrcodeGlobal || (await import("html5-qrcode")).Html5Qrcode;
      const Formats = Html5QrcodeSupportedFormatsGlobal || (await import("html5-qrcode")).Html5QrcodeSupportedFormats;
      
      const html5QrCode = new Html5QrcodeClass("qr-reader");
      scannerRef.current = html5QrCode;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        formatsToSupport: [
          Formats.QR_CODE,
          Formats.EAN_13,
          Formats.CODE_128,
          Formats.UPC_A,
          Formats.UPC_E,
          Formats.EAN_8,
        ]
      };

      await html5QrCode.start(
        cameraId,
        config,
        (decodedText: string) => {
          onScanSuccess(decodedText);
          stopScanner();
          onClose();
        },
        (errorMessage: string) => {
          // Ignore verbose logs
        }
      );
      setIsScannerStarted(true);
      setError(null);
    } catch (err) {
      console.error("Error starting scanner", err);
      setError("Failed to start camera. It might be used by another app.");
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
        setIsScannerStarted(false);
      } catch (err) {
        console.error("Error stopping scanner", err);
      }
    }
  };

  const switchCamera = () => {
    if (cameras.length < 2) return;
    const currentIndex = cameras.findIndex(c => c.id === currentCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    setCurrentCameraId(cameras[nextIndex].id);
    if (isScannerStarted) {
      startScanner(cameras[nextIndex].id);
    }
  };

  useEffect(() => {
    if (isOpen && currentCameraId && !isScannerStarted) {
      startScanner(currentCameraId);
    }
  }, [isOpen, currentCameraId]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-3xl border-none shadow-2xl bg-black">
        <DialogHeader className="p-6 bg-white border-b border-gray-100 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-black text-gray-900">Scan QR / Barcode</DialogTitle>
              <DialogDescription className="text-gray-500 font-medium">Align the code within the frame to scan</DialogDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full" title="Close" aria-label="Close">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="relative aspect-square w-full bg-black flex items-center justify-center overflow-hidden">
          <div id="qr-reader" className="w-full h-full" />
          
          {!isScannerStarted && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-4 bg-black/50 backdrop-blur-sm">
              <Loader2 className="w-10 h-10 animate-spin text-indigo-400" />
              <p className="font-bold">Starting camera...</p>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-8 text-center gap-4 bg-black/80 backdrop-blur-sm">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center text-red-500 mb-2">
                <AlertCircle className="w-10 h-10" />
              </div>
              <h4 className="text-lg font-black">Camera Error</h4>
              <p className="text-gray-300 text-sm">{error}</p>
              <Button 
                variant="outline" 
                className="mt-2 border-white/20 text-white hover:bg-white/10"
                onClick={() => loadCameras()}
              >
                Retry
              </Button>
            </div>
          )}

          {isScannerStarted && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-[250px] h-[250px] border-2 border-indigo-500 rounded-3xl relative">
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-xl" />
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr-xl" />
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-xl" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-white rounded-br-xl" />
                <div className="absolute inset-x-0 top-0 h-0.5 bg-indigo-400 shadow-[0_0_15px_rgba(129,140,248,0.8)] animate-scan" />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-6 bg-white border-t border-gray-100 flex-row justify-center gap-4 shrink-0">
          <Button 
            variant="outline" 
            className="flex-1 h-12 font-bold rounded-xl gap-2"
            onClick={switchCamera}
            disabled={cameras.length < 2}
          >
            <RefreshCw className="w-4 h-4" /> Switch Camera
          </Button>
          <Button 
            variant="outline" 
            className="flex-1 h-12 font-bold rounded-xl border-red-100 text-red-600 hover:bg-red-50"
            onClick={onClose}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
