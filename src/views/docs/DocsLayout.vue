<template>
  <div class="docs-layout">
    <!-- Single Header Row with Tabs -->
    <header class="docs-header">
      <div class="header-content">
        <router-link to="/" class="back-link">← Mission Control</router-link>
        <h1 class="page-title">Documentation</h1>

        <!-- Tabs inline in header -->
        <nav class="header-tabs">
          <router-link
            to="/docs"
            class="tab-item"
            :class="{ active: isActiveRoute('DocsIndex') }"
          >
            Overview
          </router-link>
          <router-link
            to="/docs/apml"
            class="tab-item"
            :class="{ active: isActiveRoute('APMLSpec') }"
          >
            APML Spec
          </router-link>
          <router-link
            to="/docs/pedagogy"
            class="tab-item"
            :class="{ active: isActiveRoute('Pedagogy') }"
          >
            Pedagogy
          </router-link>
          <router-link
            to="/docs/terminology"
            class="tab-item"
            :class="{ active: isActiveRoute('TerminologyGlossary') }"
          >
            Glossary
          </router-link>
          <router-link
            to="/docs/seeds"
            class="tab-item"
            :class="{ active: isActiveRoute('CanonicalSeeds') }"
          >
            Seeds
          </router-link>
          <router-link
            to="/docs/canonical"
            class="tab-item"
            :class="{ active: isActiveRoute('CanonicalContent') }"
          >
            Content
          </router-link>
          <router-link
            to="/docs/pipeline"
            class="tab-item"
            :class="{ active: isActiveRoute('ProcessOverview') }"
          >
            Pipeline
          </router-link>
          <router-link
            to="/docs/intelligence"
            class="tab-item"
            :class="{ active: isActiveRoute('PhaseIntelligence') }"
          >
            Intelligence
          </router-link>
        </nav>

        <!-- Version Badge -->
        <div class="version-badge">
          <span class="badge-label">APML</span>
          <span class="badge-value">v14</span>
        </div>
      </div>
    </header>

    <!-- Content Area - nested routes render here -->
    <main class="docs-content">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()

// Check if route is active
function isActiveRoute(routeName) {
  return route.name === routeName
}
</script>

<style scoped>
.docs-layout {
  min-height: 100vh;
  background: #0f172a;
  color: #f1f5f9;
}

.docs-header {
  background: #1e293b;
  border-bottom: 1px solid #334155;
  padding: 0 1.5rem;
  height: 56px;
  position: sticky;
  top: 0;
  z-index: 50;
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  height: 100%;
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.back-link {
  color: #10b981;
  text-decoration: none;
  font-size: 0.875rem;
  white-space: nowrap;
  transition: color 0.2s;
}

.back-link:hover {
  color: #34d399;
}

.page-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #f1f5f9;
  margin: 0;
  white-space: nowrap;
}

/* Tabs in header */
.header-tabs {
  display: flex;
  gap: 0.25rem;
  margin-left: 1rem;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.header-tabs::-webkit-scrollbar {
  display: none;
}

.tab-item {
  font-size: 0.8125rem;
  padding: 0.5rem 0.75rem;
  color: #94a3b8;
  text-decoration: none;
  border-radius: 4px;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.tab-item:hover {
  color: #f1f5f9;
  background: #334155;
}

.tab-item.active {
  color: #10b981;
  background: #334155;
}

/* Version Badge */
.version-badge {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.625rem;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 100px;
  font-size: 0.75rem;
}

.badge-label {
  color: #94a3b8;
}

.badge-value {
  color: #10b981;
  font-weight: 600;
}

/* Content */
.docs-content {
  max-width: 1400px;
  margin: 0 auto;
}

/* Responsive */
@media (max-width: 1100px) {
  .header-tabs {
    flex: 1;
    margin-left: 0.5rem;
  }

  .tab-item {
    padding: 0.5rem 0.5rem;
    font-size: 0.75rem;
  }
}

@media (max-width: 768px) {
  .header-content {
    gap: 0.75rem;
  }

  .page-title {
    display: none;
  }

  .version-badge {
    display: none;
  }
}
</style>
