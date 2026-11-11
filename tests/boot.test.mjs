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
  let timerFn, timerMs = 0, cleared = 0;
  save('document', { createElement: () => overlay, body: { appended: [], append(node) { this.appended.push(node); } } });
  save('window', { listeners: {}, addEventListener(type, fn) { this.listeners[type] = fn; }, removeEventListener(type) { delete this.listeners[type]; } });
  save('setTimeout', (fn, ms) => { timerFn = fn; timerMs = ms; return 7; });
  save('clearTimeout', () => { cleared += 1; });
  return {
    overlay,
    get timerFn() { return timerFn; },
    get timerMs() { return timerMs; },
    get cleared() { return cleared; },
    restore() { for (const [key, descriptor] of saved) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; } },
  };
}

test('boot overlay is skippable and has an idempotent cleanup', () => {
  const f = fixture();
  try {
    const cleanup = showBootOverlay(2000, false);
    assert.equal(f.overlay.dataset.galaxyBoot, '');
    assert.equal(f.overlay.style.props['--galaxy-boot-duration'], '2000ms');
    assert.equal(typeof f.timerFn, 'function');
    f.overlay.listeners.pointerdown();
    assert.equal(f.overlay.removed, 1);
    assert.equal(f.overlay.listeners.pointerdown, undefined);
    cleanup();
    assert.equal(f.overlay.removed, 1);
    assert.ok(f.cleared >= 1);
  } finally { f.restore(); }
});

test('boot overlay auto-closes and reduced motion shortens its timer', () => {
  const f = fixture();
  try {
    showBootOverlay(3000, true);
    assert.equal(f.overlay.dataset.galaxyBootReduced, '');
    assert.equal(f.timerMs, 450);
    f.timerFn();
    assert.equal(f.overlay.removed, 1);
  } finally { f.restore(); }
});
