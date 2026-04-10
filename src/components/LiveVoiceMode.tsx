import React, { useEffect, useRef, useState } from 'react';
import { LiveServerMessage, Modality } from '@google/genai';
import { genAIClient } from '../services/geminiService';
import { base64ToUint8Array, createPcmBlob, decodeAudioData } from '../utils/audioUtils';
import { Mic, MicOff, Volume2, X } from 'lucide-react';

interface LiveVoiceModeProps {
  context: string;
  onClose: () => void;
}

export const LiveVoiceMode: React.FC<LiveVoiceModeProps> = ({ context, onClose }) => {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error' | 'disconnected'>('connecting');
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false); // AI is speaking
  
  // Refs for audio handling to avoid re-renders
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sessionRef = useRef<any>(null);

  useEffect(() => {
    let mounted = true;

    const startSession = async () => {
      try {
        // Initialize Audio Contexts
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        inputContextRef.current = new AudioContextClass({ sampleRate: 16000 });
        outputContextRef.current = new AudioContextClass({ sampleRate: 24000 });
        const outputNode = outputContextRef.current.createGain();
        outputNode.connect(outputContextRef.current.destination);

        // Get Microphone Access
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        
        if (!mounted) return;

        // Setup Input Processing
        const inputCtx = inputContextRef.current;
        const source = inputCtx.createMediaStreamSource(stream);
        sourceNodeRef.current = source;
        const processor = inputCtx.createScriptProcessor(4096, 1, 1);
        scriptProcessorRef.current = processor;

        const sessionPromise = genAIClient.live.connect({
          model: 'gemini-2.5-flash-native-audio-preview-12-2025',
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
            },
            systemInstruction: `You are an encouraging and patient Virtual Teaching Assistant. 
            You are helping a student understand the following lesson content: ${context}.
            Keep your responses conversational, concise, and helpful. Do not lecture for too long.`,
          },
          callbacks: {
            onopen: () => {
              if (mounted) setStatus('connected');
              
              processor.onaudioprocess = (e) => {
                if (isMuted) return; 
                const inputData = e.inputBuffer.getChannelData(0);
                const pcmBlob = createPcmBlob(inputData);
                sessionPromise.then(session => {
                  session.sendRealtimeInput({ media: pcmBlob });
                });
              };
              
              source.connect(processor);
              processor.connect(inputCtx.destination);
            },
            onmessage: async (message: LiveServerMessage) => {
              // Handle Audio Output
              const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
              if (base64Audio && outputContextRef.current) {
                setIsSpeaking(true);
                const ctx = outputContextRef.current;
                
                // Sync playback time
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                
                const audioBuffer = await decodeAudioData(
                  base64ToUint8Array(base64Audio),
                  ctx
                );
                
                const bufferSource = ctx.createBufferSource();
                bufferSource.buffer = audioBuffer;
                bufferSource.connect(outputNode);
                bufferSource.start(nextStartTimeRef.current);
                bufferSource.onended = () => {
                   // Simple heuristic to toggle speaking state off after a delay if no new chunks come
                   setTimeout(() => setIsSpeaking(false), 500); 
                };

                nextStartTimeRef.current += audioBuffer.duration;
              }

              // Handle interruption
              if (message.serverContent?.interrupted) {
                 nextStartTimeRef.current = 0;
                 // Note: Ideally we would stop all active nodes here, 
                 // but simple pointer reset handles the "next" chunk logic.
                 setIsSpeaking(false);
              }
            },
            onclose: () => {
               if (mounted) setStatus('disconnected');
            },
            onerror: (err) => {
              console.error(err);
              if (mounted) setStatus('error');
            }
          }
        });

        sessionRef.current = sessionPromise;

      } catch (e) {
        console.error("Failed to initialize Live session", e);
        if (mounted) setStatus('error');
      }
    };

    startSession();

    return () => {
      mounted = false;
      // Cleanup
      if (scriptProcessorRef.current) {
        scriptProcessorRef.current.disconnect();
        scriptProcessorRef.current.onaudioprocess = null;
      }
      if (sourceNodeRef.current) {
        sourceNodeRef.current.disconnect();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (inputContextRef.current) inputContextRef.current.close();
      if (outputContextRef.current) outputContextRef.current.close();
      
      if (sessionRef.current) {
        sessionRef.current.then((session: any) => session.close());
      }
    };
  }, [context]); // Re-connect if context changes significantly, though usually it won't in one session

  return (
    <div className="flex flex-col items-center justify-center h-full bg-slate-900 text-white rounded-xl p-6 relative overflow-hidden">
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 p-2 hover:bg-slate-800 rounded-full transition-colors"
      >
        <X className="w-5 h-5 text-slate-400" />
      </button>

      {/* Visualizer Circle */}
      <div className={`relative flex items-center justify-center w-32 h-32 rounded-full mb-8 transition-all duration-300 ${isSpeaking ? 'scale-110' : 'scale-100'}`}>
        <div className={`absolute inset-0 bg-blue-500 rounded-full opacity-20 ${status === 'connected' ? 'animate-ping' : ''}`}></div>
        <div className={`absolute inset-2 bg-blue-600 rounded-full opacity-30 ${isSpeaking ? 'animate-pulse' : ''}`}></div>
        <div className="relative z-10 bg-gradient-to-br from-blue-500 to-indigo-600 w-24 h-24 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/50">
          <Volume2 className={`w-10 h-10 text-white ${isSpeaking ? 'animate-bounce' : ''}`} />
        </div>
      </div>

      <div className="text-center space-y-2 mb-8">
        <h3 className="text-xl font-bold">
          {status === 'connecting' && 'Connecting to VTA...'}
          {status === 'connected' && (isSpeaking ? 'VTA is speaking...' : 'Listening...')}
          {status === 'error' && 'Connection Error'}
          {status === 'disconnected' && 'Session Ended'}
        </h3>
        <p className="text-slate-400 text-sm">
          {status === 'connected' ? 'Speak naturally to discuss the lesson.' : 'Please check your microphone permissions.'}
        </p>
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => {
             setIsMuted(!isMuted);
             // Note: In a real app we might want to also suspend the audio context or disconnect the node
          }}
          className={`p-4 rounded-full transition-all ${
            isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-slate-700 hover:bg-slate-600'
          }`}
        >
          {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>
        
        <button
          onClick={onClose}
          className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-full font-medium transition-colors"
        >
          End Session
        </button>
      </div>
    </div>
  );
};
