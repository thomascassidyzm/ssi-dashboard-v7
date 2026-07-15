// Registry of monthly SSi board reports. Each entry renders at
// /admin/board/:slug as the standalone styled HTML report, unmodified.
// Interim solution — a living, auto-generated board report is being
// designed separately; this registry is a manual list until then.
export const boardReports = [
  {
    slug: '2026-07',
    title: 'Board report — mid-June to 14 July 2026',
    period: 'Mid-June to 14 July 2026',
    date: '2026-07-14',
    // Vite raw import - bundles the standalone HTML report as a string.
    loader: () => import('./board-reports/2026-07.html?raw')
  }
]
