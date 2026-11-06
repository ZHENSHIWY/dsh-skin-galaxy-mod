/** One transient streak in coordinates normalized by viewport height. */
interface MeteorFrame {
  x: number;
  y: number;
  dx: number;
  dy: number;
  tail: number;
  width: number;
  strength: number;
}

/** A visible-time scheduler; hidden tabs do not advance its clock or queue bursts. */
export function createMeteorTimeline(interval: number, random: () => number = Math.random) {
  let nextAt: number | undefined;
  let active: { start: number; duration: number; distance: number; frame: MeteorFrame } | undefined;
  return (now: number, aspect: number): MeteorFrame | undefined => {
    if (nextAt === undefined) {
      nextAt = now + interval * (0.7 + random() * 0.9);
      return undefined;
    }
    if (active && now - active.start >= active.duration) active = undefined;
    if (!active && now >= nextAt) {
      const angle = random() * Math.PI * 2;
      const dx = Math.cos(angle), dy = Math.sin(angle);
      const centerX = (random() - 0.5) * aspect * 0.82;
      const centerY = (random() - 0.5) * 0.7;
      // Keep both ends inside the viewport, including portrait windows.
      const roomX = (aspect * 0.5 - Math.abs(centerX) - aspect * 0.06) / Math.max(Math.abs(dx), 0.001);
      const roomY = (0.5 - Math.abs(centerY) - 0.06) / Math.max(Math.abs(dy), 0.001);
      const distance = Math.min(0.55 + random() * 0.3, roomX * 2, roomY * 2);
      const duration = 0.85 + random() * 0.5;
      active = {
        start: now, duration, distance,
        frame: {
          x: centerX - dx * distance * 0.5, y: centerY - dy * distance * 0.5,
          dx, dy, tail: Math.min(0.22, distance * 0.45), width: 0.0014 + random() * 0.0008, strength: 0,
        },
      };
      nextAt = now + duration + interval * (0.7 + random() * 0.9);
    }
    if (!active) return undefined;
    const progress = (now - active.start) / active.duration;
    return {
      ...active.frame,
      x: active.frame.x + active.frame.dx * active.distance * progress,
      y: active.frame.y + active.frame.dy * active.distance * progress,
      strength: Math.pow(Math.sin(progress * Math.PI), 0.7) * 0.9,
    };
  };
}
