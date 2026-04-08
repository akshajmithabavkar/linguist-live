import { motion } from "motion/react";
import { useEffect, useState } from "react";

interface AudioVisualizerProps {
  isRecording: boolean;
  stream: MediaStream | null;
}

export default function AudioVisualizer({ isRecording, stream }: AudioVisualizerProps) {
  const [bars, setBars] = useState<number[]>(new Array(20).fill(10));

  useEffect(() => {
    if (!isRecording || !stream) {
      setBars(new Array(20).fill(10));
      return;
    }

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    analyser.fftSize = 64;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    let animationFrameId: number;

    const updateBars = () => {
      analyser.getByteFrequencyData(dataArray);
      // Map the frequency data to 20 bars
      const newBars = Array.from({ length: 20 }, (_, i) => {
        const value = dataArray[i % bufferLength];
        return Math.max(10, (value / 255) * 60);
      });
      setBars(newBars);
      animationFrameId = requestAnimationFrame(updateBars);
    };

    updateBars();

    return () => {
      cancelAnimationFrame(animationFrameId);
      audioContext.close();
    };
  }, [isRecording, stream]);

  return (
    <div className="flex items-center justify-center gap-1 h-16">
      {bars.map((height, i) => (
        <motion.div
          key={i}
          id={`bar-${i}`}
          className="w-1.5 bg-blue-500 rounded-full"
          animate={{ height }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        />
      ))}
    </div>
  );
}
