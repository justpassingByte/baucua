import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../lib/api';
import { useGameStore } from '../store/gameStore';

const SYMBOL_DISPLAY = [
  { emoji: '🍐', vi: 'Bầu', delay: 0 },
  { emoji: '🦀', vi: 'Cua', delay: 0.1 },
  { emoji: '🦐', vi: 'Tôm', delay: 0.2 },
  { emoji: '🐟', vi: 'Cá', delay: 0.3 },
  { emoji: '🐓', vi: 'Gà', delay: 0.4 },
  { emoji: '🦌', vi: 'Nai', delay: 0.5 },
];

export default function Home() {
  const navigate = useNavigate();
  const { setIdentity, setRoom } = useGameStore();

  const [mode, setMode] = useState<'idle' | 'create' | 'join'>('idle');
  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) return setError('Nhập tên của bạn');
    setLoading(true);
    setError('');
    const res = await api.createRoom(name.trim());
    if (res.success && res.data) {
      const { room, playerId } = res.data as any;
      setIdentity(playerId, name.trim(), true);
      setRoom(room);
      navigate(`/room/${room.id}`);
    } else {
      setError(res.error || 'Không tạo được phòng');
    }
    setLoading(false);
  };

  const handleJoin = async () => {
    if (!name.trim()) return setError('Nhập tên của bạn');
    if (!joinCode.trim()) return setError('Nhập mã phòng');
    setLoading(true);
    setError('');
    const res = await api.joinRoom(joinCode.trim().toUpperCase(), name.trim()) as any;
    if (res.success && res.data) {
      const { room, playerId } = res.data;
      setIdentity(playerId, name.trim(), false);
      setRoom(room);
      if (res.reconnected) {
        // Briefly show reconnect message before navigating
        setError('🔄 Đã kết nối lại — chips của bạn vẫn còn!');
        setTimeout(() => navigate(`/room/${room.id}`), 900);
      } else {
        navigate(`/room/${room.id}`);
      }
    } else {
      setError(res.error || 'Không vào được phòng');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 py-8">
      {/* Floating symbols background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {SYMBOL_DISPLAY.map((s, i) => (
          <motion.div
            key={i}
            className="absolute text-5xl opacity-[0.06]"
            style={{
              left: `${10 + i * 15}%`,
              top: `${15 + (i % 3) * 25}%`,
            }}
            animate={{
              y: [0, -20, 0],
              rotate: [0, 10, -10, 0],
            }}
            transition={{
              duration: 4 + i * 0.5,
              repeat: Infinity,
              delay: s.delay * 3,
            }}
          >
            {s.emoji}
          </motion.div>
        ))}
      </div>

      {/* Logo */}
      <motion.div
        className="text-center mb-10"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        <h1 className="font-display text-5xl md:text-7xl text-shimmer mb-3 tracking-wide">
          BẦU CUA
        </h1>
        <p className="font-heading text-white/40 text-sm md:text-base tracking-[0.3em] uppercase">
          Vietnamese Dice Game
        </p>
        <div className="flex justify-center gap-3 mt-5">
          {SYMBOL_DISPLAY.map((s, i) => (
            <motion.span
              key={i}
              className="text-2xl md:text-3xl"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + s.delay, type: 'spring', stiffness: 200 }}
            >
              {s.emoji}
            </motion.span>
          ))}
        </div>
      </motion.div>

      {/* Action Card */}
      <motion.div
        className="glass-card w-full max-w-md p-6 md:p-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
      >
        {mode === 'idle' && (
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <button
              onClick={() => setMode('create')}
              className="btn-gold w-full text-lg"
            >
              🎲 Tạo Phòng Mới
            </button>
            <button
              onClick={() => setMode('join')}
              className="btn-outline w-full text-lg"
            >
              🚪 Vào Phòng
            </button>
          </motion.div>
        )}

        {mode !== 'idle' && (
          <motion.div
            className="space-y-5"
            initial={{ opacity: 0, x: mode === 'create' ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <button
                onClick={() => { setMode('idle'); setError(''); }}
                className="text-white/50 hover:text-white transition-colors text-xl"
              >
                ←
              </button>
              <h2 className="font-heading font-bold text-xl text-white">
                {mode === 'create' ? '🎲 Tạo Phòng' : '🚪 Vào Phòng'}
              </h2>
            </div>

            <div>
              <label className="block text-white/50 text-sm font-body mb-2">
                Tên của bạn
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nhập tên..."
                maxLength={20}
                className="w-full bg-surface-800 border border-white/10 rounded-xl px-4 py-3
                           text-white placeholder-white/20 font-body
                           focus:outline-none focus:border-accent-gold/50 focus:ring-1 focus:ring-accent-gold/30
                           transition-all duration-300"
                autoFocus
              />
            </div>

            {mode === 'join' && (
              <div>
                <label className="block text-white/50 text-sm font-body mb-2">
                  Mã phòng
                </label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="VD: ABC123"
                  maxLength={6}
                  className="w-full bg-surface-800 border border-white/10 rounded-xl px-4 py-3
                             text-white placeholder-white/20 font-body text-center tracking-[0.4em] text-xl
                             focus:outline-none focus:border-accent-gold/50 focus:ring-1 focus:ring-accent-gold/30
                             transition-all duration-300 uppercase"
                />
              </div>
            )}

            {error && (
              <motion.p
                className="text-accent-red text-sm font-body text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {error}
              </motion.p>
            )}

            <button
              onClick={mode === 'create' ? handleCreate : handleJoin}
              disabled={loading}
              className="btn-gold w-full text-lg flex items-center justify-center gap-2"
            >
              {loading ? (
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  className="inline-block"
                >
                  ⏳
                </motion.span>
              ) : mode === 'create' ? (
                '✨ Tạo Phòng'
              ) : (
                '🎮 Vào Chơi'
              )}
            </button>
          </motion.div>
        )}
      </motion.div>

      {/* Footer */}
      <motion.p
        className="mt-8 text-white/20 text-xs font-body"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        Chơi vui — không cá cược thật 🎉
      </motion.p>
    </div>
  );
}
