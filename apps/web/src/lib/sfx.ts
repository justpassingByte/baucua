type SfxKey = 'bet' | 'win' | 'lose' | 'rolling' | 'reveal';

const SFX_SRC: Record<SfxKey, string> = {
  bet: '/audio/sfx/bet.mp3',
  win: '/audio/sfx/win.mp3',
  lose: '/audio/sfx/lose.mp3',
  rolling: '/audio/sfx/rolling.mp3',
  reveal: '/audio/sfx/reveal.mp3',
};

export function playSfx(key: SfxKey, volume = 0.5) {
  if (typeof window === 'undefined') return;

  const audio = new Audio(SFX_SRC[key]);
  audio.preload = 'auto';
  audio.volume = volume;
  void audio.play().catch(() => {
    // Ignore autoplay / missing-file failures.
  });
}

export const SFX_FILES = SFX_SRC;
