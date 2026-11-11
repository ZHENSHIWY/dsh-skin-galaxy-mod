/** Full-screen, skippable galaxy intro. Returns an idempotent cleanup. */
export function showBootOverlay(duration: number, reducedMotion: boolean): () => void {
  const overlay = document.createElement('div');
  overlay.dataset.galaxyBoot = '';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.style.setProperty('--galaxy-boot-duration', `${duration}ms`);
  if (reducedMotion) overlay.dataset.galaxyBootReduced = '';
  document.body.append(overlay);

  let finished = false;
  let timer = 0;

  const finish = (): void => {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    window.removeEventListener('keydown', onKeyDown, true);
    overlay.removeEventListener('pointerdown', onPointerDown);
    overlay.remove();
  };

  const onPointerDown = (): void => finish();
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' && event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    finish();
  };

  overlay.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('keydown', onKeyDown, true);
  timer = setTimeout(finish, reducedMotion ? Math.min(duration, 450) : duration);
  return finish;
}