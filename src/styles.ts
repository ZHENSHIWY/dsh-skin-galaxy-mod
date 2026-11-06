/** Scoped presentation; menus and editors retain opaque readable surfaces. */
export const styles = `
[data-galaxy-sky] {
  position: fixed; inset: 0; z-index: 0; pointer-events: none; overflow: hidden;
  background: radial-gradient(ellipse at 75% 20%,#29376c80,transparent 55%),
    radial-gradient(ellipse at 35% 65%,#603f7455,transparent 55%),#040817;
}
[data-galaxy-sky] canvas { width: 100%; height: 100%; display: block; opacity: 0; }
body[data-galaxy-active] { background: #040817; isolation: isolate; }
body[data-galaxy-active] #root { position: relative; z-index: 1; }
/* The prose backing isolates glyphs from bright dust lanes without obscuring the sky. */
body[data-galaxy-active] [class*="_markdown_"] {
  background: rgba(14, 23, 44, 0.88);
  border: 1px solid rgba(183, 201, 255, 0.15);
  border-radius: 16px;
  padding: 18px 22px;
  color: var(--dsw-alias-label-primary);
}
body[data-galaxy-active] [class*="_markdown_"] :is(th, td) {
  border-color: rgba(183, 201, 255, 0.24);
}
@media (max-width: 700px) {
  body[data-galaxy-active] [class*="_markdown_"] { padding: 14px; }
}
body[data-galaxy-active] ::selection { background: #9a91ff66; color: #fff; }
body[data-galaxy-active] [data-galaxy-panel] {
  backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);
}
`;

/** Semantic palette consumed by DSH's theme presenter, including transparent layout fills. */
export const tokens = {
  '--dsw-alias-bg-base': 'transparent',
  '--dsw-alias-bg-layer-1': 'rgba(21,32,56,0.94)',
  '--dsw-alias-bg-layer-2': 'rgba(30,43,70,0.96)',
  '--dsw-alias-bg-layer-3': '#202b48',
  '--dsw-alias-bg-overlay': '#151c35',
  '--dsw-specific-sidebar-fill': 'rgba(18,28,49,0.94)',
  '--dsw-alias-border-l1': 'rgba(176,187,239,0.22)',
  '--dsw-alias-border-l2': 'rgba(176,187,239,0.17)',
  '--dsw-alias-border-l3': 'rgba(176,187,239,0.13)',
  '--dsw-alias-border-l4': 'rgba(176,187,239,0.09)',
  '--dsw-alias-brand-primary': '#b0a5ff',
  '--dsw-alias-label-primary': '#f4f6ff',
  '--dsw-alias-label-secondary': '#d1daf0',
  '--dsw-alias-label-tertiary': '#b5c3e2',
  '--dsw-alias-label-caption': '#bac8e7',
  '--dsw-alias-label-dimmed': '#6e7b9c',
  '--dsw-alias-label-primary-dimmed': '#a9b4d3',
  '--dsw-alias-label-primary-bluish': '#c1cded',
  '--dsw-alias-label-primary-foreground': '#11152d',
  '--dsw-alias-label-primary-inverted': '#11152d',
  '--dsw-alias-brand-text': '#bdb2ff',
  '--dsw-alias-brand-primary-invert': '#15182c',
  '--dsw-alias-button-primary-hover': '#c7bfff',
  '--dsw-alias-button-primary-dimmed': '#353953',
  '--dsw-alias-button-contrast-fill': '#a99ee9',
  '--dsw-alias-button-elevated-fill': '#18213b',
  '--dsw-alias-button-floating-fill': '#18213b',
  '--dsw-alias-button-floating-hover': '#263150',
  '--dsw-alias-button-ghost-active-fill': '#252b48',
  '--dsw-alias-button-ghost-active-hover': '#32395c',
  '--dsw-alias-interactive-bg-active': 'rgba(176,165,255,0.16)',
  '--dsw-alias-interactive-bg-hover': 'rgba(176,165,255,0.09)',
  '--dsw-alias-interactive-bg-hover-solid': '#242d48',
  '--dsw-alias-interactive-bg-hover-accent': 'rgba(176,165,255,0.20)',
  '--dsw-alias-link': '#b6baff',
  '--dsw-alias-menu-icon': '#c2cce8',
  '--dsw-menu-surface-fill': 'rgba(16,23,44,0.97)',
  '--dsw-specific-menu': 'rgba(16,23,44,0.97)',
  '--dsw-alias-menu-group-header-fill': '#1a233e',
  '--dsw-specific-input-major': 'rgba(23,35,59,0.97)',
  '--dsw-specific-login-input': '#17213b',
  '--dsw-specific-selector': '#202a46',
  '--dsw-specific-sidebar-nav-item-active': 'rgba(176,165,255,0.13)',
  '--dsw-specific-sidebar-nav-item-active-accent': 'rgba(176,165,255,0.20)',
  '--dsw-specific-bubble': 'rgba(39,44,77,0.88)',
  '--dsw-specific-bubble-highlight': '#3c4168',
  '--dsw-specific-tip': '#202a46',
  '--dsw-alias-markdown-code-block': '#0c1328',
  '--dsw-alias-markdown-code-block-banner': '#141e36',
  '--dsw-alias-markdown-inline-code': '#222b47',
  '--dsw-alias-markdown-code-segment-unselected': '#141e36',
  '--dsw-alias-markdown-code-segment-selected': '#283453',
  '--dsw-alias-markdown-citation': '#252e4c',
  '--dsw-alias-markdown-tag': '#252e4c',
  '--dsw-alias-markdown-placeholder': '#1a2440',
  '--dsw-alias-bg-document-preview': '#111a30',
  '--dsw-alias-label-document-preview': '#dce3fa',
  '--dsw-alias-bg-module-platform': '#141e36',
  '--dsw-alias-bg-multi-select': '#27314f',
  '--dsw-alias-settings-card-fill': 'rgba(16,23,47,0.86)',
};
