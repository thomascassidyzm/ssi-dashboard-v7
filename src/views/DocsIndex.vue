<template>
  <div class="docs-hub">
    <!-- Ambient Background -->
    <div class="ambient-bg">
      <div class="grid-overlay"></div>
      <div class="glow-orb glow-orb-1"></div>
      <div class="glow-orb glow-orb-2"></div>
    </div>

    <!-- Page Title (navigation handled by DocsLayout) -->
    <header class="docs-header">
      <div class="header-titles">
        <div class="title-mark">
          <svg viewBox="0 0 40 40" class="title-icon">
            <rect x="6" y="4" width="28" height="32" rx="3" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
            <rect x="10" y="8" width="20" height="24" rx="2" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.6"/>
            <path d="M14 14h12M14 19h10M14 24h8" stroke="currentColor" stroke-width="1.5" opacity="0.8"/>
          </svg>
        </div>
        <div>
          <h1 class="page-title">Documentation Hub</h1>
          <p class="page-subtitle">Reference materials, specifications, and system architecture</p>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="docs-main">
      <!-- Reference Documents Section -->
      <section class="docs-section">
        <div class="section-header">
          <span class="section-label">REFERENCE DOCUMENTS</span>
          <div class="section-line"></div>
        </div>

        <div class="docs-grid">
          <!-- APML Specification -->
          <router-link to="/docs/apml" class="doc-card card-apml">
            <div class="card-glow"></div>
            <div class="card-content">
              <div class="card-header">
                <div class="card-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14,2 14,8 20,8"/>
                    <path d="M12 18v-6M9 15l3 3 3-3"/>
                  </svg>
                </div>
                <div class="card-badge apml">
                  <span class="badge-value">v14.1</span>
                  <span class="badge-label">spec</span>
                </div>
              </div>
              <div class="card-body">
                <h2 class="card-title">APML Specification</h2>
                <p class="card-description">Adaptive Pedagogy Markup Language - the declarative format for course production</p>
              </div>
              <div class="card-footer">
                <span class="card-action">View Spec</span>
                <svg class="card-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </div>
            </div>
          </router-link>

          <!-- Pedagogical Model -->
          <router-link to="/docs/pedagogy" class="doc-card card-pedagogy">
            <div class="card-glow"></div>
            <div class="card-content">
              <div class="card-header">
                <div class="card-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                    <path d="M2 17l10 5 10-5"/>
                    <path d="M2 12l10 5 10-5"/>
                  </svg>
                </div>
                <div class="card-badge pedagogy">
                  <span class="badge-label">methodology</span>
                </div>
              </div>
              <div class="card-body">
                <h2 class="card-title">Pedagogical Model</h2>
                <p class="card-description">SSi teaching methodology, learning science, and LEGO recombination theory</p>
              </div>
              <div class="card-footer">
                <span class="card-action">Learn More</span>
                <svg class="card-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </div>
            </div>
          </router-link>

          <!-- Terminology Glossary -->
          <router-link to="/docs/terminology" class="doc-card card-glossary">
            <div class="card-glow"></div>
            <div class="card-content">
              <div class="card-header">
                <div class="card-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                    <path d="M8 7h8M8 11h6M8 15h4"/>
                  </svg>
                </div>
                <div class="card-badge glossary">
                  <span class="badge-label">reference</span>
                </div>
              </div>
              <div class="card-body">
                <h2 class="card-title">Terminology Glossary</h2>
                <p class="card-description">Key terms, definitions, and naming conventions used throughout the system</p>
              </div>
              <div class="card-footer">
                <span class="card-action">Browse Terms</span>
                <svg class="card-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </div>
            </div>
          </router-link>
        </div>
      </section>

      <!-- Course Content Section -->
      <section class="docs-section">
        <div class="section-header">
          <span class="section-label">COURSE CONTENT</span>
          <div class="section-line"></div>
        </div>

        <div class="docs-grid">
          <!-- Canonical Seeds -->
          <router-link to="/docs/seeds" class="doc-card card-seeds">
            <div class="card-glow"></div>
            <div class="card-content">
              <div class="card-header">
                <div class="card-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M12 2a10 10 0 0 0-6.88 17.23l1.18-1.18A8 8 0 1 1 20 12"/>
                    <path d="M12 8v4l3 3"/>
                    <circle cx="12" cy="12" r="2"/>
                  </svg>
                </div>
                <div class="card-badge seeds">
                  <span class="badge-value">668</span>
                  <span class="badge-label">seeds</span>
                </div>
              </div>
              <div class="card-body">
                <h2 class="card-title">Canonical Seeds</h2>
                <p class="card-description">Master seed phrase library - the foundation of all language courses</p>
              </div>
              <div class="card-footer">
                <span class="card-action">View Seeds</span>
                <svg class="card-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </div>
            </div>
          </router-link>

          <!-- Canonical Content -->
          <router-link to="/docs/canonical" class="doc-card card-content-ref">
            <div class="card-glow"></div>
            <div class="card-content">
              <div class="card-header">
                <div class="card-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M3 3h18v18H3z"/>
                    <path d="M3 9h18M9 21V9"/>
                  </svg>
                </div>
                <div class="card-badge content">
                  <span class="badge-label">translations</span>
                </div>
              </div>
              <div class="card-body">
                <h2 class="card-title">Canonical Content</h2>
                <p class="card-description">Reference translations, phrase collections, and validated content</p>
              </div>
              <div class="card-footer">
                <span class="card-action">Browse Content</span>
                <svg class="card-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </div>
            </div>
          </router-link>

          <!-- Process Overview -->
          <router-link to="/docs/pipeline" class="doc-card card-architecture">
            <div class="card-glow"></div>
            <div class="card-content">
              <div class="card-header">
                <div class="card-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
                  </svg>
                </div>
                <div class="card-badge architecture">
                  <span class="badge-label">architecture</span>
                </div>
              </div>
              <div class="card-body">
                <h2 class="card-title">Process Overview</h2>
                <p class="card-description">End-to-end pipeline documentation, deployment architecture, and data flows</p>
              </div>
              <div class="card-footer">
                <span class="card-action">View Architecture</span>
                <svg class="card-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </div>
            </div>
          </router-link>

          <!-- Phase Intelligence -->
          <router-link to="/docs/intelligence" class="doc-card card-glossary">
            <div class="card-glow"></div>
            <div class="card-content">
              <div class="card-header">
                <div class="card-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M12 2a4.5 4.5 0 0 0-4.5 4.5c0 .54.1 1.05.27 1.53A4 4 0 0 0 6 12a4 4 0 0 0 2 3.46V18a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-2.54A4 4 0 0 0 18 12a4 4 0 0 0-1.77-3.97c.17-.48.27-.99.27-1.53A4.5 4.5 0 0 0 12 2z"/>
                    <path d="M9.5 22h5"/>
                    <path d="M12 8v6"/>
                  </svg>
                </div>
                <div class="card-badge glossary">
                  <span class="badge-label">reference</span>
                </div>
              </div>
              <div class="card-body">
                <h2 class="card-title">Phase Intelligence</h2>
                <p class="card-description">How agents apply the methodology at each phase - decision logic, skills, and orchestration</p>
              </div>
              <div class="card-footer">
                <span class="card-action">Explore Intelligence</span>
                <svg class="card-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </div>
            </div>
          </router-link>
        </div>
      </section>

      <!-- Stats Bar -->
      <section class="stats-section">
        <div class="stats-bar">
          <div class="stat-item">
            <span class="stat-value">7</span>
            <span class="stat-label">Documents</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-value">v14.1</span>
            <span class="stat-label">APML Version</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-value status-check">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="20,6 9,17 4,12"/>
              </svg>
            </span>
            <span class="stat-label">Architecture Documented</span>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
