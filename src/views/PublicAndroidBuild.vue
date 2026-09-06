<template>
  <div class="pub-page">
    <template v-if="build">
      <header class="pub-head">
        <h1>Install the SSi app</h1>
        <p class="lede">
          Tap the button, then open the downloaded file to install it. Nothing to sign up for
          here — you sign in inside the app with the account you already have.
        </p>
      </header>

      <a class="download-btn" :href="build.url" :download="build.filename">
        <span class="btn-action">Download for Android</span>
        <span class="btn-size">{{ megabytes }} MB</span>
      </a>
      <p class="build-stamp">{{ build.label }}</p>

      <section class="install-help">
        <h2>If your phone asks about “unknown sources”</h2>
        <p>
          This app does not come from the Play Store, so Android checks with you before it
          installs. When you open the downloaded file your phone will say something like
          “for your security, your phone isn't allowed to install unknown apps from this source” —
          tap <strong>Settings</strong> on that message, turn on
          <strong>Allow from this source</strong>, then press back. The install carries on from
          where it stopped. That switch lives in Settings → Apps → Special app access →
          Install unknown apps, under whichever app you opened the file from — usually Chrome.
        </p>
        <p>
          Android may then offer to scan the app before installing. Let it scan and carry on. If it
          refuses outright, stop there and tell us what the message said rather than working around it.
        </p>
        <p>
          If you already have this app on your phone, this one replaces it in place. There is no
          need to uninstall anything first.
        </p>
      </section>

      <section class="provenance">
        <h2>Exactly which build this is</h2>
        <dl class="prov-grid">
          <dt>File</dt>
          <dd>{{ build.filename }}</dd>
          <dt>Size</dt>
          <dd>{{ build.bytes.toLocaleString() }} bytes</dd>
          <dt>SHA-256</dt>
          <dd><code class="sha">{{ build.sha256 }}</code></dd>
          <dt>Commit</dt>
          <dd><code class="sha">{{ build.commit }}</code> on <code>{{ build.branch }}</code></dd>
          <dt>Commit message</dt>
          <dd>{{ build.commitSubject }}</dd>
          <dt>Built</dt>
          <dd>{{ formatTime(build.builtAt) }}</dd>
          <dt v-if="build.apiOrigin">Talks to</dt>
          <dd v-if="build.apiOrigin"><code>{{ build.apiOrigin }}</code></dd>
          <dt>App ID</dt>
          <dd><code>{{ build.applicationId }}</code> — shows on the phone as “{{ build.appName }}”</dd>
          <dt>Android</dt>
          <dd>targets SDK {{ build.targetSdk }}, minimum SDK {{ build.minSdk }} ({{ build.buildType }})</dd>
          <dt v-if="build.signerCertSha256">Signing certificate</dt>
          <dd v-if="build.signerCertSha256"><code class="sha">{{ build.signerCertSha256 }}</code></dd>
        </dl>
        <p v-if="build.provenanceNote" class="prov-note">{{ build.provenanceNote }}</p>
      </section>

      <p class="ios-note">
        iPhone and iPad builds are not distributed here — Apple only allows test installs through
        TestFlight, so those go out as TestFlight invitations.
      </p>
    </template>

    <p v-else class="empty">
      No Android build is published for download right now.
    </p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import manifest from '../content/app-builds.json'

// ONE build, never a list (Tom, 2026-09-06): a public page offering five historical
// APKs is a way for a field tester to install the wrong one. The newest entry
// carrying `public: true` is the one served here; everything else stays on the
// authed /builds page, which is unchanged.
const build = computed(() =>
  (manifest.builds || []).find(b => b.platform === 'android' && b.public === true) || null
)

const megabytes = computed(() =>
  build.value ? Math.round(build.value.bytes / 1e5) / 10 : ''
)

const formatTime = iso => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/London' }) + ' UK time'
}
</script>

<style scoped>
.pub-page {
  max-width: 40rem;
  margin: 0 auto;
  padding: 2.5rem 1.15rem 4rem;
}
.pub-head h1 {
  font-size: 1.9rem;
  font-weight: 700;
  margin: 0 0 0.6rem;
}
.lede {
  opacity: 0.8;
  line-height: 1.55;
  margin: 0 0 2rem;
}
.download-btn {
  display: block;
  text-align: center;
  padding: 1.15rem;
  border-radius: 0.6rem;
  background: var(--accent, #2563eb);
  color: #fff;
  font-weight: 600;
  font-size: 1.1rem;
  text-decoration: none;
}
.download-btn:hover { filter: brightness(1.08); }
.btn-action { margin-right: 0.5rem; }
.btn-size { opacity: 0.85; font-weight: 500; }
.build-stamp {
  text-align: center;
  font-size: 0.9rem;
  opacity: 0.75;
  margin: 0.6rem 0 0;
}
.install-help, .provenance {
  margin-top: 2rem;
  border-top: 1px solid var(--line, rgba(128, 128, 128, 0.25));
  padding-top: 1.25rem;
}
.install-help h2, .provenance h2 {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 0.6rem;
}
.install-help p {
  margin: 0 0 0.8rem;
  line-height: 1.6;
  opacity: 0.85;
}
.install-help p:last-child { margin-bottom: 0; }
.prov-grid {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 0.35rem 1rem;
  margin: 0.5rem 0 0;
  font-size: 0.875rem;
}
.prov-grid dt { opacity: 0.6; }
.prov-grid dd { margin: 0; overflow-wrap: anywhere; }
.sha { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.82em; }
.prov-note {
  font-size: 0.82rem;
  opacity: 0.7;
  line-height: 1.55;
  margin: 1rem 0 0;
}
.ios-note, .empty {
  font-size: 0.9rem;
  opacity: 0.7;
  line-height: 1.55;
  margin-top: 2rem;
}
</style>
