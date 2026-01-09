import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import { getKeySymbol } from '@/lib/keyboard-utils';

interface AudioShortformPlayerProps {
  audioUrl: string;
  onTimeUpdate?: (currentTime: number) => void;
}

export const AudioShortformPlayer: React.FC<AudioShortformPlayerProps> = ({
  audioUrl,
  onTimeUpdate
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);

  // Load and decode audio for waveform
  useEffect(() => {
    const loadAudio = async () => {
      try {
        const response = await fetch(audioUrl);
        const arrayBuffer = await response.arrayBuffer();
        const audioContext = new AudioContext();
        const decoded = await audioContext.decodeAudioData(arrayBuffer);
        setAudioBuffer(decoded);
        audioContext.close();
      } catch (error) {
        console.error('Error loading audio:', error);
      }
    };

    if (audioUrl) {
      loadAudio();
    }
  }, [audioUrl]);

  // Draw waveform
  useEffect(() => {
    if (!audioBuffer || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const data = audioBuffer.getChannelData(0);
    const step = Math.ceil(data.length / width);
    const amp = height / 2;

    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1;
    ctx.beginPath();

    for (let i = 0; i < width; i++) {
      let min = 1.0;
      let max = -1.0;

      for (let j = 0; j < step; j++) {
        const datum = data[(i * step) + j];
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }

      const yLow = (1 + min) * amp;
      const yHigh = (1 + max) * amp;

      ctx.moveTo(i, yLow);
      ctx.lineTo(i, yHigh);
    }

    ctx.stroke();

    // Draw progress indicator
    const progress = currentTime / duration;
    ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';
    ctx.fillRect(0, 0, width * progress, height);

  }, [audioBuffer, currentTime, duration]);

  const togglePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const time = audioRef.current.currentTime;
      setCurrentTime(time);
      onTimeUpdate?.(time);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!audioRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickedTime = (x / canvas.width) * duration;

    audioRef.current.currentTime = clickedTime;
    setCurrentTime(clickedTime);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          {/* Play/Pause Button */}
          <Button
            onClick={togglePlayPause}
            size="lg"
            className="h-16 w-16 rounded-full"
            variant={isPlaying ? "default" : "outline"}
          >
            {isPlaying ? (
              <Pause className="h-8 w-8" />
            ) : (
              <Play className="h-8 w-8 ml-1" />
            )}
          </Button>

          {/* Waveform */}
          <div className="flex-1">
            <canvas
              ref={canvasRef}
              width={800}
              height={80}
              className="w-full h-20 cursor-pointer rounded-md border"
              onClick={handleCanvasClick}
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>

        {/* Hidden audio element */}
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
          preload="metadata"
        />
      </CardContent>
    </Card>
  );
};

const ShortcutHint: React.FC<{ combos: string[][]; label: string }> = ({ combos, label }) => (
  <div className="flex items-center gap-2">
    <ShortcutCombos combos={combos} />
    <span className="text-[10px] uppercase text-slate-400">→</span>
    <span>{label}</span>
  </div>
);

const ShortcutCombos: React.FC<{ combos: string[][] }> = ({ combos }) => (
  <div className="flex items-center gap-2">
    {combos.length > 1 ? (
      <KbdGroup>
        {combos.map((keys) => (
          <Kbd key={keys.join('+')}>
            {keys.map((keyLabel, keyIndex) => (
              <React.Fragment key={keyLabel}>
                {keyIndex > 0 && ' + '}
                {getKeySymbol(keyLabel)}
              </React.Fragment>
            ))}
          </Kbd>
        ))}
      </KbdGroup>
    ) : combos.length === 1 ? (
      <Kbd>
        {combos[0].map((keyLabel, keyIndex) => (
          <React.Fragment key={keyLabel}>
            {keyIndex > 0 && ' + '}
            {getKeySymbol(keyLabel)}
          </React.Fragment>
        ))}
      </Kbd>
    ) : null}
  </div>
);