console.log('Documentation Hub Loaded')
</script>

<style scoped>
/* ============================================
   DOCUMENTATION HUB - Mission Control Style
   ============================================ */

.docs-hub {
  --doc-void: var(--canvas);
  --doc-deep: var(--surface);
  --doc-surface: var(--surface);
  --doc-elevated: var(--surface-2);
  --doc-border: var(--surface-2);
  --doc-border-light: var(--surface-3);
  --doc-text: var(--ink);
  --doc-text-dim: var(--muted);
  --doc-text-muted: var(--faint);

  /* Accent text colors used on tinted/glow badge fills.
     Default (dark) keeps the bright hues; light mode darkens them
     for contrast against the pale glow fills. */
  --doc-apml-ink: var(--doc-apml);
  --doc-pedagogy-ink: var(--doc-pedagogy);
  --doc-seeds-ink: var(--doc-seeds);
  --doc-content-ink: var(--doc-content);
  --doc-architecture-ink: var(--doc-architecture);

  /* Card accent colors */
  --doc-apml: #10b981;
  --doc-apml-glow: rgba(16, 185, 129, 0.15);
  --doc-pedagogy: #f59e0b;
  --doc-pedagogy-glow: rgba(245, 158, 11, 0.15);
  --doc-glossary: var(--faint);
  --doc-glossary-glow: rgba(100, 116, 139, 0.15);
  --doc-seeds: #10b981;
  --doc-seeds-glow: rgba(16, 185, 129, 0.15);
  --doc-content: #3b82f6;
  --doc-content-glow: rgba(59, 130, 246, 0.15);
  --doc-architecture: #a855f7;
  --doc-architecture-glow: rgba(168, 85, 247, 0.15);

  min-height: 100vh;
  background: var(--doc-void);
  color: var(--doc-text);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  position: relative;
  overflow-x: hidden;
}

