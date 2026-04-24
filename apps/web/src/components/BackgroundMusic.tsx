import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

const STORAGE_KEY = 'baucua:bgm-enabled';
const BGM_SRC = '/audio/bgm.mp3';

export default function BackgroundMusic() {
  const [enabled, setEnabled] = useState(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw == null ? true : raw === '1';
    } catch {
      return true;
    }
  });
  const [started, setStarted] = useState(false);
  const [available, setAvailable] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const armedRef = useRef(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0');
    } catch {
      // Ignore storage failures.
    }
  }, [enabled]);

  useEffect(() => {
    const audio = new Audio(BGM_SRC);
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = 0.18;
    audioRef.current = audio;

    const onCanPlay = () => setAvailable(true);
    const onError = () => {
      setAvailable(false);
      setStarted(false);
    };

    audio.addEventListener('canplaythrough', onCanPlay);
    audio.addEventListener('error', onError);

    return () => {
      audio.pause();
      audio.src = '';
      audio.removeEventListener('canplaythrough', onCanPlay);
      audio.removeEventListener('error', onError);
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      stopMusic();
      return;
    }

    const startOnGesture = async () => {
      if (armedRef.current) return;
      armedRef.current = true;
      await startMusic();
    };

    window.addEventListener('pointerdown', startOnGesture, { once: true });
    window.addEventListener('keydown', startOnGesture, { once: true });
    window.addEventListener('touchstart', startOnGesture, { once: true });

    return () => {
      window.removeEventListener('pointerdown', startOnGesture);
      window.removeEventListener('keydown', startOnGesture);
      window.removeEventListener('touchstart', startOnGesture);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  useEffect(() => {
    return () => stopMusic();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startMusic = async () => {
    if (!enabled || !available) return;
    const audio = audioRef.current;
    if (!audio) return;

    try {
      await audio.play();
      setStarted(true);
    } catch {
      setStarted(false);
      setAvailable(false);
    }
  };

  const stopMusic = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    armedRef.current = false;
    setStarted(false);
  };

  return (
    <motion.button
      type="button"
      onClick={() => {
        const next = !enabled;
        setEnabled(next);
        if (next) {
          void startMusic();
        } else {
          stopMusic();
        }
      }}
      className="fixed bottom-4 right-4 z-40 rounded-full border border-white/10 bg-surface-900/90 px-4 py-2 text-xs font-heading text-white/80 shadow-lg backdrop-blur-md transition hover:text-white"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {enabled ? (started ? '♪ Nhạc nền' : '♪ Bật nhạc') : '♪ Tắt nhạc'}
    </motion.button>
  );
}
