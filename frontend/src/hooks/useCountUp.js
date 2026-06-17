import { useEffect, useRef, useState } from "react";

/** Count from 0 → target over `duration` ms with easeOutCubic. */
export function useCountUp(target, duration = 1200) {
  const [value, setValue] = useState(0);
  const startTime = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    startTime.current = null;
    const t = Number(target) || 0;
    if (t === 0) { setValue(0); return; }

    const step = (ts) => {
      if (!startTime.current) startTime.current = ts;
      const p = Math.min(1, (ts - startTime.current) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(t * eased);
      if (p < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return value;
}
