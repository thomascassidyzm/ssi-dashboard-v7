/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Semantic theme tokens (light/dark via CSS vars in src/style.css). Convert hardcoded
      // slate-* utilities to these so one [data-theme] flip re-themes the surface.
      colors: {
        canvas: 'var(--canvas)',         // page background    (was slate-900)
        surface: 'var(--surface)',       // cards / panels     (was slate-800)
        'surface-2': 'var(--surface-2)', // raised / inputs    (was slate-700)
        'surface-3': 'var(--surface-3)', // hover / active     (was slate-600)
        line: 'var(--line)',             // borders / dividers (was slate-700/600)
        ink: 'var(--ink)',               // primary text       (was slate-100/200/300)
        muted: 'var(--muted)',           // secondary text     (was slate-400)
        faint: 'var(--faint)',           // tertiary text      (was slate-500/600)
        accent: 'var(--accent)',         // brand orange
        'accent-2': 'var(--accent-2)',   // brand green
        success: 'var(--success)',
        danger: 'var(--danger)',
      },
    },
  },
  plugins: [],
}
