/** Rendering controls accepted by the plugin's config row. */
export interface GalaxyConfig {
  speed: number;
  intensity: number;
  pixelRatio: number;
  fps: number;
  meteorInterval: number;
}

/** Validate deployment controls before allocating GPU resources. */
export function resolveConfig(input: Partial<GalaxyConfig> = {}): GalaxyConfig {
  const result = { speed: 0.65, intensity: 0.8, pixelRatio: 1.25, fps: 30, meteorInterval: 10, ...input };
  const ranges = { speed: [0, 2], intensity: [0, 2], pixelRatio: [0.5, 2], fps: [1, 60], meteorInterval: [3, 60] } as const;
  for (const key of Object.keys(ranges) as (keyof GalaxyConfig)[]) {
    const [min, max] = ranges[key];
    if (!Number.isFinite(result[key]) || result[key] < min || result[key] > max) {
      throw new Error(`星河: config.${key} must be a finite number between ${min} and ${max}`);
    }
  }
  return result;
}
