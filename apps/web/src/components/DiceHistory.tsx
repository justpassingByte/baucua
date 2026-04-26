import { useGameStore } from '../store/gameStore';
import type { Symbol } from '../store/gameStore';

const SYMBOL_IMAGE: Record<Symbol, string> = {
  BAU: '/art/symbols/bau.png',
  CUA: '/art/symbols/cua.png',
  TOM: '/art/symbols/tom.png',
  CA: '/art/symbols/ca.png',
  GA: '/art/symbols/ga.png',
  NAI: '/art/symbols/nai.png',
};

export default function DiceHistory() {
  const { diceHistory } = useGameStore();

  if (!diceHistory || diceHistory.length === 0) {
    return null;
  }

  // Show up to the last 5 rounds
  const recentHistory = [...diceHistory].sort((a, b) => b.roundNumber - a.roundNumber).slice(0, 5);

  return (
    <div className="glass-card p-4 space-y-3 mt-3">
      <div className="flex items-center gap-2">
        <h3 className="flex items-center gap-2 text-sm font-heading font-bold tracking-wider text-white/75 uppercase">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/8 text-base">📜</span> Dice Log
        </h3>
      </div>
      <div className="space-y-2">
        {recentHistory.map((entry) => (
          <div key={entry.roundNumber} className="flex items-center justify-between bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2">
            <span className="text-xs font-heading font-bold text-accent-gold whitespace-nowrap">Vòng {entry.roundNumber > 0 ? entry.roundNumber : '—'}</span>
            <div className="flex gap-2">
              {entry.result.map((sym, idx) => (
                <div key={idx} className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-[#f7f5ef] border border-[#1b9fd8] p-0.5 shadow-sm">
                  <img src={SYMBOL_IMAGE[sym]} alt={sym} className="w-full h-full object-contain" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
