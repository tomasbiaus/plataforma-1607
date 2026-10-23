export default {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {
    colors: {
      background: 'var(--bg)',
      sidebar: 'var(--sidebar)', column: 'var(--column)',
      'on-ink': 'var(--on-ink)', 'ink-hover': 'var(--ink-hover)', 'rojo-hover': 'var(--rojo-hover)',
      ok: { DEFAULT: 'var(--ok)', bg: 'var(--ok-bg)', fg: 'var(--ok-fg)' },
      warn: { DEFAULT: 'var(--warn)', bg: 'var(--warn-bg)', fg: 'var(--warn-fg)' },
      err: { bg: 'var(--err-bg)', fg: 'var(--err-fg)' },
      info: { DEFAULT: 'var(--info)', bg: 'var(--info-bg)', fg: 'var(--info-fg)' },
      overlay: 'var(--overlay)',
      surface: { DEFAULT: 'var(--surface)', hover: 'var(--surface-hover)', raised: 'var(--surface-raised)' },
      border: { DEFAULT: 'var(--border)', hover: 'var(--border-hover)', subtle: 'var(--border-subtle)' },
      text: { primary: 'var(--text-primary)', secondary: 'var(--text-secondary)', muted: 'var(--text-muted)', subtle: 'var(--text-subtle)' },
      accent: { DEFAULT: 'var(--accent)', subtle: 'var(--accent-subtle)' },
      rojo: 'rgb(var(--rojo-rgb) / <alpha-value>)', ink: 'var(--text-primary)',
    },
    fontFamily: { sans: ['HNLT', '"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'] },
    boxShadow: { xs: '0 1px 2px rgba(26,26,26,.06)' },
  } },
  plugins: [],
};
