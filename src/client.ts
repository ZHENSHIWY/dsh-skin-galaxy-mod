import type { Context } from '@deepseek-ai/cordis';
import type {} from '@deepseek-ai/dsh-client-ui-theme/client';
import { resolveConfig, type GalaxyConfig } from './config.ts';
import { mountGalaxy } from './renderer.ts';
import { styles, tokens } from './styles.ts';

/** Required browser service: the supported theme registry. */
export const inject = ['theme'];

/** Layer the skin over either palette without changing the saved appearance preference. */
export function apply(ctx: Context, input: Partial<GalaxyConfig> = {}): void {
  const config = resolveConfig(input);
  const overrides = Object.fromEntries(Object.entries(tokens).map(([key,value]) => [key,{light:value,dark:value}]));
  ctx.effect(() => ctx.theme.overrideTokens('dsh-skin-galaxy',overrides), 'galaxy: palette');
  ctx.effect(() => {
    const style = document.createElement('style');
    style.dataset.plugin = 'dsh-skin-galaxy'; style.textContent = styles;
    document.head.append(style);
    const sky = document.createElement('div'); sky.dataset.galaxySky = '';
    sky.setAttribute('aria-hidden','true');
    const canvas = document.createElement('canvas'); sky.append(canvas);
    document.body.prepend(sky); document.body.dataset.galaxyActive = '';
    const stop = mountGalaxy(canvas,config);
    return () => {
      stop(); sky.remove(); style.remove();
      delete document.body.dataset.galaxyActive;
    };
  }, 'galaxy: presentation');
}
