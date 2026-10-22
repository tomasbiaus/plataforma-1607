export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {
    colors: {
      background: 'var(--bg)',
      surface: { DEFAULT: 'var(--surface)', hover: 'var(--surface-hover)', raised: 'var(--surface-raised)' },
      border: { DEFAULT: 'var(--border)', hover: 'var(--border-hover)', subtle: 'var(--border-subtle)' },
      text: { primary: 'var(--text-primary)', secondary: 'var(--text-secondary)', muted: 'var(--text-muted)', subtle: 'var(--text-subtle)' },
      accent: { DEFAULT: 'var(--accent)', subtle: 'var(--accent-subtle)' },
      rojo: 'var(--rojo)', ink: 'var(--text-primary)',
    },
    fontFamily: { sans: ['HNLT', '"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'] },
    boxShadow: { xs: '0 1px 2px rgba(26,26,26,.06)' },
  } },
  plugins: [],
};
