import { useEffect, useState } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { CASSETTES } from '@/data/cassettes';

// Triggers the "Ночь Светлячков" finale once the player has collected
// most of the cassettes (excluding the final one itself).
export function FinaleOverlay() {
  const cassettes = useGameStore((s) => s.cassettes);
  const flags = useGameStore((s) => s.flags);
  const setFlag = useGameStore((s) => s.setFlag);
  const unlockCassette = useGameStore((s) => s.unlockCassette);
  const setCurrentCassette = useGameStore((s) => s.setCurrentCassette);
  const [active, setActive] = useState(false);

  const collected = cassettes.filter((c) => c !== 'final-fireflies').length;
  const needed = CASSETTES.length - 1; // excluding final
  const earned = collected >= Math.max(3, needed - 1);

  useEffect(() => {
    if (earned && !flags.finaleSeen) {
      setActive(true);
      setFlag('finaleSeen');
      unlockCassette('final-fireflies');
      setCurrentCassette('final-fireflies');
      const t = window.setTimeout(() => setActive(false), 14000);
      return () => window.clearTimeout(t);
    }
  }, [earned, flags.finaleSeen, setFlag, unlockCassette, setCurrentCassette]);

  if (!active) return null;
  return (
    <div className="absolute inset-0 z-[60] pointer-events-none animate-fade-in">
      <div className="absolute inset-0 bg-gradient-to-b from-night-900/85 via-dusk-700/60 to-night-900/85" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,rgba(255,210,140,0.35),transparent_55%)]" />
      <div className="film-grain" />
      <div className="absolute inset-x-0 top-[24%] text-center px-6">
        <p className="font-cozy text-xs uppercase tracking-[0.4em] text-ember-300/80">
          финал
        </p>
        <h1 className="font-title text-6xl text-dusk-50 title-glow mt-2">
          Ночь Светлячков
        </h1>
        <p className="font-title text-2xl text-dusk-100 mt-2">
          лето никогда не закончится
        </p>
        <p className="text-sm text-dusk-100/75 mt-4 max-w-xl mx-auto leading-relaxed">
          Тысячи огоньков поднимаются над крышей. Все собрались здесь —
          и кажется, что этот вечер будет помниться дольше, чем все остальные.
          Рыжик мурчит, прижавшись к Лёхе. Маг улыбается. Где-то играет
          самая важная кассета.
        </p>
      </div>
    </div>
  );
}