/* Light-mode overrides: dark mode is untouched.
   - Visible card/divider borders (the global --line, not the near-white --surface-2).
   - Elevated chips read on white cards via --surface-3.
   - Badge text darkened so it passes AA on the pale glow fills. */
:root[data-theme="light"] .docs-hub {
  --doc-border: var(--line);
  --doc-border-light: var(--muted);
  --doc-elevated: var(--surface-3);
  --doc-apml-ink: #047857;        /* emerald-700 on #d9f5ec ≈ 5.2:1 */
  --doc-pedagogy-ink: #b45309;    /* amber-700 on #fef3dc ≈ 5.0:1 */
  --doc-seeds-ink: #047857;
  --doc-content-ink: #1d4ed8;     /* blue-700 on #dde9fd ≈ 6.0:1 */
  --doc-architecture-ink: #7e22ce;/* purple-700 on #eddcfc ≈ 5.6:1 */
}

/* Ambient Background */
.ambient-bg {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.grid-overlay {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(var(--doc-border) 1px, transparent 1px),
    linear-gradient(90deg, var(--doc-border) 1px, transparent 1px);
  background-size: 60px 60px;
  opacity: 0.03;
}

.glow-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  animation: float 20s ease-in-out infinite;
}

.glow-orb-1 {
  width: 500px;
  height: 500px;
  background: var(--doc-apml);
  top: -150px;
  right: -100px;
  opacity: 0.06;
}

.glow-orb-2 {
  width: 400px;
  height: 400px;
  background: var(--doc-architecture);
  bottom: -100px;
  left: 20%;
  opacity: 0.05;
  animation-delay: -10s;
}

@keyframes float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(30px, -30px) scale(1.05); }
  66% { transform: translate(-20px, 20px) scale(0.95); }
}

/* Header */
.docs-header {
  position: relative;
  z-index: 10;
  border-bottom: 1px solid var(--doc-border);
  background: linear-gradient(180deg, var(--doc-deep) 0%, transparent 100%);
  padding: 1.5rem 2.5rem 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.header-inner {
  margin-bottom: 1.5rem;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--doc-apml);
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.back-link:hover {
  color: var(--accent-2);
}

.back-link svg {
  width: 18px;
  height: 18px;
}

.header-titles {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.title-mark {
  width: 56px;
  height: 56px;
  color: var(--doc-apml);
  flex-shrink: 0;
}

.title-icon {
  width: 100%;
  height: 100%;
}

.page-title {
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--doc-text);
  margin: 0;
  line-height: 1.2;
}

.page-subtitle {
  font-size: 0.9375rem;
  color: var(--doc-text-dim);
  margin: 0.25rem 0 0 0;
  letter-spacing: 0.01em;
}

/* Main Content */
.docs-main {
  position: relative;
  z-index: 10;
  max-width: 1400px;
  margin: 0 auto;
  padding: 2.5rem 2.5rem 4rem;
}

/* Section Styles */
.docs-section {
  margin-bottom: 2.5rem;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.section-label {
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.15em;
  color: var(--doc-text-muted);
  white-space: nowrap;
}

.section-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, var(--doc-border) 0%, transparent 100%);
}

