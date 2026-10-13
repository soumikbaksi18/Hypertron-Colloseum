import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#$%&*';
const SPOTS = [
  ['8%', '18%'],
  ['14%', '72%'],
  ['27%', '46%'],
  ['41%', '88%'],
  ['58%', '12%'],
  ['66%', '63%'],
  ['78%', '34%'],
  ['86%', '81%'],
] as const;

function glyph() {
  return CHARSET[Math.floor(Math.random() * CHARSET.length)];
}

export function AsciiField() {
  const reduce = useReducedMotion();
  const [glyphs, setGlyphs] = useState(() => SPOTS.map(() => glyph()));

  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => {
      setGlyphs((current) => current.map(() => glyph()));
    }, 1700);
    return () => window.clearInterval(id);
  }, [reduce]);

  return (
    <div aria-hidden className="dash-ascii pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {SPOTS.map(([top, left], index) => (
        <span key={`${top}-${left}`} className="dash-ascii-glyph" style={{ top, left }}>
          {glyphs[index]}
        </span>
      ))}
    </div>
  );
}
