import React, { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, Video, Activity } from 'lucide-react';
import { analyzeStudentAttention } from '../services/geminiService';

interface AttentionTrackerProps {
  onStatusChange: (status: 'focused' | 'distracted' | 'confused' | 'away') => void;
  isActive: boolean;
}

export const AttentionTracker: React.FC<AttentionTrackerProps> = ({ onStatusChange, isActive }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [lastCheck, setLastCheck] = useState<Date>(new Date());
  const [isChecking, setIsChecking] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<'focused' | 'distracted' | 'confused' | 'away'>('focused');

  const checkAttention = async () => {
    if (!videoRef.current || !canvasRef.current || isChecking) return;

    setIsChecking(true);
    try {
      // Capture frame
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const base64Image = canvas.toDataURL('image/jpeg', 0.7);

      const result = await analyzeStudentAttention(base64Image);

      setCurrentStatus(result.status);
      onStatusChange(result.status);
      setLastCheck(new Date());
    } catch (err) {
      console.error("Attention check failed:", err);
      // Fail silently or default to focused to avoid disrupting user
      setCurrentStatus('focused');
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    let stream: MediaStream | null = null;
    let intervalId: any;

    const setupCamera = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Camera API not available in this browser context (requires HTTPS or localhost).");
        }

        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 320 },
            height: { ideal: 240 },
            facingMode: "user"
          }
        });

        if (!mounted) {
          mediaStream.getTracks().forEach(track => track.stop());
          return;
        }

        stream = mediaStream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Play promise to handle autoplay restrictions
          videoRef.current.play().catch(e => console.warn("Autoplay blocked:", e));
          setHasPermission(true);
        }
      } catch (err) {
        if (!mounted) return;
        console.error("Camera access denied or failed:", err);
        setHasPermission(false);
      }
    };

    if (isActive) {
      setupCamera();
      // Check attention every 30 seconds to conserve free-tier API Quota (15 RPM)
      intervalId = setInterval(checkAttention, 30000);
    }

    return () => {
      mounted = false;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      clearInterval(intervalId);
    };
  }, [isActive]);

  if (!isActive) return null;

  const getBorderColor = () => {
    switch (currentStatus) {
      case 'focused': return 'border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.3)]';
      case 'distracted': return 'border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.3)]';
      case 'confused': return 'border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.3)]';
      case 'away': return 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.3)]';
      default: return 'border-slate-700';
    }
  };

  return (
    <div className="bg-slate-900 rounded-lg p-3 text-white transition-all duration-300">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Video className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Attention AI</span>
        </div>
        {isChecking && <Activity className="w-3 h-3 text-green-400 animate-pulse" />}
      </div>

      <div className={`relative rounded overflow-hidden bg-black aspect-video mb-2 border-2 transition-all duration-500 ${getBorderColor()}`}>
        {hasPermission === false ? (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-500">
            <EyeOff className="w-6 h-6 mb-1 opacity-50" />
            <span>Camera blocked</span>
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover opacity-80"
          />
        )}
        {/* Hidden canvas for processing */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="flex justify-between items-end">
        <div className="text-[10px] text-slate-500">
          Updated: {lastCheck.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
        <div className="flex items-center gap-1">
          <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${currentStatus === 'focused' ? 'bg-green-500' : currentStatus === 'away' ? 'bg-red-500' : 'bg-amber-500'}`}></span>
          <span className="text-[10px] font-medium capitalize text-slate-300">{currentStatus}</span>
        </div>
      </div>
    </div>
  );
};