/* Docs Grid */
.docs-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

@media (max-width: 1024px) {
  .docs-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .docs-grid {
    grid-template-columns: 1fr;
  }
}

/* Doc Cards */
.doc-card {
  position: relative;
  display: block;
  background: var(--doc-surface);
  border: 1px solid var(--doc-border);
  border-radius: 16px;
  padding: 1.5rem;
  text-decoration: none;
  color: inherit;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.doc-card:hover {
  transform: translateY(-4px);
  border-color: var(--doc-border-light);
}

.card-glow {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 80px;
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.card-apml .card-glow { background: linear-gradient(180deg, var(--doc-apml-glow) 0%, transparent 100%); }
.card-pedagogy .card-glow { background: linear-gradient(180deg, var(--doc-pedagogy-glow) 0%, transparent 100%); }
.card-glossary .card-glow { background: linear-gradient(180deg, var(--doc-glossary-glow) 0%, transparent 100%); }
.card-seeds .card-glow { background: linear-gradient(180deg, var(--doc-seeds-glow) 0%, transparent 100%); }
.card-content-ref .card-glow { background: linear-gradient(180deg, var(--doc-content-glow) 0%, transparent 100%); }
.card-architecture .card-glow { background: linear-gradient(180deg, var(--doc-architecture-glow) 0%, transparent 100%); }

.doc-card:hover .card-glow { opacity: 1; }

.card-apml:hover { border-color: var(--doc-apml); box-shadow: 0 20px 40px -20px var(--doc-apml-glow); }
.card-pedagogy:hover { border-color: var(--doc-pedagogy); box-shadow: 0 20px 40px -20px var(--doc-pedagogy-glow); }
.card-glossary:hover { border-color: var(--doc-glossary); box-shadow: 0 20px 40px -20px var(--doc-glossary-glow); }
.card-seeds:hover { border-color: var(--doc-seeds); box-shadow: 0 20px 40px -20px var(--doc-seeds-glow); }
.card-content-ref:hover { border-color: var(--doc-content); box-shadow: 0 20px 40px -20px var(--doc-content-glow); }
.card-architecture:hover { border-color: var(--doc-architecture); box-shadow: 0 20px 40px -20px var(--doc-architecture-glow); }

.card-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  min-height: 180px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.25rem;
}

.card-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--doc-elevated);
  border: 1px solid var(--doc-border);
  border-radius: 10px;
  transition: all 0.3s ease;
}

.card-icon svg {
  width: 22px;
  height: 22px;
}

.card-apml .card-icon { color: var(--doc-apml); }
.card-pedagogy .card-icon { color: var(--doc-pedagogy); }
.card-glossary .card-icon { color: var(--doc-glossary); }
.card-seeds .card-icon { color: var(--doc-seeds); }
.card-content-ref .card-icon { color: var(--doc-content); }
.card-architecture .card-icon { color: var(--doc-architecture); }

.card-apml:hover .card-icon { background: var(--doc-apml); border-color: var(--doc-apml); color: white; }
.card-pedagogy:hover .card-icon { background: var(--doc-pedagogy); border-color: var(--doc-pedagogy); color: white; }
.card-glossary:hover .card-icon { background: var(--doc-glossary); border-color: var(--doc-glossary); color: white; }
.card-seeds:hover .card-icon { background: var(--doc-seeds); border-color: var(--doc-seeds); color: white; }
.card-content-ref:hover .card-icon { background: var(--doc-content); border-color: var(--doc-content); color: white; }
.card-architecture:hover .card-icon { background: var(--doc-architecture); border-color: var(--doc-architecture); color: white; }

/* Badges */
.card-badge {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  background: var(--doc-elevated);
  border: 1px solid var(--doc-border);
  border-radius: 100px;
  font-size: 0.75rem;
}

