import type { Context } from '@deepseek-ai/cordis';
import type {} from '@deepseek-ai/dsh-client-ui-theme/client';
import { resolveConfig, type GalaxyConfig } from './config.ts';
import { mountGalaxy } from './renderer.ts';
import { showBootOverlay } from './boot.ts';
import { bootStyles } from './bootStyles.ts';
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
    style.dataset.plugin = 'dsh-skin-galaxy'; style.textContent = styles + bootStyles;
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
  if (config.bootAnimation) {
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    ctx.effect(() => showBootOverlay({ duration: config.bootDuration, revealDelay: config.bootRevealDelay, revealDuration: config.bootRevealDuration, reducedMotion }), 'galaxy: boot animation');
  }
  ctx.effect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'F11') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (document.fullscreenElement) void document.exitFullscreen();
      else void document.documentElement.requestFullscreen();
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, 'galaxy: fullscreen hotkey');
}
