<template>
  <div class="builds-page">
    <header class="builds-head">
      <h1>Test builds</h1>
      <p class="lede">
        Install a test version of the SSi app on your phone. Tap the button, then open the
        downloaded file to install it.
      </p>
    </header>

    <section v-for="build in androidBuilds" :key="build.id" class="build-card">
      <div class="build-card-head">
        <h2>{{ build.label }}</h2>
        <span class="platform-chip">Android</span>
      </div>

      <a
        class="download-btn"
        :href="build.url"
        :download="build.filename"
      >
        <span class="btn-action">Download build</span>
        <span class="btn-sha">{{ build.commit.slice(0, 8) }}</span>
      </a>
      <p class="build-stamp">Built {{ formatLocalTime(build.builtAt) }}</p>

      <!-- The direct link, in full, so it can be copied and sent to someone who has no Popty
           login (Tom, 2026-09-06: "so that there's no confusion"). The page is behind the
           login; the FILE is public object storage. `build.url` is the SAME binding the
           download button reads above — never a second, hand-kept copy that could drift. -->
      <div class="share-link">
        <p class="share-lede">
          This link is public. Anyone can tap it and install &mdash; no Popty account needed. Copy it
          and send it straight to a tester.
        </p>
        <div class="share-row">
          <code class="share-url">{{ build.url }}</code>
          <button type="button" class="copy-btn" @click="copyUrl(build)">
            {{ copiedId === build.id ? 'Copied' : 'Copy link' }}
          </button>
        </div>
        <p v-if="copyFailedId === build.id" class="copy-failed">
          Your browser would not let us write to the clipboard &mdash; select the link above and copy it
          by hand.
        </p>
        <p class="share-sha">SHA-256 <code class="sha">{{ build.sha256 }}</code></p>
      </div>

      <div class="install-help">
        <h3>If your phone asks about "unknown sources"</h3>
        <p>
          This app does not come from the Play Store, so Android will check with you before it
          installs. When you open the downloaded file, your phone will say something like
          "for your security, your phone isn't allowed to install unknown apps from this source" —
          tap <strong>Settings</strong> on that message, turn on <strong>Allow from this source</strong>,
          and then press back. The install carries on from where it stopped. If you ever need to find
          that switch yourself, it lives in Settings → Apps → Special app access → Install unknown apps,
          under the name of the app you opened the file from — usually Chrome, or your phone's Files app.
        </p>
        <p>
          Android may then offer to scan the app before it installs. Let it scan, and carry on when it
          finishes. If it refuses to install the app outright, stop there and tell us what the message
          said rather than working around it.
        </p>
      </div>

      <details class="provenance" open>
        <summary>Exactly which build this is</summary>
        <dl class="prov-grid">
          <dt>Commit</dt>
          <dd><code class="sha">{{ build.commit }}</code></dd>
          <dt>Branch</dt>
          <dd><code>{{ build.branch }}</code> in <code>{{ build.repo }}</code></dd>
          <dt>Commit message</dt>
          <dd>{{ build.commitSubject }}</dd>
          <dt>Built</dt>
          <dd>{{ formatTime(build.builtAt) }}</dd>
          <dt>App version</dt>
          <dd>{{ build.versionName }} (versionCode {{ build.versionCode }}, {{ build.buildType }})</dd>
          <dt>App ID</dt>
          <dd><code>{{ build.applicationId }}</code> &mdash; shows on the phone as "{{ build.appName }}"</dd>
          <dt>Android SDK</dt>
          <dd>targets {{ build.targetSdk }}, minimum {{ build.minSdk }}</dd>
          <dt>File</dt>
          <dd>{{ build.filename }} &middot; {{ build.bytes.toLocaleString() }} bytes</dd>
          <dt>SHA-256</dt>
          <dd><code class="sha">{{ build.sha256 }}</code></dd>
        </dl>
        <p v-if="build.provenanceNote" class="prov-note">{{ build.provenanceNote }}</p>
      </details>

      <p class="report-hint">
        If you report a bug on this build, quote the commit
        <code class="sha">{{ build.commit.slice(0, 8) }}</code> so we know exactly what you were running.
      </p>
    </section>

    <p v-if="!androidBuilds.length" class="empty">No Android test builds are published right now.</p>

    <p class="ios-note">
      iPhone and iPad builds are not distributed here — Apple only allows test installs through
      TestFlight, so those go out as TestFlight invitations when there is an iOS build to test.
    </p>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import manifest from '../content/app-builds.json'

const androidBuilds = computed(() =>
  (manifest.builds || []).filter(b => b.platform === 'android')
)

// One-tap copy, with the URL left as ordinary selectable text so a refused clipboard
// (permissions, an insecure context, an old browser) is never a dead end.
const copiedId = ref(null)
const copyFailedId = ref(null)