.badge-value {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.badge-label {
  font-weight: 500;
}

.card-badge.apml { background: var(--doc-apml-glow); border-color: var(--doc-apml); }
.card-badge.apml .badge-value { color: var(--doc-apml-ink); }
.card-badge.apml .badge-label { color: var(--doc-apml-ink); }

.card-badge.pedagogy { background: var(--doc-pedagogy-glow); border-color: var(--doc-pedagogy); }
.card-badge.pedagogy .badge-label { color: var(--doc-pedagogy-ink); }

.card-badge.glossary { background: var(--doc-glossary-glow); border-color: var(--doc-glossary); }
.card-badge.glossary .badge-label { color: var(--doc-text-dim); }

.card-badge.seeds { background: var(--doc-seeds-glow); border-color: var(--doc-seeds); }
.card-badge.seeds .badge-value { color: var(--doc-seeds-ink); }
.card-badge.seeds .badge-label { color: var(--doc-seeds-ink); }

.card-badge.content { background: var(--doc-content-glow); border-color: var(--doc-content); }
.card-badge.content .badge-label { color: var(--doc-content-ink); }

.card-badge.architecture { background: var(--doc-architecture-glow); border-color: var(--doc-architecture); }
.card-badge.architecture .badge-label { color: var(--doc-architecture-ink); }

/* Card Body */
.card-body {
  flex: 1;
}

.card-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--doc-text);
  margin: 0 0 0.625rem 0;
  letter-spacing: -0.01em;
}

.card-description {
  font-size: 0.8125rem;
  color: var(--doc-text-dim);
  line-height: 1.5;
  margin: 0;
}

/* Card Footer */
.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 1.25rem;
  padding-top: 1rem;
  border-top: 1px solid var(--doc-border);
}

.card-action {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--doc-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  transition: color 0.2s ease;
}

.card-apml:hover .card-action { color: var(--doc-apml); }
.card-pedagogy:hover .card-action { color: var(--doc-pedagogy); }
.card-glossary:hover .card-action { color: var(--doc-glossary); }
.card-seeds:hover .card-action { color: var(--doc-seeds); }
.card-content-ref:hover .card-action { color: var(--doc-content); }
.card-architecture:hover .card-action { color: var(--doc-architecture); }

.card-arrow {
  width: 18px;
  height: 18px;
  color: var(--doc-text-muted);
  transition: all 0.2s ease;
}

.doc-card:hover .card-arrow {
  transform: translateX(4px);
}

.card-apml:hover .card-arrow { color: var(--doc-apml); }
.card-pedagogy:hover .card-arrow { color: var(--doc-pedagogy); }
.card-glossary:hover .card-arrow { color: var(--doc-glossary); }
.card-seeds:hover .card-arrow { color: var(--doc-seeds); }
.card-content-ref:hover .card-arrow { color: var(--doc-content); }
.card-architecture:hover .card-arrow { color: var(--doc-architecture); }

/* Stats Bar */
.stats-section {
  margin-top: 1rem;
}

.stats-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  padding: 1.25rem 2rem;
  background: var(--doc-surface);
  border: 1px solid var(--doc-border);
  border-radius: 12px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.stat-value {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--doc-text);
  font-variant-numeric: tabular-nums;
}

.stat-value.status-check {
  color: var(--doc-apml);
  display: flex;
  align-items: center;
}

.stat-value.status-check svg {
  width: 18px;
  height: 18px;
}

.stat-label {
  font-size: 0.75rem;
  color: var(--doc-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stat-divider {
  width: 1px;
  height: 24px;
  background: var(--doc-border);
}

/* Responsive */
@media (max-width: 768px) {
  .docs-header {
    padding: 1.25rem 1.5rem 1.5rem;
  }

  .header-titles {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .title-mark {
    width: 48px;
    height: 48px;
  }

  .page-title {
    font-size: 1.625rem;
  }

  .docs-main {
    padding: 2rem 1.5rem 3rem;
  }

  .stats-bar {
    flex-wrap: wrap;
    gap: 1.5rem;
  }

  .stat-divider {
    display: none;
  }
}
</style>
