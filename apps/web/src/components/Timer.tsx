import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface TimerProps {
  endsAt: number;
  active: boolean;
}

export default function Timer({ endsAt, active }: TimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (!active) { setSecondsLeft(0); return; }
    const update = () => {
      const left = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setSecondsLeft(left);
    };
    update();
    const iv = setInterval(update, 200);
    return () => clearInterval(iv);
  }, [endsAt, active]);

  if (!active && secondsLeft <= 0) return null;

  const total = 30;
  const pct = Math.min(1, secondsLeft / total);
  const circumference = 2 * Math.PI * 45;
  const offset = circumference * (1 - pct);
  const isUrgent = secondsLeft <= 5;

  return (
    <motion.div className="relative flex items-center justify-center"
      initial={{ scale: 0 }} animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 200 }}>
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
        <circle cx="50" cy="50" r="45" fill="none"
          stroke={isUrgent ? '#FC5C65' : '#F6AD55'}
          strokeWidth="4" strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dashoffset 0.3s linear, stroke 0.3s' }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.span
          className={`font-heading font-bold text-2xl ${isUrgent ? 'text-accent-red-bright' : 'text-accent-gold'}`}
          animate={isUrgent ? { scale: [1, 1.15, 1] } : {}}
          transition={isUrgent ? { duration: 0.5, repeat: Infinity } : {}}>
          {secondsLeft}
        </motion.span>
      </div>
    </motion.div>
  );
}