const copyUrl = async build => {
  copiedId.value = null
  copyFailedId.value = null
  try {
    await navigator.clipboard.writeText(build.url)
    copiedId.value = build.id
    setTimeout(() => {
      if (copiedId.value === build.id) copiedId.value = null
    }, 2000)
  } catch {
    copyFailedId.value = build.id
  }
}

// The prominent line under the button: the way Tom reads a clock, not the way a manifest does.
const formatLocalTime = iso => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/London' }) + ' UK time'
}

const formatTime = iso => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short', timeZone: 'UTC' }) + ' UTC'
}
</script>

<style scoped>
.builds-page {
  max-width: 44rem;
  margin: 0 auto;
  padding: 2rem 1rem 4rem;
}
.builds-head h1 {
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0 0 0.5rem;
}
.lede {
  opacity: 0.8;
  margin: 0 0 2rem;
  line-height: 1.5;
}
.build-card {
  border: 1px solid var(--line, rgba(128, 128, 128, 0.3));
  border-radius: 0.75rem;
  padding: 1.25rem;
  margin-bottom: 2rem;
}
.build-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}
.build-card-head h2 {
  font-size: 1.15rem;
  font-weight: 600;
  margin: 0;
}
.platform-chip {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border: 1px solid var(--line, rgba(128, 128, 128, 0.3));
  border-radius: 999px;
  padding: 0.15rem 0.6rem;
  opacity: 0.7;
}
.download-btn {
  display: block;
  text-align: center;
  padding: 1rem;
  border-radius: 0.5rem;
  background: var(--accent, #2563eb);
  color: #fff;
  font-weight: 600;
  font-size: 1.05rem;
  text-decoration: none;
}
.download-btn:hover {
  filter: brightness(1.08);
}
.btn-action {
  margin-right: 0.5rem;
}
/* Matches the short sha the app's own Settings row shows, so the two can be compared at a glance. */
.btn-sha {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 1.05em;
  letter-spacing: 0.02em;
}
.build-stamp {
  text-align: center;
  font-size: 0.85rem;
  opacity: 0.75;
  margin: 0.5rem 0 0;
}
.share-link {
  margin-top: 1.25rem;
  border: 1px solid var(--line, rgba(128, 128, 128, 0.3));
  border-radius: 0.5rem;
  padding: 0.85rem;
}
.share-lede {
  font-size: 0.85rem;
  opacity: 0.8;
  line-height: 1.5;
  margin: 0 0 0.6rem;
}
.share-row {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
}
/* Never truncated: the whole URL wraps, because a half-copied link installs nothing. */
.share-url {
  flex: 1 1 auto;
  min-width: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.78rem;
  line-height: 1.45;
  overflow-wrap: anywhere;
  user-select: all;
}
.copy-btn {
  flex: 0 0 auto;
  font: inherit;
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.4rem 0.7rem;
  border-radius: 0.4rem;
  border: 1px solid var(--line, rgba(128, 128, 128, 0.4));
  background: transparent;
  color: inherit;
  cursor: pointer;
}
.copy-btn:hover {
  filter: brightness(1.2);
}
.copy-failed {
  font-size: 0.8rem;
  margin: 0.5rem 0 0;
  opacity: 0.85;
}
.share-sha {
  font-size: 0.78rem;
  opacity: 0.7;
  margin: 0.55rem 0 0;
  overflow-wrap: anywhere;
}
.install-help {
  margin-top: 1.5rem;
}
.install-help h3 {
  font-size: 0.95rem;
  font-weight: 600;
  margin: 0 0 0.4rem;
}
.install-help p {
  margin: 0 0 0.75rem;
  line-height: 1.55;
  opacity: 0.85;
}
.install-help p:last-child {
  margin-bottom: 0;
}
.provenance {
  margin-top: 1.5rem;
  border-top: 1px solid var(--line, rgba(128, 128, 128, 0.25));
  padding-top: 1rem;
}
.provenance summary {
  cursor: pointer;
  font-weight: 600;
  font-size: 0.95rem;
}
.prov-grid {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 0.35rem 1rem;
  margin: 0.9rem 0 0;
  font-size: 0.875rem;
}
.prov-grid dt {
  opacity: 0.6;
}
.prov-grid dd {
  margin: 0;
  overflow-wrap: anywhere;
}
.sha {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.8em;
}
.prov-note {
  font-size: 0.8rem;
  opacity: 0.65;
  line-height: 1.5;
  margin: 0.9rem 0 0;
}
.report-hint {
  font-size: 0.85rem;
  opacity: 0.75;
  margin: 1.25rem 0 0;
}
.ios-note,
.empty {
  font-size: 0.9rem;
  opacity: 0.7;
  line-height: 1.55;
}
@media (max-width: 30rem) {
  .share-row {
    flex-direction: column;
    align-items: stretch;
  }
  .prov-grid {
    grid-template-columns: 1fr;
    gap: 0.1rem;
  }
  .prov-grid dd {
    margin-bottom: 0.5rem;
  }
}
</style>
