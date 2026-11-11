import { test } from 'node:test';
import assert from 'node:assert/strict';
import { showBootOverlay } from '../src/boot.ts';

function fixture() {
  const saved = new Map();
  const save = (key, value) => {
    saved.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  };
  const overlay = {
    dataset: {},
    style: { props: {}, setProperty(key, value) { this.props[key] = value; } },
    setAttribute() {},
    listeners: {},
    addEventListener(type, fn) { this.listeners[type] = fn; },
    removeEventListener(type) { delete this.listeners[type]; },
    removed: 0,
    remove() { this.removed += 1; },
  };
  const body = {
    dataset: {},
    style: { props: {}, setProperty(key, value) { this.props[key] = value; }, removeProperty(key) { delete this.props[key]; } },
    appended: [],
    append(node) { this.appended.push(node); },
  };
  const timers = new Map();
  let nextTimer = 1;
  save('document', { createElement: () => overlay, body });
  save('window', { listeners: {}, addEventListener(type, fn) { this.listeners[type] = fn; }, removeEventListener(type) { delete this.listeners[type]; } });
  save('setTimeout', (fn, ms) => { const id = nextTimer++; timers.set(id, { fn, ms }); return id; });
  save('clearTimeout', (id) => { timers.delete(id); });
  return {
    overlay,
    body,
    get timers() { return [...timers.values()]; },
    runNext() {
      const first = timers.entries().next().value;
      if (!first) return undefined;
      const [id, timer] = first;
      timers.delete(id);
      timer.fn();
      return timer.ms;
    },
    restore() { for (const [key, descriptor] of saved) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; } },
  };
}

test('boot sequence is skippable and cleans its reveal state', () => {
  const f = fixture();
  try {
    const cleanup = showBootOverlay({ duration: 2000, revealDelay: 1200, revealDuration: 800, reducedMotion: false });
    assert.equal(f.body.dataset.galaxyBootReveal, 'hidden');
    assert.equal(f.body.style.props['--galaxy-reveal-duration'], '800ms');
    assert.equal(f.timers[0].ms, 2000);
    f.overlay.listeners.pointerdown({ preventDefault() {}, stopImmediatePropagation() {} });
    assert.equal(f.overlay.removed, 1);
    assert.equal(f.overlay.listeners.pointerdown, undefined);
    assert.equal(f.body.dataset.galaxyBootReveal, 'shown');
    assert.equal(f.runNext(), 900);
    assert.equal(f.body.dataset.galaxyBootReveal, undefined);
    assert.equal(f.body.style.props['--galaxy-reveal-duration'], undefined);
    cleanup();
    assert.equal(f.overlay.removed, 1);
  } finally { f.restore(); }
});

test('boot sequence holds the full background before revealing the UI', () => {
  const f = fixture();
  try {
    showBootOverlay({ duration: 2000, revealDelay: 1200, revealDuration: 800, reducedMotion: false });
    assert.equal(f.runNext(), 2000);
    assert.equal(f.overlay.removed, 1);
    assert.equal(f.body.dataset.galaxyBootReveal, 'hidden');
    assert.equal(f.runNext(), 1200);
    assert.equal(f.body.dataset.galaxyBootReveal, 'shown');
    assert.equal(f.runNext(), 900);
    assert.equal(f.body.dataset.galaxyBootReveal, undefined);
  } finally { f.restore(); }
});

test('reduced motion shortens the intro and skips the background hold', () => {
  const f = fixture();
  try {
    showBootOverlay({ duration: 3000, revealDelay: 1200, revealDuration: 800, reducedMotion: true });
    assert.equal(f.overlay.dataset.galaxyBootReduced, '');
    assert.equal(f.body.style.props['--galaxy-reveal-duration'], '180ms');
    assert.equal(f.runNext(), 450);
    assert.equal(f.body.dataset.galaxyBootReveal, 'hidden');
    assert.equal(f.runNext(), 0);
    assert.equal(f.body.dataset.galaxyBootReveal, 'shown');
  } finally { f.restore(); }
});
