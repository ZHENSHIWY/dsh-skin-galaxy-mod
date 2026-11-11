export const bootStyles = `
[data-galaxy-boot] {
  position: fixed; inset: 0; z-index: 2147483646; overflow: hidden;
  display: grid; place-items: center; pointer-events: auto;
  background-color: #02040c;
  background-image:
    radial-gradient(1.5px 1.5px at 16% 22%, rgba(255,255,255,.95), transparent 60%),
    radial-gradient(1px 1px at 31% 68%, rgba(200,215,255,.8), transparent 60%),
    radial-gradient(1.5px 1.5px at 48% 18%, rgba(255,255,255,.85), transparent 60%),
    radial-gradient(1px 1px at 62% 76%, rgba(190,205,255,.8), transparent 60%),
    radial-gradient(1px 1px at 78% 34%, rgba(255,255,255,.9), transparent 60%),
    radial-gradient(1.5px 1.5px at 88% 66%, rgba(210,220,255,.75), transparent 60%),
    radial-gradient(ellipse at 72% 20%, rgba(41,55,108,.55), transparent 55%),
    radial-gradient(ellipse at 35% 70%, rgba(96,63,116,.35), transparent 55%);
  animation: galaxy-boot-overlay var(--galaxy-boot-duration, 2000ms) ease-in-out forwards;
}
[data-galaxy-boot]::before {
  content: "星河";
  font-size: clamp(34px, 6vw, 72px);
  font-weight: 300;
  line-height: 1.1;
  letter-spacing: .42em;
  text-indent: .42em;
  color: #f2f4ff;
  text-shadow: 0 0 18px rgba(154,145,255,.9), 0 0 72px rgba(74,109,255,.45);
  opacity: 0;
  animation: galaxy-boot-title var(--galaxy-boot-duration, 2000ms) cubic-bezier(.2,.8,.2,1) forwards;
}
[data-galaxy-boot]::after {
  content: "";
  position: absolute; inset: -35%;
  background: linear-gradient(112deg, transparent 36%, rgba(120,155,255,.25) 44%, rgba(210,200,255,.85) 50%, rgba(120,155,255,.25) 56%, transparent 64%);
  transform: translateX(-65%) rotate(10deg);
  filter: blur(10px);
  opacity: 0;
  animation: galaxy-boot-band var(--galaxy-boot-duration, 2000ms) ease-out forwards;
}
@keyframes galaxy-boot-overlay {
  0%, 82% { opacity: 1; }
  100% { opacity: 0; }
}
@keyframes galaxy-boot-title {
  0% { opacity: 0; transform: translateY(12px) scale(.96); letter-spacing: .2em; }
  35%, 75% { opacity: 1; }
  75% { transform: translateY(0) scale(1); letter-spacing: .42em; }
  100% { opacity: 0; transform: translateY(-8px) scale(1.02); }
}
@keyframes galaxy-boot-band {
  0% { opacity: 0; transform: translateX(-65%) rotate(10deg); }
  20% { opacity: .9; }
  70% { opacity: .55; }
  100% { opacity: 0; transform: translateX(30%) rotate(10deg); }
}
@media (prefers-reduced-motion: reduce) {
  [data-galaxy-boot] { animation: galaxy-boot-overlay 450ms linear forwards; }
  [data-galaxy-boot]::before, [data-galaxy-boot]::after { animation: none; }
  [data-galaxy-boot]::before { opacity: 1; }
}

body[data-galaxy-boot-reveal="hidden"] #root {
  opacity: 0;
  pointer-events: none;
}
body[data-galaxy-boot-reveal="shown"] #root {
  opacity: 1;
  pointer-events: auto;
  transition: opacity var(--galaxy-reveal-duration, 800ms) ease-out;
}
body[data-galaxy-boot-reveal="hidden"] [class*="_sidebarCol"],
body[data-galaxy-boot-reveal="hidden"] [class*="_centerCol"],
body[data-galaxy-boot-reveal="hidden"] [class*="_rightbarCol"] {
  opacity: 0;
  transform: translateY(8px);
}
body[data-galaxy-boot-reveal="shown"] [class*="_sidebarCol"],
body[data-galaxy-boot-reveal="shown"] [class*="_centerCol"],
body[data-galaxy-boot-reveal="shown"] [class*="_rightbarCol"] {
  opacity: 1;
  transform: none;
  transition: opacity var(--galaxy-reveal-duration, 800ms) ease-out,
    transform var(--galaxy-reveal-duration, 800ms) ease-out;
}
body[data-galaxy-boot-reveal="shown"] [class*="_sidebarCol"] { transition-delay: 0ms; }
body[data-galaxy-boot-reveal="shown"] [class*="_centerCol"] { transition-delay: 120ms; }
body[data-galaxy-boot-reveal="shown"] [class*="_rightbarCol"] { transition-delay: 240ms; }
@media (prefers-reduced-motion: reduce) {
  body[data-galaxy-boot-reveal="shown"] #root,
  body[data-galaxy-boot-reveal="shown"] [class*="_sidebarCol"],
  body[data-galaxy-boot-reveal="shown"] [class*="_centerCol"],
  body[data-galaxy-boot-reveal="shown"] [class*="_rightbarCol"] {
    transition: none;
  }
}`;
