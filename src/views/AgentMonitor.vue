<template>
  <div class="agent-monitor-page">
    <div class="deprecated-notice">
      <div class="deprecated-content">
        <div class="deprecated-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
        </div>
        <h2>Agent Monitor Deprecated</h2>
        <p class="deprecated-message">
          This feature has been replaced by the <strong>Course Builder</strong> workflow in APML v14.
        </p>

        <div class="info-box">
          <h3>What Changed</h3>
          <p>
            Phases 0-3 (translation, conflict resolution, basket generation) have been
            consolidated into a single <code>Course Builder API</code>.
          </p>
          <ul>
            <li>Agent submits seeds directly via <code>POST /api/seed/complete</code></li>
            <li>No master/worker orchestration needed</li>
            <li>Progress tracked via <code>GET /api/stats/:courseCode</code></li>
          </ul>
        </div>

        <div class="actions">
          <router-link to="/" class="btn btn-primary">
            Return to Dashboard
          </router-link>
          <router-link to="/production" class="btn btn-secondary">
            Production Suite
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// v14: AgentSwimlane component has been deprecated
// The Course Builder workflow doesn't use master/worker orchestration
</script>

<style scoped>
.agent-monitor-page {
  min-height: 100vh;
  background: #0a0f1a;
}

.deprecated-notice {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: linear-gradient(180deg, #0a0f1a 0%, #0f172a 100%);
}

.deprecated-content {
  text-align: center;
  max-width: 500px;
}

.deprecated-icon {
  width: 4rem;
  height: 4rem;
  margin: 0 auto 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f59e0b 0%, rgba(245, 158, 11, 0.4) 100%);
  border-radius: 1rem;
}

.deprecated-icon svg {
  width: 2rem;
  height: 2rem;
  color: #0a0f1a;
}

.deprecated-content h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #f1f5f9;
  margin: 0 0 0.5rem 0;
  letter-spacing: 0.05em;
}

.deprecated-message {
  color: #94a3b8;
  font-size: 1rem;
  margin: 0 0 2rem 0;
}

.deprecated-message strong {
  color: #10b981;
}

.info-box {
  text-align: left;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 0.75rem;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.info-box h3 {
  font-size: 0.875rem;
  font-weight: 600;
  color: #f59e0b;
  margin: 0 0 0.75rem 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.info-box p {
  color: #94a3b8;
  font-size: 0.875rem;
  margin: 0 0 1rem 0;
  line-height: 1.6;
}

.info-box ul {
  margin: 0;
  padding-left: 1.25rem;
  color: #64748b;
  font-size: 0.8125rem;
}

.info-box li {
  margin-bottom: 0.5rem;
}

.info-box code {
  background: #0f172a;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-family: 'SF Mono', Monaco, monospace;
  font-size: 0.75rem;
  color: #10b981;
}

.actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.btn {
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 600;
  font-size: 0.875rem;
  text-decoration: none;
  transition: all 0.2s;
}

.btn-primary {
  background: #10b981;
  color: #0a0f1a;
}

.btn-primary:hover {
  background: #34d399;
}

.btn-secondary {
  background: #1e293b;
  border: 1px solid #334155;
  color: #94a3b8;
}

.btn-secondary:hover {
  border-color: #475569;
  color: #f1f5f9;
}
</style>
