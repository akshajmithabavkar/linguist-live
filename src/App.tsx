import { Mic, MicOff, Languages, History, Trash2, Loader2, Volume2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useState, useRef, useEffect } from "react";
import AudioVisualizer from "./components/AudioVisualizer";
import { transcribeAndTranslate, TranscriptionResult } from "./services/gemini";

interface HistoryItem extends TranscriptionResult {
  id: string;
  timestamp: number;
}

export default function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [currentResult, setCurrentResult] = useState<TranscriptionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Load history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem("linguist_history");
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  // Save history to localStorage
  useEffect(() => {
    localStorage.setItem("linguist_history", JSON.stringify(history));
  }, [history]);

  const startRecording = async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStream(mediaStream);
      
      const mediaRecorder = new MediaRecorder(mediaStream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        await processAudio(audioBlob);
        
        // Stop all tracks
        mediaStream.getTracks().forEach(track => track.stop());
        setStream(null);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setError("Microphone access denied. Please check your permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (blob: Blob) => {
    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64data = (reader.result as string).split(",")[1];
        const result = await transcribeAndTranslate(base64data, "audio/webm");
        
        setCurrentResult(result);
        const newItem: HistoryItem = {
          ...result,
          id: Math.random().toString(36).substring(7),
          timestamp: Date.now(),
        };
        setHistory(prev => [newItem, ...prev].slice(0, 50));
        setIsProcessing(false);
      };
    } catch (err) {
      console.error("Error processing audio:", err);
      setError("Failed to process audio. Please try again.");
      setIsProcessing(false);
    }
  };

  const clearHistory = () => {
    setHistory([]);
    setCurrentResult(null);
  };

  return (
    <div className="min-h-screen bg-[#E6E6E6] text-[#141414] font-sans selection:bg-blue-500 selection:text-white">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <header className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#151619] rounded-lg flex items-center justify-center">
              <Languages className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight uppercase">Linguist Live</h1>
              <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">v1.0.0 // Gemini Powered</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
              <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500">
                {isRecording ? 'Recording' : 'Ready'}
              </span>
            </div>
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Controls & Current Result */}
          <div className="lg:col-span-7 space-y-6">
            {/* Recorder Widget */}
            <section className="bg-[#151619] rounded-2xl p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4">
                <span className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Audio Input</span>
              </div>
              
              <div className="flex flex-col items-center justify-center py-8">
                <AudioVisualizer isRecording={isRecording} stream={stream} />
                
                <div className="mt-12 relative">
                  <AnimatePresence mode="wait">
                    {!isRecording ? (
                      <motion.button
                        key="start"
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 1.1, opacity: 0 }}
                        onClick={startRecording}
                        disabled={isProcessing}
                        className="w-24 h-24 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 rounded-full flex items-center justify-center shadow-lg shadow-blue-900/20 transition-colors group"
                        id="start-recording"
                      >
                        <Mic className="text-white w-10 h-10 group-hover:scale-110 transition-transform" />
                      </motion.button>
                    ) : (
                      <motion.button
                        key="stop"
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 1.1, opacity: 0 }}
                        onClick={stopRecording}
                        className="w-24 h-24 bg-red-600 hover:bg-red-500 rounded-full flex items-center justify-center shadow-lg shadow-red-900/20 transition-colors group"
                        id="stop-recording"
                      >
                        <MicOff className="text-white w-10 h-10 group-hover:scale-110 transition-transform" />
                      </motion.button>
                    )}
                  </AnimatePresence>
                  
                  {isProcessing && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-24 h-24 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                
                <p className="mt-6 text-[11px] font-mono text-gray-400 uppercase tracking-widest">
                  {isProcessing ? 'Processing Audio...' : isRecording ? 'Listening...' : 'Tap to Record'}
                </p>
              </div>
            </section>

            {/* Error Message */}
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                {error}
              </motion.div>
            )}

            {/* Current Result Display */}
            <AnimatePresence>
              {(currentResult || isProcessing) && (
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">Live Output</h2>
                    {currentResult && (
                      <div className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-[10px] font-bold uppercase tracking-wider">
                        {currentResult.language}
                      </div>
                    )}
                  </div>

                  {isProcessing ? (
                    <div className="space-y-4 animate-pulse">
                      <div className="h-4 bg-gray-100 rounded w-3/4" />
                      <div className="h-4 bg-gray-100 rounded w-1/2" />
                      <div className="h-24 bg-gray-50 rounded w-full mt-8" />
                    </div>
                  ) : currentResult && (
                    <div className="space-y-8">
                      <div>
                        <label className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block mb-2">Transcription</label>
                        <p className="text-lg font-medium leading-relaxed italic text-gray-600">
                          "{currentResult.transcription}"
                        </p>
                      </div>
                      <div className="pt-8 border-t border-gray-100">
                        <label className="text-[10px] font-mono text-blue-400 uppercase tracking-widest block mb-2">English Translation</label>
                        <p className="text-2xl font-bold leading-tight text-[#151619]">
                          {currentResult.translation}
                        </p>
                      </div>
                    </div>
                  )}
                </motion.section>
              )}
            </AnimatePresence>
          </div>

          {/* Right Column: History */}
          <div className="lg:col-span-5">
            <section className="bg-white/50 rounded-2xl p-6 border border-gray-200 h-full flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-gray-400" />
                  <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">History</h2>
                </div>
                {history.length > 0 && (
                  <button 
                    onClick={clearHistory}
                    className="text-[10px] font-mono text-gray-400 hover:text-red-500 uppercase tracking-wider transition-colors"
                  >
                    Clear All
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                {history.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-12">
                    <History className="w-12 h-12 text-gray-200 mb-4" />
                    <p className="text-sm text-gray-400 italic">No translations yet</p>
                  </div>
                ) : (
                  history.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:border-blue-200 transition-colors group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] font-mono text-gray-400 uppercase">
                          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-[9px] font-bold text-blue-500 uppercase tracking-tighter">
                          {item.language}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-1 mb-1 italic">"{item.transcription}"</p>
                      <p className="text-sm font-semibold text-gray-800">{item.translation}</p>
                    </motion.div>
                  ))
                )}
              </div>
            </section>
          </div>
        </main>

        {/* Footer */}
        <footer className="mt-12 pt-8 border-t border-gray-200 flex items-center justify-between">
          <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">
            Ready for Input // System Online
          </p>
          <div className="flex gap-4">
            <Volume2 className="w-4 h-4 text-gray-300" />
            <Loader2 className="w-4 h-4 text-gray-300" />
          </div>
        </footer>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #E5E7EB;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #D1D5DB;
        }
      `}} />
    </div>
  );
}
