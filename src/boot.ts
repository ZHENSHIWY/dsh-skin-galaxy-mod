/** Full-screen, skippable galaxy intro followed by a background-only hold and UI reveal. */
export interface BootOptions {
  duration: number;
  revealDelay: number;
  revealDuration: number;
  reducedMotion: boolean;
}

export function showBootOverlay(options: BootOptions): () => void {
  const { reducedMotion } = options;
  const duration = reducedMotion ? Math.min(options.duration, 450) : options.duration;
  const revealDelay = reducedMotion ? 0 : options.revealDelay;
  const revealDuration = reducedMotion ? 180 : options.revealDuration;
  const overlay = document.createElement('div');
  overlay.dataset.galaxyBoot = '';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.style.setProperty('--galaxy-boot-duration', `${duration}ms`);
  if (reducedMotion) overlay.dataset.galaxyBootReduced = '';
  document.body.append(overlay);
  document.body.dataset.galaxyBootReveal = 'hidden';
  document.body.style.setProperty('--galaxy-reveal-duration', `${revealDuration}ms`);

  let overlayRemoved = false;
  let revealed = false;
  let overlayTimer = 0;
  let revealTimer = 0;
  let cleanupTimer = 0;

  const removeOverlay = (): void => {
    if (overlayRemoved) return;
    overlayRemoved = true;
    overlay.remove();
  };

  const cleanupListeners = (): void => {
    window.removeEventListener('keydown', onKeyDown, true);
    window.removeEventListener('pointerdown', onSkip, true);
    overlay.removeEventListener('pointerdown', onSkip);
  };

  const finish = (): void => {
    if (revealed) return;
    revealed = true;
    clearTimeout(overlayTimer);
    clearTimeout(revealTimer);
    removeOverlay();
    cleanupListeners();
    document.body.dataset.galaxyBootReveal = 'shown';
    cleanupTimer = setTimeout(() => {
      if (document.body.dataset.galaxyBootReveal === 'shown') delete document.body.dataset.galaxyBootReveal;
      document.body.style.removeProperty('--galaxy-reveal-duration');
    }, revealDuration + 100);
  };

  const onSkip = (event: Event): void => {
    event.preventDefault();
    event.stopImmediatePropagation();
    finish();
  };
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' && event.key !== 'Enter' && event.key !== ' ') return;
    onSkip(event);
  };

  overlay.addEventListener('pointerdown', onSkip);
  window.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('pointerdown', onSkip, true);
  overlayTimer = setTimeout(() => {
    removeOverlay();
    revealTimer = setTimeout(finish, revealDelay);
  }, duration);

  return () => {
    clearTimeout(overlayTimer);
    clearTimeout(revealTimer);
    clearTimeout(cleanupTimer);
    removeOverlay();
    cleanupListeners();
    delete document.body.dataset.galaxyBootReveal;
    document.body.style.removeProperty('--galaxy-reveal-duration');
  };
}