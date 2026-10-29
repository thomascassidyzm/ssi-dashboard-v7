<template>
  <!-- data-surface: a marker a human can grep for in the served bundle to prove this shipped -->
  <div class="recordist" :class="{ fit: fitPhase, live: phase === 'recording', 'sheet-open': sheetOpen && phase !== 'recording', 'has-rail': railShown }" data-surface="one-recordist-surface-2026-08-14" :data-durable-takes="DURABLE_TAKES_FEATURE">
    <!-- IS MY WORK SAFE? Answered in words, at the top, in every phase.
         Before 2026-09-03 the only answer on this screen was "Saving…" on the
         done card, an artist could not tell a take that was on its way from one
         that had already been thrown away after three failed tries, and Aran
         finished a ~250-line session unable to tell. The three states below are
         genuinely different things and they must never be worded the same. -->
    <div class="safety-banner" :class="[safetyBanner.cls, { slim: phase === 'home' && (safetyBanner.cls === 'waiting' || safetyBanner.cls === 'done') }]" data-test="safety-banner">
      <strong :title="safetyBanner.detail">{{ safetyBanner.head }}</strong>
      <span>{{ safetyBanner.detail }}</span>
    </div>
    <!-- Loading -->
    <section v-if="phase === 'loading'" class="rc-card center">
      <div class="rc-spinner"></div>
      <p>Getting your lines…</p>
    </section>

    <!-- The link doesn't name a voice we know -->
    <section v-else-if="phase === 'unknown'" class="rc-card center">
      <h2>This link doesn't work any more</h2>
      <p>Ask for a new recording link and this page will pick up where you left off.</p>
    </section>

    <section v-else-if="phase === 'error'" class="rc-card center">
      <h2 v-if="!loadSlow">Couldn't load your lines</h2>
      <h2 v-else>{{ loadError }}</h2>
      <p v-if="!loadSlow">{{ loadError }}</p>
      <button class="btn-ghost" @click="load">Try again</button>
    </section>

    <!-- ── Home: the cards, Up next and the ticks (job #347) ───────────── -->
    <BoothHome
      v-else-if="phase === 'home' && homeSummary"
      :display-name="homeSummary.displayName"
      :tracks="homeTracks"
      :unticked="unticked"
      :track-key="homeTrackKey"
      :main-heading="homeMainHeading"
      :notes="homeNotes"
      @open="openBatch"
      @card="openCard"
      @home="goHome"
      @tick="setTick"
    >
      <template #top><RerecordCard :rows="rerecordRows" :old-ids="oldRefusedList" @open="openRerecord" @play="playRefused" @play-stored="playStoredTake" @keep="keepMismatch" @clear-old="clearOldRefused" /></template>
    </BoothHome>

    <!-- The line editor (job #709) is never open while the mic is live. -->
    <BoothLineEditor
      v-if="lineEditorFor && phase !== 'recording'"
      :line="lineEditorFor"
      @close="lineEditorFor = null"
      @applied="onLineEdited"
      @undone="onLineEditUndone"
    />

    <!-- ── THE PROMPTER (Aran, 2026-10-14, job #424; design #419 Option A) ──────────────────
         The batch page, the live stage and the done screen are ONE layout, exactly one viewport
         tall, and nothing on them scrolls: the where-am-I row, the line big and centred in what
         is left, and the transport pinned to the bottom edge. The batch page IS the reading
         screen — before Start the first line already sits in the middle, and Start is where Next
         will be. Everything that is not the line (the map of every line, the settings, the
         already-recorded list, the notes) lives in ONE sheet, opened from the where-am-I row or
         from the settings line above Start. -->
    <template v-else-if="fitPhase">
      <!-- THE ONE WHERE-AM-I ROW (job #378). ‹ on its left goes home; the words say where he is.
           While the mic is live it is words only: no link and no button near anything he reads
           (the ‹ and the sheet's opener go), and Stop here is the stage's way out. -->
      <header ref="whereRef" class="where" :class="{ live: phase === 'recording' }" data-test="where">
        <button v-if="phase !== 'recording'" type="button" class="where-home" data-test="back-home" title="Back to home" aria-label="Back to home" @click="goHome">‹</button>
        <p class="where-words" :data-test="phase === 'recording' ? 'stage-where' : 'batch-where'">{{ whereWords }}</p>
        <button v-if="phase !== 'recording'" type="button" class="where-more" data-test="open-sheet" aria-label="Lines and settings" @click="openSheet()"><span class="wm-long">Lines &amp; settings</span><span class="wm-short" aria-hidden="true">☰</span></button>
      </header>

      <!-- LINES ALREADY RECORDED ARE LEFT OUT OF THE READING FLOW (Aran, 2026-10-15, job #816). One
           small line says how many, and "show" draws them in Lines & settings, where Again is on
           every row. Never while the mic is live. -->
      <p v-if="phase !== 'recording' && hiddenCount > 0" class="hidden-note" data-test="hidden-note">
        {{ hiddenCount }} already recorded — {{ showHidden ? 'shown in Lines & settings' : 'hidden' }} ·
        <button type="button" class="hidden-toggle" data-test="hidden-toggle" @click="toggleHidden">{{ showHidden ? 'hide' : 'show' }}</button>
      </p>

      <!-- ONE STATUS ROW, live only: the count, with the progress bar as its bottom edge. Stop and
           Pause are NOT here any more — they sit above Back / Again / Next (job #681). -->
      <div v-if="phase === 'recording'" class="status" data-test="status">
        <span class="line-pos" data-test="line-pos">{{ linePosWords }} · <b class="line-state" :class="'ls-' + lineState.replace(' ', '-')" data-test="line-state">{{ lineState }}</b></span>
        <span class="stage-progress" data-test="count">{{ flowRecorded }} of {{ flowIndices.length }} recorded</span>
        <span class="status-edge" aria-hidden="true"><i :style="{ width: flowPct + '%' }"></i></span>
      </div>
      <!-- ONE MIC SIGNAL, A WIDE STRIP (Aran, 2026-10-15, job #692: "a bit bigger and use more of the
           available width"). Its own row under Stop / count / Pause, as wide as the reading column.
           The state word and the waveform in one chip, never two pills that can disagree (it
           replaced ON AIR, the meter's own words, the green "Recording —" line and the live dot).
           The waveform is drawn from the SAME peaks useTapRecorder's meter loop already computes —
           no second AnalyserNode, nothing on the capture path — and is flat while the mic is held,
           because a trace twitching to the speaker would be the screen telling him it is recording
           him when it is not. -->
      <div v-if="phase === 'recording'" class="mic-row" data-test="mic-row">
        <span class="mic" :class="micSignal.cls" :title="micSignal.title" data-test="mic">
          <span class="mic-dot" aria-hidden="true"></span>
          <span class="mic-word">{{ micSignal.word }}</span>
          <span class="meter" :class="{ clip: recorder.clipping.value && !micHeld, held: micHeld }"><canvas ref="waveCanvas" class="wave"></canvas></span>
        </span>
      </div>
      <!-- THE AUTO-ADVANCE SWITCH, WHERE HE CAN REACH IT MID-SESSION (Aran, 2026-09-10: "if I
           pause for thought, it starts flicking through items"). At the top, far from Again and
           Next. Silent on a gapped read, where auto-advance is off by construction. -->
      <label v-if="phase === 'recording' && !isGappedLine" class="stage-auto">
        <input type="checkbox" v-model="autoAdvance" />
        <span>{{ !autoAdvance ? 'Waiting for you — tap Next' : (hasNext ? 'Moving on by itself when you stop' : 'Last line — tap Done when you have finished') }}</span>
      </label>

      <div class="fit-body">
        <!-- B'S RAIL, DESKTOP ONLY: one square per line of this batch, filling in as he reads.
             A SQUARE IS A WAY ONTO ITS LINE (Aran, 2026-10-15): tap one and the cursor goes
             there — live, the open capture is thrown away as ‹ does; before Start, Start opens
             on it.
             THE WHOLE BATCH, ALL THE TIME (Aran, 2026-10-16, job #286): on a desktop the rail is its
             own full-height column down the left edge, so the recording rows appearing above the
             line take no height from it, and its squares are sized (fitRail) so every one of a
             ~250-line batch is on screen at once. Same size idle and live: nothing jumps on Start. -->
        <div v-if="railShown" ref="railWrapRef" class="rail-wrap" :class="{ scroll: railFit.scroll }">
          <ol class="rail" data-test="rail" :style="{ '--rail-cols': railFit.cols, '--rail-sq': railFit.sq + 'px', '--rail-gap': railFit.gap + 'px' }">
            <li v-for="{ l, i } in shownRows" :key="l.id || i" class="rail-sq" :class="railClass(l, i)"
                role="button" tabindex="-1" :title="`${flowPos(i) ? 'Line ' + flowPos(i) : 'Already recorded'}: ${lineStateWords(l)}`"
                :aria-label="flowPos(i) ? `Go to line ${flowPos(i)}` : 'Go to an already-recorded line'" @click="onRailTap(i)"></li>
          </ol>
          <!-- THE LEGEND (Aran, 2026-10-15): the squares used to say nothing, and in light mode
               green and red were painted grey, so saved looked like not-yet-recorded. -->
          <ul ref="railLegendRef" class="rail-legend" data-test="rail-legend">
            <li v-for="k in RAIL_LEGEND" :key="k.state"><i class="rail-sq" :class="k.state"></i>{{ k.words }}</li>
          </ul>
        </div>

        <!-- ── Ready: the batch page, with the first line already in place ─────────────── -->
        <main v-if="phase === 'ready'" class="rc-card centre" data-test="ready">
          <div class="centre-line">
            <!-- THE SETUP CHECK (Tom, r-2026-10-07): while the script is locked, the way into the
                 ten phrases replaces Start. -->
            <div v-if="voice.setupCheck" class="setup-card">
              <template v-if="voice.setupCheck.status === 'submitted'">
                <strong>Thank you — your setup check is with us.</strong>
                <span>We'll listen and open your full script as soon as it is approved. Nothing more to do.</span>
                <span v-if="voice.setupCheck.autoVerdict && voice.setupCheck.autoVerdict.verdict === 'pass'" class="setup-note setup-verdict-pass">Our quick sound check: your recording sounds good.</span>
                <template v-else-if="voice.setupCheck.autoVerdict && voice.setupCheck.autoVerdict.verdict === 'retry'">
                  <span class="setup-note setup-verdict-retry">Our quick sound check suggests a small change, so please try again:</span>
                  <span v-for="r in voice.setupCheck.autoVerdict.reasons" :key="r" class="setup-note setup-verdict-reason">{{ r }}</span>
                </template>
              </template>
              <template v-else>
                <strong>First, a 10-phrase setup check.</strong>
                <span>Record ten phrases on the microphone and in the room you will really use. We listen, and the full script opens as soon as it is approved.</span>
                <span v-if="voice.setupCheck.status === 'changes' && voice.setupCheck.note" class="setup-note">From us: {{ voice.setupCheck.note }}</span>
                <router-link :to="`/r/${voice.setupCheck.packVoiceId}`" class="btn-begin setup-go">Start the 10-phrase setup check</router-link>
              </template>
            </div>
            <!-- A setup pack's own page carries Submit, above the line. -->
            <div v-if="voice.pack && voice.pack.setup && voice.pack.setup.status !== 'approved'" class="setup-card">
              <template v-if="voice.pack.setup.status === 'submitted'">
                <strong>Submitted — thank you.</strong>
                <span>We'll open your full script once we've listened. You can close this page.</span>
                <span v-if="voice.pack.setup.autoVerdict && voice.pack.setup.autoVerdict.verdict === 'pass'" class="setup-note setup-verdict-pass">Our quick sound check: your recording sounds good.</span>
                <template v-else-if="voice.pack.setup.autoVerdict && voice.pack.setup.autoVerdict.verdict === 'retry'">
                  <span class="setup-note setup-verdict-retry">Our quick sound check suggests a small change, so please try again:</span>
                  <span v-for="r in voice.pack.setup.autoVerdict.reasons" :key="r" class="setup-note setup-verdict-reason">{{ r }}</span>
                  <button v-if="readyCanSubmit" class="btn-begin setup-go" :disabled="setupSubmitting" @click="submitSetup">
                    {{ setupSubmitting ? 'Sending…' : 'Submit my setup check' }}
                  </button>
                  <span v-if="setupError" class="setup-note">{{ setupError }}</span>
                </template>
              </template>
              <template v-else>
                <strong>{{ voice.recorded }} of {{ voice.total }} recorded{{ voice.recorded >= SETUP_MIN_SUBMIT || queue.pendingCount.value > 0 ? '' : `, record at least ${SETUP_MIN_SUBMIT}` }}.</strong>
                <span v-if="queue.pendingCount.value > 0" class="setup-note">{{ queue.pendingCount.value }} still uploading. You can submit once they have all gone up.</span>
                <span v-else-if="queue.failed.size > 0" class="setup-note">{{ queue.failed.size }} did not upload yet. Retry them, then submit.</span>
                <span v-if="voice.pack.setup.status === 'changes' && voice.pack.setup.note" class="setup-note">From us: {{ voice.pack.setup.note }}</span>
                <button v-if="readyCanSubmit" class="btn-begin setup-go" :disabled="setupSubmitting" @click="submitSetup">
                  {{ setupSubmitting ? 'Sending…' : 'Submit my setup check' }}
                </button>
                <span v-if="setupError" class="setup-note">{{ setupError }}</span>
              </template>
            </div>

            <template v-if="!voice.setupCheck">
              <template v-if="startLine">
                <p v-if="startKindWords" class="line-kind">{{ startKindWords }}</p>
                <p class="ready-line" data-test="ready-line">{{ plainText(startLine.text) }}</p>
                <p v-if="startLine.knownText" class="line-known">{{ plainText(startLine.knownText) }}</p>
                <!-- EDIT THIS LINE (Aran, 2026-10-15, job #709): Tom, Aran and Kai only — the server
                     decides (lineEditor), and it is never on the stage while the mic is live. -->
                <button v-if="lineEditor && isRowLine(startLine)" type="button" class="ble-open" data-test="admin-edit-line" @click="openLineEditor(startLine)">Edit this line</button>
                <!-- WHERE HE LEFT OFF is not always the first line still owed: say which, and offer both. -->
                <p v-if="readyIndex !== startIndex" class="ready-where" data-test="ready-where">
                  Line {{ flowPos(readyIndex) }} of {{ flowIndices.length }} · {{ lineStateWords(startLine) }} — where you left off.
                  <button v-if="startIndex !== -1" type="button" class="setline-change" data-test="ready-to-unrecorded" @click="pinCursor(null)">Start at the first unrecorded line ({{ flowPos(startIndex) }}) instead</button>
                </p>
              </template>
              <template v-else>
                <p class="ready-line all-done">Everything is recorded.</p>
                <p v-if="batchUploadingNote" class="note done" data-test="batch-uploading">{{ batchUploadingNote }}</p>
                <p class="note done">Open <strong>Lines &amp; settings</strong> and tap any line to read it again.</p>
              </template>
            </template>
            <p v-if="micError" class="note error">{{ micError }}</p>
          </div>
          <!-- ONE COUNT AND ONE BAR, said once (it used to be said three ways). -->
          <div class="meta">
            <span class="rc-progress-line">{{ queueHeadline }}</span>
            <span class="bar"><i :style="{ width: progressPct + '%' }"></i></span>
          </div>
        </main>

        <!-- ── Recording: ONE line, big ────────────────────────────────────────────────── -->
        <main v-else-if="phase === 'recording'" class="stage centre" :class="{ 'is-paused': paused }">
          <!-- REFUSED LINES COME UP IN THE NORMAL FLOW (Aran, 2026-10-15, live: "The actual phrases
               should be coming up as normal in the recording tool"). A refused line is simply a line
               still to read: red on the rail, "refused" in the status row, reached by › or by Jump to
               next unrecorded, and shown like any other line with one small reason under it. The only
               thing up here is this ONE slim bar, and it never sits over the line. It replaced a
               stack of red notices, one per refused take, that hid the line being read (#679). -->
          <p v-if="refusedInBatch.length" class="refused-summary" :class="{ quiet: refusedAllNoSpeech }" role="status" data-test="refused-summary">
            <span v-if="refusedAllNoSpeech">No speech heard on {{ refusedInBatch.length === 1 ? '1 line' : refusedInBatch.length + ' lines' }}</span>
            <span v-else>{{ refusedInBatch.length }} {{ refusedInBatch.length === 1 ? 'line needs' : 'lines need' }} re-recording</span>
            <template v-if="firstRefusedIndex !== index">
              ·
              <button type="button" class="refused-go" data-test="refused-go-first"
                      :disabled="busy || arming || !!editingId" @click="goToLine(firstRefusedIndex)">Go to first</button>
            </template>
          </p>
          <div class="centre-line">
            <p v-if="paused" class="pnote">Paused — nothing is being recorded. That attempt was thrown away.</p>
            <!-- THE CROSSING (Aran, 2026-09-10): drawn in flow above the line, interrupts nothing,
                 gone as soon as he moves on. -->
            <p v-if="!arming && crossingNote" class="crossing">
              You've crossed from <strong>{{ crossingNote.from }}</strong> into <strong>{{ crossingNote.to }}</strong>.
            </p>
            <!-- THE LINE BEFORE THIS ONE, whoever says it. Greyed, small, nothing to touch. -->
            <ul v-if="!arming && cueBefore.length" class="cue cue-before" data-surface="cue-lines">
              <li v-for="(c, i) in cueBefore" :key="'b' + i" class="cue-line">
                <span v-if="c.speaker" class="cue-speaker">{{ c.speaker }}</span>
                <span class="cue-text">{{ plainText(c.text) }}</span>
              </li>
            </ul>
            <!-- THE LINE IS HELD BACK WHILE THE RECORDER FILLS (COLD_START_SETTLE_MS in
                 useTapRecorder): the mic opens first and the line follows. -->
            <div v-if="arming" class="line-well arming-well">
              <p class="arming-words">Getting ready…</p>
            </div>
            <!-- REWRITING THE LINE BEING READ happens INSIDE this well, replacing the words and
                 nothing else (Tom, 2026-09-03). `canEditText` is the server's word, per line. -->
            <div v-else class="line-well" :class="{ editing: editingId === current?.id }">
              <!-- WHAT KIND OF LINE THIS IS, in words: a seed sentence reads exactly like a pod
                   line and files somewhere completely different. -->
              <p v-if="lineKindWords" class="line-kind">{{ lineKindWords }}</p>
              <!-- Narration markup (<src>/<tgt>) is parsed into spans, never v-html. TAP IS THE
                   ONLY AFFORDANCE: the line is the control on a test course. -->
              <textarea
                v-if="editingId === current?.id"
                ref="editBox"
                v-model="editText"
                class="line-target edit-box"
                rows="1"
                :style="{ height: editBoxHeight }"
                :disabled="editSaving"
                @input="sizeEditBox"
                @keydown.esc.prevent="cancelEdit"
                @keydown.enter.prevent="commitEdit"
                @blur="commitEdit"
              ></textarea>
              <p v-else class="line-target" :class="{ tappable: current?.canEditText }"
                 @click="onLineTap($event)">
                <span
                  v-for="(seg, i) in currentSegments"
                  :key="i"
                  :class="['seg', 'seg-' + seg.kind]"
                >{{ seg.text }}</span>
              </p>
              <p v-if="editError" class="note error">{{ editError }}</p>
              <p v-if="current?.knownText" class="line-known">{{ plainText(current.knownText) }}</p>
              <!-- The line being read never carries a VERDICT on an earlier take of it (Tom,
                   2026-09-02). A refusal is not a verdict on a stored take — nothing was stored —
                   so a refused line says why in one small line, under the words, never over them
                   (Aran, 2026-10-15). -->
              <p v-if="currentRefusedWhy" class="refused-why" :class="{ quiet: currentRefusedNoSpeech }" data-test="refused-why"
                 :title="queue.failed.get(current.id) || (textCheckFails.get(current.id) || {}).reason || null">{{ currentRefusedWhy }}</p>
            </div>
            <!-- AND THE LINE AFTER IT. Same rules. -->
            <ul v-if="!arming && cueAfter.length" class="cue cue-after" data-surface="cue-lines">
              <li v-for="(c, i) in cueAfter" :key="'a' + i" class="cue-line">
                <span v-if="c.speaker" class="cue-speaker">{{ c.speaker }}</span>
                <span class="cue-text">{{ plainText(c.text) }}</span>
              </li>
            </ul>
            <p v-if="savedNote" class="saved-note">{{ savedNote }}</p>
            <!-- WHAT IS COMING, dimmed and small: one line on a phone, three on a desktop. -->
            <!-- The count stays on the last line too: › ends the run there, and any line still owed
                 behind him is one tap away on "Jump to next unrecorded". -->
            <div v-if="upcoming.length || remainingToRead" class="upnext">
              <p class="upnext-head">{{ upcoming.length ? 'Coming up · ' : '' }}{{ remainingToRead }} still to read</p>
              <ol v-if="upcoming.length" class="upnext-list">
                <li v-for="l in upcoming" :key="l.id">{{ plainText(l.text) }}</li>
              </ol>
            </div>
          </div>
          <p v-if="failedNote" class="note error">{{ failedNote }}</p>
          <p v-if="playbackError" class="note error">{{ playbackError }}</p>
        </main>

        <!-- ── Done: C's mic-off check, a list of this session's takes ─────────────────── -->
        <main v-else class="rc-card centre done-card" data-test="done">
          <h2>{{ doneHeadline }}</h2>
          <p class="rc-progress-line">You read {{ readThisSession }} {{ readThisSession === 1 ? 'line' : 'lines' }}.</p>
          <p v-if="batchUploadingNote" class="note" data-test="batch-uploading">{{ batchUploadingNote }}</p>
          <p v-if="queue.pendingCount.value > 0" class="note">{{ doneNote }}</p>
          <p v-else-if="sessionLines.length" class="done-sub">Hear any take, or read it again.</p>

          <div v-if="failedList.length" class="redo-list">
            <h3>{{ failedList.length }} {{ failedList.length === 1 ? 'line' : 'lines' }} did not save</h3>
            <ul>
              <li v-for="l in failedList" :key="l.id">
                <span class="redo-text">{{ plainText(l.text) }}</span>
                <span class="redo-why" :title="queue.failed.get(l.id) || null">{{ refusedLineWords(queue.failed.get(l.id)) }}</span>
                <button class="redo-btn" @click="recordOne(l.id)">Record it again</button>
              </li>
            </ul>
          </div>

          <!-- THE SETUP CHECK's Submit on the DONE card (job #844): offered once nothing is
               pending or failed; the server still re-checks that every phrase has a take. -->
          <div v-if="canSubmitSetupHere" class="setup-card">
            <strong>That's your setup check recorded.</strong>
            <button class="btn-begin setup-go" :disabled="setupSubmitting" @click="submitSetup">
              {{ setupSubmitting ? 'Sending…' : 'Submit my setup check' }}
            </button>
            <span v-if="setupError" class="setup-note">{{ setupError }}</span>
          </div>
          <div v-else-if="setupIncompleteHere" class="setup-card">
            <strong>{{ setupRecorded }} of {{ lines.length }} recorded, record at least {{ SETUP_MIN_SUBMIT }}.</strong>
          </div>

          <div v-if="sessionLines.length" class="listen-back done-list">
            <ul>
              <li v-for="l in sessionLines" :key="l.id" :class="['stacked', { playing: playingId === l.id }]">
                <div class="listen-row">
                  <span class="listen-text">{{ plainText(l.text) }}</span>
                  <div class="listen-actions">
                    <StoredTakeButton
                      :stored-url="storedUrlFor(l.id)"
                      :pending="isPending(l.id)"
                      :failed="hasFailed(l.id)"
                      :local-url="localUrlFor(l.id)"
                      :is-playing="playingId === l.id"
                      @toggle="togglePlay(l.id)"
                    />
                    <button
                      v-if="queue.saved.has(l.id)"
                      class="cmp-btn"
                      :class="{ open: comparingId === l.id }"
                      type="button"
                      @click="toggleCompare(l.id)"
                    >{{ comparingId === l.id ? 'Hide' : 'Raw vs processed' }}</button>
                    <button class="cmp-btn again-btn" type="button" @click="recordOne(l.id)">Again</button>
                  </div>
                </div>
                <RawVsProcessed v-if="comparingId === l.id" :voice-id="voiceId" :line-id="l.id" />
              </li>
            </ul>
            <p v-if="playbackError" class="note error">{{ playbackError }}</p>
          </div>
          <p v-if="micError" class="note error">{{ micError }}</p>
        </main>
      </div>

      <!-- THE TRANSPORT, PINNED TO THE BOTTOM EDGE and the only thing under the thumb. Aran
           accepted Next under the line on 2026-10-14 (job #424), reversing his 11 Sep ask; pinning
           answers that ask's reason, which was controls below the fold. Same buttons, same
           bindings, same advance-lock. -->
      <footer class="transport" data-test="transport">
        <div v-if="phase === 'ready'" class="transport-in one">
          <!-- NOTHING LEFT IN THIS BATCH: the way on is the big button, not a dead one (Aran, 2026-10-15). -->
          <!-- A POD LINK WITH NOTHING LEFT IN ITS POD carries on into the next pod (Kai, 2026-10-16, job #189). -->
          <template v-if="!voice.setupCheck && podFinished">
            <button v-if="nextPod" class="btn-begin btn-next-batch" data-test="next-pod" @click="openNextPod">{{ nextPodWords }}</button>
            <p v-else class="pods-all-done" data-test="pods-all-done">{{ allPodsDoneWords }}</p>
            <!-- NO "See your other lines" (Kai and Aran, 2026-10-16, job #247): an actor is shown only
                 what we put in their queue, never a path to the rest of their cast backlog. -->
          </template>
          <button v-else-if="!voice.setupCheck && startIndex === -1 && nextBatch" class="btn-begin btn-next-batch" data-test="next-batch" @click="openNextBatch">Next batch →</button>
          <template v-else-if="!voice.setupCheck && startIndex === -1 && batchScope">
            <p v-if="nothingLeftAnywhere" class="pods-all-done" data-test="all-batches-done">Nothing left to record anywhere — thank you</p>
            <button class="btn-begin btn-next-batch" data-test="back-home" @click="goHome">Back to home</button>
          </template>
          <button v-else-if="!voice.setupCheck" class="btn-begin" :disabled="startIndex === -1" @click="begin">
            {{ startIndex === -1 ? 'Nothing left to read' : 'Start recording' }}
          </button>
          <!-- HOME STAYS, SECOND to Next batch (Aran, 2026-10-16, job #203). -->
          <button v-if="!voice.setupCheck && !podFinished && startIndex === -1 && nextBatch" type="button" class="btn-ghost home-link" data-test="home-link" @click="goHome">Home</button>
          <!-- SETTINGS, FOLDED INTO ONE LINE before Start: how the run moves on and which mic. -->
          <p class="setline" data-test="setline">
            {{ autoAdvance ? 'Moves on when you stop' : 'Tap Next after each line' }} · {{ captureProfile === 'pro' ? 'Plugged-in mic' : 'Phone mic' }}
            · <button type="button" class="setline-change" @click="openSheet('settings')">Change</button>
          </p>
        </div>
        <!-- The transport is dead while the editor is open and while paused: the mic is held, so
             Next would close a take of nothing. BACK IS LIVE WHILE PAUSED (Aran, 2026-09-10): it
             files nothing. -->
        <template v-else-if="phase === 'recording'">
        <!-- STOP AND PAUSE SIT DIRECTLY ABOVE BACK / AGAIN / NEXT (Aran, 2026-10-15, job #681: up in
             the status row he did not notice them; this overrides the earlier keep-them-far-from-
             the-thumb placement). Big, filled, one row, never in the status row as well. Stop is
             dead while the editor is open: it files nothing on the line he is standing on.
             PAUSE THROWS THE ATTEMPT AWAY (Aran, 2026-09-03): it discards the open capture and
             stops the microphone being a witness to whatever happens next; Resume re-opens the
             SAME line clean. It is the booth's existing hold (`micHeld`); `paused` says which. -->
        <div class="sp-row" data-test="stop-pause">
          <button class="btn-finish" type="button" data-test="stop" aria-label="Stop recording" :disabled="busy || arming || !!editingId" @click="onFinish">Stop</button>
          <button
            class="ctl-pause"
            :class="{ paused }"
            :disabled="arming || !!editingId || (busy && !paused)"
            type="button"
            data-test="pause"
            @click="togglePause"
          >{{ paused ? 'Resume' : 'Pause' }}</button>
        </div>
        <!-- ‹ AND › SIDE BY SIDE, ONE LINE EACH WAY (Aran, 2026-10-15). › files what he read on
             this line and lands on the next one; ‹ throws the open capture away and goes one back.
             Neither ever skips. Jumping ahead is its own, labelled control underneath. -->
        <div class="transport-in live controls">
          <button class="ctl-again" :disabled="busy || arming || paused || !!editingId" @click="onAgain">Again</button>
          <div class="ctl-arrows">
            <button class="ctl-back" title="Previous line" aria-label="Previous line" :disabled="!canGoBack || busy || arming || !!editingId" @click="onBack">‹</button>
            <button class="ctl-next" :title="hasNext ? 'Next line' : 'Done'" :aria-label="hasNext ? 'Next line' : 'Done'" :disabled="busy || arming || paused || !!editingId" @click="onNext()">{{ hasNext ? '›' : 'Done' }}</button>
          </div>
        </div>
        <button class="ctl-jump" type="button" data-test="jump-unrecorded"
                :disabled="nextUnrecordedIndex === -1 || busy || arming || paused || !!editingId"
                @click="onJumpUnrecorded">{{ nextUnrecordedIndex === -1 ? 'Every line is recorded' : `Jump to next unrecorded (line ${flowPos(nextUnrecordedIndex)}) »` }}</button>
        </template>
        <div v-else class="transport-in" :class="{ one: !nextBatch && !batchScope && !nextPod }">
          <button class="btn-ghost" @click="backToStart">Back to my lines</button>
          <button v-if="nextPod" class="btn-begin btn-next-batch" data-test="next-pod" @click="openNextPod">{{ nextPodWords }}</button>
          <button v-else-if="nextBatch" class="btn-begin btn-next-batch" data-test="next-batch" @click="openNextBatch">Next batch →</button>
          <button v-else-if="batchScope" class="btn-begin btn-next-batch" data-test="back-home" @click="goHome">Back to home</button>
        </div>
        <p v-if="phase === 'recording'" class="kbd-hint">
          <kbd>Space</kbd> next · <kbd>R</kbd> again · <kbd>P</kbd> pause · <kbd>B</kbd> back · <kbd>J</kbd> jump to unrecorded
        </p>
      </footer>

      <!-- ── THE SHEET: everything that is not the line ──────────────────────────────────
           Drawn while the batch page or the done screen is up, shown on a tap; never while the
           mic is live. It is v-show, not v-if, so the map's open sections and a half-typed
           filter survive closing it. -->
      <!-- A SIDEBAR on a desktop (the line stays in view, pushed to the left), a DROPDOWN under the
           where-am-I row on a phone. Closes by the ✕, a click/tap on the dimmed area, Esc, or a
           swipe up on the head/grab bar. Never a full page. -->
      <div v-if="phase !== 'recording'" v-show="sheetOpen" class="sheet-scrim" data-test="sheet-scrim" @click="closeSheet"></div>
      <div v-if="phase !== 'recording'" v-show="sheetOpen" class="sheet" :style="{ '--sheet-top': sheetTop + 'px' }" role="dialog" aria-label="Lines and settings" data-test="sheet">
        <div class="sheet-head" data-test="sheet-head" @touchstart.passive="swipeStart" @touchend.passive="swipeEnd">
          <p class="sheet-title">Lines &amp; settings</p>
          <button type="button" class="sheet-close" data-test="close-sheet" aria-label="Close lines and settings" @click="closeSheet"><span aria-hidden="true">✕</span><span class="sc-word"> Close</span></button>
        </div>
        <div class="sheet-body">
          <!-- THE NAV (Tom, 2026-09-12): the whole list, each pod this voice is cast in and the
               course Overview. In the sheet, never on the stage. -->
          <nav class="rc-nav" aria-label="Booth navigation">
            <button type="button" class="rc-nav-item rc-nav-btn" @click="goToLines">Lines</button>
            <template v-if="navPods.length">
              <span class="rc-nav-dot">·</span>
              <span class="rc-nav-word">{{ navPods.length === 1 ? 'Pod' : 'Pods' }}</span>
              <router-link v-for="p in navPods" :key="p.key" :to="p.to" class="rc-nav-item rc-nav-pod">{{ p.label }}</router-link>
            </template>
            <template v-if="navCourses.length">
              <span class="rc-nav-dot">·</span>
              <router-link v-for="c in navCourses" :key="c.code" :to="c.to" class="rc-nav-item rc-nav-course">{{ c.label }}</router-link>
            </template>
          </nav>

          <!-- EVERY LINE OF THIS BATCH, READABLE (Aran, 2026-10-15): the map below was grey squares
               you had to hover to read, which a phone cannot do. One row per line: its number, the
               words, the known side small beneath, and the rail's coloured dot. The words are the way
               onto the line (the cursor goes there; Start opens on it); ▶ plays his take of it where
               it sits and moves nothing. -->
          <section v-if="lines.length" class="batch-lines" data-test="batch-lines-wrap">
            <h3 class="bl-head">{{ batchScope ? 'Lines in this batch' : 'Your lines' }} · {{ recordedCount }} of {{ lines.length }} recorded</h3>
            <ol class="bl-list" data-test="batch-lines">
              <li v-for="{ l, i } in shownRows" :key="l.id || i" class="bl-row" :class="{ now: i === readyIndex, playing: playingId === l.id, hidden: !flowPos(i) }">
                <button type="button" class="bl-go" :aria-label="flowPos(i) ? `Go to line ${flowPos(i)}` : 'Go to this already-recorded line'" :aria-current="i === readyIndex ? 'true' : null" @click="onListTap(i)">
                  <span class="bl-num">{{ flowPos(i) || '✓' }}</span>
                  <i class="bl-dot" :class="lineDot(l)" :title="lineStateWords(l)" aria-hidden="true"></i>
                  <span class="bl-words">
                    <span class="bl-text">{{ plainText(l.text) }}</span>
                    <span v-if="l.knownText" class="bl-known">{{ plainText(l.knownText) }}</span>
                  </span>
                </button>
                <button v-if="hasTake(l)" type="button" class="bl-play" :class="{ on: playingId === l.id }"
                        :aria-label="playingId === l.id ? `Stop line ${i + 1}` : `Play your take of line ${i + 1}`"
                        @click="playFromList(l.id)">{{ playingId === l.id ? '■' : '▶' }}</button>
                <!-- AGAIN / RECORD ON EVERY ROW (Aran, 2026-10-15): open the mic on THAT line, the same
                     door the map's "Read it again" uses. Separate from the words, so a tap on the words
                     only moves the cursor and ▶ only plays. -->
                <button type="button" class="bl-again" data-test="batch-line-record"
                        :aria-label="`${hasTake(l) ? 'Record again' : 'Record'} line ${flowPos(i) || '(already recorded)'}`"
                        @click="recordFromSheet(l.id)">{{ hasTake(l) ? 'Again' : 'Record' }}</button>
              </li>
            </ol>
            <ul class="bl-legend">
              <li v-for="k in RAIL_LEGEND" :key="k.state"><i class="bl-dot" :class="k.state"></i>{{ k.words }}</li>
            </ul>
            <p v-if="playbackError" class="note error">{{ playbackError }}</p>
          </section>

          <!-- THE PRACTICE-PHRASE BATCH (Aran, 2026-10-13, job #619): which pass, which batch of
               how many, and that the rest come later. -->
          <div v-if="showPhraseCard" class="volume-card phrase-card" data-test="phrase-batch">
            <template v-if="phrases.pass">
              <p class="phrase-kicker">Practice phrases · {{ boothCourseWords(phrases.courseCode, phrases.courseLabel) }}</p>
              <h3 class="phrase-title">Pass {{ phrases.pass }} of {{ phrases.passes }} · Batch {{ phrases.batch }} of {{ phrases.batches }}</h3>
              <p class="phrase-count">{{ phrases.batchRecorded }} of {{ phrases.batchLines }} recorded in this batch</p>
              <p v-if="phrases.pass === 1" class="volume-note">
                This first pass is the phrases the app plays first: up to {{ phrases.firstPass.build }} build and
                {{ phrases.firstPass.use }} use phrases for each new LEGO.
                The remaining {{ phrases.laterPassLines.toLocaleString() }} phrases come on a second pass, later.
              </p>
              <p v-else class="volume-note">This second pass is the rest of the practice phrases, after the first pass.</p>
              <p class="volume-note">
                {{ phrases.batch < phrases.batches ? `When this batch is finished, batch ${phrases.batch + 1} opens here the next time you open this page.` : (phrases.pass === 1 ? 'This is the last batch of the first pass.' : 'This is the last batch.') }}
                <template v-if="phrases.batchHeld"> {{ phrases.batchHeld }} {{ phrases.batchHeld === 1 ? 'phrase in this batch is' : 'phrases in this batch are' }} held back until {{ phrases.batchHeld === 1 ? 'its' : 'their' }} proof flag is cleared.</template>
              </p>
            </template>
            <template v-else>
              <h3 class="phrase-title">Practice phrases — all recorded</h3>
              <p class="volume-note">Both passes are finished. Thank you.</p>
            </template>
          </div>

          <!-- HOW MUCH OF THE COURSE (Tom's minimal set): shown only when there IS a set. -->
          <div v-if="quarry" class="volume-card">
            <h3>The minimal set — {{ quarry.lines }} lines, about {{ quarry.minutes }} minutes</h3>
            <p class="volume-note">
              {{ quarry.legos }} chunks and {{ quarry.words }} single words, read slowly, plus
              {{ quarry.sentences }} whole sentences at your natural pace. Spliced back together, they make every
              phrase in the first {{ quarry.maxSeed }} sentences of the course.
            </p>
            <div class="volume-row">
              <span class="volume-label">How much of the course?</span>
              <button
                v-for="n in SEED_VOLUMES" :key="n" type="button"
                class="volume-btn" :class="{ on: (quarry.maxSeed || 0) === n }"
                :disabled="phase !== 'ready'"
                @click="setVolume(n)"
              >{{ n }}</button>
            </div>
          </div>

          <!-- WORK HE HAS ALREADY DONE, WHICH LEFT HIS LIST; and work that cannot be read yet.
               Neither is a job, and neither has a button. -->
          <div v-if="handedOnNotes.length" class="handed-on">
            <p v-for="n in handedOnNotes" :key="n.key">
              <strong>You recorded {{ n.lines }} more {{ n.lines === 1 ? 'line' : 'lines' }} of {{ n.heading }}</strong>
              that {{ n.lines === 1 ? 'has' : 'have' }} since been given to {{ n.castTo }} to read.
              Your {{ n.lines === 1 ? 'take is' : 'takes are' }} still there — {{ n.lines === 1 ? 'it is' : 'they are' }}
              just not on your list any more, because {{ n.lines === 1 ? 'that line is' : 'those lines are' }}
              {{ n.castTo }}'s now.
            </p>
          </div>
          <div v-if="notReadyNotes.length" class="not-ready">
            <p v-for="n in notReadyNotes" :key="n.key">
              <strong>{{ n.lines }} more {{ n.lines === 1 ? 'line' : 'lines' }} of {{ n.heading }}</strong>
              {{ n.lines === 1 ? 'is' : 'are' }} still waiting to be written in {{ voice.languageName || 'the language' }}.
              {{ n.lines === 1 ? 'It' : 'They' }} can't be read until somebody writes {{ n.lines === 1 ? 'it' : 'them' }} —
              nothing of yours has gone missing.
            </p>
          </div>

          <section ref="settingsRef" class="sheet-settings" data-test="settings">
            <h3>How the run behaves</h3>
            <ol class="how-to">
              <li>Tap <strong>Start</strong> and read the line aloud. It is already recording.</li>
              <!-- THIS STEP MUST MATCH THE SWITCH BELOW IT. -->
              <li v-if="autoAdvance">Stop talking and it moves on by itself — you do not have to tap anything.</li>
              <li v-else>When you've finished the line, tap <strong>Next</strong>. Nothing cuts you off mid-sentence.</li>
              <li v-if="autoAdvance && quarry">On <strong>the minimal set</strong> it waits for you — tap <strong>Next</strong> after each chunk. The gaps you leave are the point, so nothing listens for you to stop.</li>
              <li>Tap <strong>Again</strong> to re-read a line<span v-if="autoAdvance">, <strong>Next</strong> to push on early</span>.</li>
              <li>Tap <strong>Stop</strong> when you've had enough. It saves itself.</li>
            </ol>

            <label class="toggle-row">
              <input type="checkbox" v-model="autoAdvance" />
              <span><strong>Move on by itself when I stop speaking</strong>
                <small>On = just read, and keep reading. Turn it off in a noisy room and use Next instead.</small></span>
            </label>

            <div v-if="recorder.devices.value.length > 1" class="mic-pick">
              <label class="mic-label">Microphone</label>
              <select v-model="selectedDeviceId" class="mic-select">
                <option v-for="(d, i) in recorder.devices.value" :key="d.deviceId" :value="d.deviceId">{{ d.label || `Microphone ${i + 1}` }}</option>
              </select>
            </div>

            <div class="setup-pick" role="radiogroup" aria-label="Phone?">
              <label class="toggle-row">
                <input type="radio" name="setup" value="phone" v-model="captureProfile" />
                <span><strong>Phone?</strong>
                  <small>Hold at comfortable reading distance so you can clearly see the phone screen. About the distance you hold the phone when texting. iPhone 16 or later for best results.</small></span>
              </label>
              <label class="toggle-row">
                <input type="radio" name="setup" value="pro" v-model="captureProfile" />
                <span><strong>Recording with a professional plugged-in mic</strong></span>
              </label>
            </div>
          </section>

          <!-- THE MAP: every line, each a way back onto it ("Read it again"). The list above replaced
               it as the way to read a batch (Aran, 2026-10-15), so the squares are behind a toggle. -->
          <button type="button" class="grid-toggle" data-test="grid-toggle" :aria-expanded="showGrid ? 'true' : 'false'" @click="showGrid = !showGrid">
            {{ showGrid ? 'Hide the squares' : 'Show every line as squares' }}
          </button>
          <div v-show="showGrid" class="grid-wrap">
          <RecordistRoster
            ref="rosterRef"
            :sections="rosterSections"
            :playing-id="playingId"
            :editing-id="editingId"
            :editing-side="editingSide"
            :saving="editSaving"
            :error="editError"
            :saved-note="savedNote"
            :saved-id="savedId"
            @play="togglePlay"
            @record="recordFromSheet"
            @edit="beginEdit"
            @edit-known="beginEdit($event, null, 'known')"
            @cancel-edit="cancelEdit"
            @save="saveEdit($event.id, $event.text, $event.side)"
            :admin-edit="lineEditor"
            @admin-edit="openLineEditor($event)"
          />
          </div>

          <!-- THERE IS NO "RE-READ LINES I'VE ALREADY RECORDED" SWITCH (Tom, 2026-09-11): a line
               with a confirmed take is never served again as a thing to read. Hearing back what
               you have recorded is its own switch, and it does not change which lines are served. -->
          <label class="toggle-row">
            <input type="checkbox" v-model="showRecorded" />
            <span><strong>Show everything I've already recorded</strong>
              <small>A list of every line you have read, grouped the same way as the map above. Play any of them back. It
                does not change which lines you are asked to read.</small></span>
          </label>

          <div v-if="showRecorded && alreadyRecorded.length" class="listen-back">
            <h3>What you've already recorded — {{ alreadyRecorded.length }}</h3>
            <p class="listen-note">Everything you have read, in every part of the list. These play the clip stored on the
              server. Tap <strong>Compare</strong> to hear your original take next to the processed one learners hear.</p>
            <input
              v-if="alreadyRecorded.length > RECORDED_FILTER_THRESHOLD"
              v-model="recordedFilter"
              type="search"
              class="listen-filter"
              placeholder="Find a line…"
              autocomplete="off"
            />
            <p v-if="recordedFilter && !alreadyRecordedShown.length" class="listen-note">Nothing matches “{{ recordedFilter }}”.</p>
            <div v-for="s in recordedSectionList" :key="s.key" class="listen-sec">
              <button
                type="button"
                class="listen-sec-head"
                :aria-expanded="isRecordedSectionOpen(s) ? 'true' : 'false'"
                @click="toggleRecordedSection(s.key)"
              >
                <span class="lsh-mark" aria-hidden="true">{{ isRecordedSectionOpen(s) ? '–' : '+' }}</span>
                <span class="lsh-count">{{ s.count }}</span>
                <span class="lsh-name">{{ s.heading }}</span>
              </button>
              <ul v-if="isRecordedSectionOpen(s)">
                <li v-for="l in s.rows" :key="l.id" :class="['stacked', { playing: playingId === l.id }]">
                  <div class="listen-row">
                    <span class="listen-text">{{ plainText(l.text) }}</span>
                    <div class="listen-actions">
                      <StoredTakeButton
                        :stored-url="storedUrlFor(l.id)"
                        :allow-local="false"
                        :is-playing="playingId === l.id"
                        @toggle="togglePlay(l.id)"
                      />
                      <button class="cmp-btn" :class="{ open: comparingId === l.id }" type="button" @click="toggleCompare(l.id)">
                        {{ comparingId === l.id ? 'Hide' : 'Compare' }}
                      </button>
                    </div>
                  </div>
                  <RawVsProcessed v-if="comparingId === l.id" :voice-id="voiceId" :line-id="l.id" />
                </li>
              </ul>
            </div>
            <p v-if="playbackError" class="note error">{{ playbackError }}</p>
          </div>

          <!-- RE-RECORD ALL, the artist's own (job #885): same route the admin button calls, on
               THIS link's voice only. Nothing is deleted. -->
          <template v-if="phase === 'ready'">
          <div v-if="canRerecordAll" class="rerecord-all">
            <button class="btn-ghost" type="button" :disabled="rerecordBusy" @click="rerecordAllMine">
              {{ rerecordBusy ? 'Starting over…' : 'Re-record all' }}
            </button>
            <p v-if="rerecordError" class="note error">{{ rerecordError }}</p>
          </div>
          </template>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
// THE ONE RECORDIST SURFACE. The link IS the identity: whoever holds
// /r/:voiceId is that voice. No login, no role, no course picker, no pod slug,
// no mode picker, no gate, and never a "no voice slot assigned to you" warning
// — a recordist cannot fix any of those, so putting them on their screen only
// costs them a session. The queue is BY LANGUAGE: one Welsh recordist gets one
// Welsh queue, however many courses those lines happen to serve, which is why
// no course code appears anywhere on this page.
import { ref, computed, onMounted, onBeforeUnmount, onActivated, onDeactivated, watch, nextTick, inject } from 'vue'
import { routerKey, routeLocationKey } from 'vue-router'
import { recordingApiBase as apiBase, withBoothKey } from '@/services/recordingApi'
import { useTapRecorder, resolveCaptureProfile, MIN_VOICED_MS } from '@/composables/useTapRecorder'
import { loadBoothSettings, saveBoothSettings, micKeyFor } from './recordist/booth-settings.js'
import { useRecordistQueue, DURABLE_TAKES_FEATURE } from '@/composables/useRecordistQueue'
import { caretOffsetFromPoint, openEditorAt } from '@/utils/caretFromPoint'
import StoredTakeButton from '@/components/production/autocue/StoredTakeButton.vue'
import RawVsProcessed from '@/components/production/autocue/RawVsProcessed.vue'
import RecordistRoster from './recordist/RecordistRoster.vue'
import BoothLineEditor from './recordist/BoothLineEditor.vue'
import { canEditLines, isRowLine } from './recordist/line-edit-api.js'
import { useSectionCollapse } from './recordist/section-collapse'
import { recordistClipUrl, diagnoseRecordistClip } from '@/composables/useStoredClip'
import { createAdvanceLock } from './recordist/advance-lock'
import { cursorScopeKey, loadCursor, saveCursor, clearCursor } from './recordist/booth-cursor.js'
import { takeTargetAt, resolveTakeTarget } from './recordist/take-target.js'
import { twinKey, saidTwinKeys } from './recordist/spoken-words.js'
import { recordedSections } from './recordist/recorded-sections.js'
import { rememberBooth } from './recordist/booth-pointer.js'
import { boothCourseChip, boothPodChip, boothPodHeading, boothCourseWords, isBoothNewCourse } from './recordist/booth-chip-titles.js'
import BoothHome from './recordist/BoothHome.vue'
import { refusedLineWords, isNoSpeechRefusal, placeLines, goneRefusedLineIds } from './recordist/refused-takes.js'
import RerecordCard from './recordist/RerecordCard.vue'
import { mergeRerecord, oldRefusedIds, alsoIds } from './recordist/rerecord-list.js'
import { applyFailures, mismatchLineWords } from './recordist/text-check-failures.js'
// The re-record card's batch (job #788): services/voice-engine/booth-rerecord.cjs RERECORD_TRACK.
const RERECORD_TRACK = 'rerecord'
import { allowIdleReload, holdReload } from '@/router/versionReload'
import { loadUnticked, saveUnticked, loadSummarySnapshot, saveSummarySnapshot, keepListedSections, withDeviceTakes, loadPlaces, savePlaces, placeFromEntry, creditLoadedBatch, nextBatchAfter } from './recordist/booth-home.js'
import { headerLanguage } from './recordist/booth-tabs.js'
import { micSignal as micSignalFor } from './recordist/mic-signal.js'
import { fetchWithTimeoutRetry, LoadTimeoutError } from './recordist/fetch-with-timeout.js'
import { shouldRefreshQueue } from './recordist/queue-refresh.js'
import { stripBreakdownMarkers } from '@/utils/breakdownMarkers'
import { fitRail } from './recordist/rail-fit.js'

const props = defineProps({ voiceId: { type: String, required: true } })
// The page around a booth with language tabs (RecordistBooth.vue) holds the other tabs still mid-take.
const emit = defineEmits(['phase'])
// THE ADDRESS SAYS WHERE HE IS (job #347): home, a card's batches, or one batch.
// Read through the router when there is one, and straight off the address bar
// when there is not (a unit test mounts the booth bare), so the booth still
// keeps no hard router dependency.
const router = inject(routerKey, null)
const route = inject(routeLocationKey, null)
const addressTick = ref(0)
const addressQuery = computed(() => {
  if (route) return route.query
  void addressTick.value
  return Object.fromEntries(new URLSearchParams(window.location.search))
})
function goToAddress(query) {
  if (router) return router.push({ query })
  const qs = new URLSearchParams(query).toString()
  window.history.pushState({}, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`)
  addressTick.value += 1
}

const recorder = useTapRecorder()
// The queue asks the ROOM whether a line is recorded on the server, so a
// refused take left on the shelf by an earlier session is not counted or listed
// against a line this recordist has since read again (Tom, 2026-09-11: a
// refused take is a mark over a line, never a reason to ask for it again).
// The whole queue, read once on the home page while refused takes are on the device, so each one
// can be placed (section, batch) and re-recorded. Null until it has been read.
const locatorLines = ref(null)
const queue = useRecordistQueue({
  isLineRecorded: (lineId) => {
    const l = lines.value.find(x => x.id === lineId) || (locatorLines.value || []).find(x => x.id === lineId)
    return !!(l && l.recorded)
  },
})

const phase = ref('loading') // loading | unknown | error | home | ready | recording | done
const loadError = ref(null)
const loadSlow = ref(false)
const micError = ref(null)
const voice = ref({ displayName: '', languageName: '', total: 0, recorded: 0, remaining: 0 })
const lines = ref([])
// Job #842: takes that saved but did not match their words (lineId -> {takeId, heard, reason}),
// when he last queued a take of each line, and when the /rerecord list was last read.
const textCheckFails = ref(new Map())
const retakenAt = ref(new Map())
const rerecordReadAt = ref(0)

// WHETHER THE ALREADY-RECORDED LIST IS OPEN. This decides whether a panel is
// on the page and nothing about which lines the RUN serves — the run serves
// still-to-read lines only, always (`startIndex`, `nextIndexFrom`). A single
// flag once did both, and that meant an artist who
// wanted to hear a take back had to change how his session would be served to
// get at it. Remembered with the rest of the booth's settings.
const showRecorded = ref(false)
const selectedDeviceId = ref(null)
// Which mic profile to ask for. Voice-processed by default — on a phone that
// is what makes a take sound like a voice note rather than like a raw tap held
// at arm's length.
//
// NOT remembered, deliberately, and this is the whole of tonight's fix. It used
// to persist in localStorage under 'recordist.captureProfile', which meant one
// tick of a diagnostic toggle pinned that browser to the raw tap for every
// session afterwards, silently, with nothing on screen at the start of the next
// session saying so. Measured on Tom's 2026-09-02 session: the desktop, on the
// remembered dry profile, arrived at -18.9 dBFS raw peak needing +19.5 dB of
// lift and mastering out with a -34.9 dBFS noise floor; the phone, a browser
// with no stored key and therefore on the default, arrived at -2.5 dBFS and
// mastered to a -62.7 dBFS floor. Same person, same room, four minutes apart.
// He read it as a desktop-versus-phone difference. It was a stored preference.
//
// RAW OFF IS THE DEFAULT, EVERYWHERE (Tom, 2026-09-04, settled by ear on the
// hard case — a MacBook Air built-in mic with the air conditioning running:
// "Raw off, sounded great... so we are in good shape"). The user-agent
// heuristic that briefly chose per platform is gone; the reasoning for its
// removal, and for why Aran's Snowball finding is not lost by it, is in
// useTapRecorder.js.
//
// AND IT IS REMEMBERED — PER ARTIST AND PER MICROPHONE (Tom, 2026-09-03, having
// had to set it again every time he opened the room). The old flat key was
// device-blind, which is what made a stale tick dangerous; the whole reasoning
// is in recordist/booth-settings.js. That stale key is cleared on sight so no
// browser is still carrying one.
const recommendedProfile = resolveCaptureProfile()
const captureProfile = ref(recommendedProfile)
try { localStorage.removeItem('recordist.captureProfile') } catch { /* private mode */ }
// The mic this take was read into, and how it was asked for — the take's
// provenance row. The profile belongs in it: two takes of the same line under
// the two profiles are different recordings, and nothing else on the clip says
// which one you are listening to.
function micLabel() {
  const list = recorder.devices.value || []
  const chosen = selectedDeviceId.value
    ? list.find(d => d.deviceId === selectedDeviceId.value)
    : list[0]
  const mic = (chosen && chosen.label) || null
  // What the browser ACTUALLY did, not only what was asked for. The profile is
  // a request; getSettings() is the answer, and the two can differ — WebKit
  // ignores autoGainControl entirely. Without it, a take from after the
  // 2026-09-03 device-aware default cannot be told apart from one before it.
  const a = recorder.appliedSettings.value
  const got = a
    ? `got:ec${a.echoCancellation ? 1 : 0}ns${a.noiseSuppression ? 1 : 0}agc${a.autoGainControl ? 1 : 0}@${Math.round((a.sampleRate || 0) / 1000)}k`
    : null
  return [mic, `capture:${captureProfile.value}`, got].filter(Boolean).join(' · ')
}
// THE ONE CURSOR (Aran, 2026-10-15). `index` is the line he is on, and it is the
// ONLY notion of position in a batch. There used to be two: Next snapped to "the
// next line not yet recorded" (nextIndexFrom), and Back popped a remembered list
// of the lines he had walked (`visited`). Going back six lines to re-record one,
// then reading it, sent Next straight past the five lines he had just come back
// over — they were recorded, so the scan skipped them — and the next Back popped
// whatever was left on the old stack, which was the furthest back he had been.
// There was no way to stand on the line six back and walk forward from it.
//
// So ‹ and › move exactly one line, recorded or not; reading a line and moving on
// files the take under THAT line and lands on the line after it; a tap on the
// rail (or a line in Lines & settings) puts the cursor on that line. The one
// control that skips ahead is "Jump to next unrecorded", labelled as such.
// Proved by RecordistRoom.lineCursor.test.js.
const index = ref(0)
const busy = ref(false)
const readThisSession = ref(0)
// Lines read in THIS session, in order — the only ones we can honestly offer a
// stored clip for, because only those have an upload we watched land.
const sessionIds = ref([])
const lastLine = ref(null)

// ── Progress, in plain words ────────────────────────────────────────────────
const doneIds = ref(new Set())
// RECORDED = the server holds a confirmed take of this line by this artist.
// Three ways of knowing it, all of them the server's word: `recorded` on the
// wire when the queue was loaded; `doneIds` for a line read in THIS session
// (queued at capture, so it never re-serves mid-session); and `queue.saved` for
// a take the device carried over from an EARLIER session and has since got
// through. That third one is the case that re-served Aran on 2026-09-11: a
// carried-over take went up after the queue had loaded with recorded:false, so
// the moment it stopped being pending it was neither pending nor recorded — and
// the run offered him the line again. A confirmed upload is a recording
// (Tom, 2026-09-11), whichever session made it.
// AND A REFUSED TAKE IS NOT ONE OF THEM. `doneIds` is set optimistically the
// moment a take is queued; if the server then refuses those bytes, the line is
// back to still-to-read — the roster already drew it that way (failed outranks
// done, RecordistRoster.vue markClass), but this function went on saying
// recorded, so the STAGE disagreed with the map: the run's count was one short,
// the Next button read "Done" with a refused line behind it, and the run would
// never offer that line again. Caught by RecordistRoom.artistsDay.test.js.
function isRecorded(l) {
  if (queue.failed.has(l.id) && !queue.saved.has(l.id) && !l.recorded) return false
  return !!l.recorded || doneIds.value.has(l.id) || queue.saved.has(l.id)
}
const recordedCount = computed(() => lines.value.reduce((n, l) => n + (isRecorded(l) ? 1 : 0), 0))
const progressWords = computed(() => `${recordedCount.value} of ${lines.value.length} recorded`)
// THE TOP LINE, AND IT HAD TO STOP LYING. `progressWords` above counts what we
// are no longer asking for, which is the right number for the start button and
// the wrong number for a person: it told Aran "26 of 441 recorded" when 71 of
// his lines carry a take he made. So the ready card says both — what he has
// recorded, and how many of those we are asking him to read again. Record mode
// keeps `progressWords` untouched; the way lines are served there is Tom's.
// Same rule as the roster's tally: a take still going up or refused is not yet
// a recorded line, so the headline cannot say a number the map beneath denies.
const takeCount = computed(() => rosterRows.value.reduce((n, r) => n + (r.hasTake && !r.pending && !r.failed ? 1 : 0), 0))
// ONE NUMBER, BECAUSE THERE IS ONE TRUTH NOW. This used to end ", N of those to
// read again" — our verdict on the reader's work, in the first sentence on their
// page. Tom, 2026-09-02: a line whose take we have rejected is a line still to
// record, so it is already inside the outstanding half of this sentence and has
// nothing further to say for itself.
const queueHeadline = computed(() => {
  const total = rosterRows.value.length
  return `${total} ${total === 1 ? 'line' : 'lines'} — ${takeCount.value} recorded`
})

// THE WHOLE RUN, FLATTENED FOR THE ROSTER. One row per line in queue order,
// carrying only what a reader needs: what it says, whether it is done, and the
// bytes to play if there are any. The three judgements stay HERE — markup
// parsing, done-ness including this session's takes, and clip precedence — so
// the roster cannot invent a fourth definition of any of them.
const rosterRows = computed(() => lines.value.map(l => ({
  id: l.id,
  text: plainText(l.text),
  done: isRecorded(l),
  url: storedUrlFor(l.id),
  canEdit: !!l.canEditText,
  // THE OTHER SIDE, so the list can offer it for editing too.
  known: l.knownText ? plainText(l.knownText) : null,
  // A pod line's CHARACTER. Straight off the wire, and only pod lines have one.
  speaker: l.speaker || null,
  // How many other copies of the same sentence this one take also fills.
  alsoFills: Number(l.alsoFills) || 0,
  // A TAKE THIS RECORDIST STILL HAS. Once it meant "recorded OR asked for
  // again", so that a line Aran had read and we wanted improved still counted
  // as read. Under Tom's 2026-09-02 ruling there is no such middle state on his
  // screen any more: a take we have ruled unusable is not a take he has, it is a
  // line he has not read yet, and the server no longer sends the flag that used
  // to say otherwise. So this is simply "done".
  hasTake: isRecorded(l),
  kind: l.kind || 'pod',
  section: sectionKeyOf(l),
  // WHICH BODY OF WORK. Only pod lines have one; everything else is null and
  // groups by its kind exactly as it always did.
  podSlug: l.podSlug || null,
  podTitle: l.podTitle || null,
  courseCode: l.courseCode || null,
  // HOW IT IS READ. The roster draws it so the two speeds of the minimal set
  // are told apart at a glance, and onNext acts on it below.
  readStyle: l.readStyle || 'natural',
  // The seams a Take G must carry, so the line can say how many pauses it wants.
  takeGChunks: l.takeGChunks || null,
  // WHERE THE TAKE IS, WHICH IS NOT A VERDICT ON IT.
  //
  // Aran, 2026-09-10: "if I mouseover some of the phrases that are white/yet to
  // read, there is stuff that I KNOW I recorded in the session today - so
  // either those uploads have failed or they are still processing - would be
  // super handy to know which". Both of those drew as an ordinary unread line,
  // and they are opposite facts: one is safe and needs nothing, the other has
  // lost the take unless he reads it again. A screen that cannot tell them
  // apart makes him re-record what is already safe and abandon what is not.
  //
  // Tom's 2026-09-02 ruling — no third state — is about our JUDGEMENT on a
  // take, and it still holds: nothing here says a take was good or bad. This
  // says where the bytes are, which is a fact about the machine and is the
  // thing he asked to be told.
  pending: isPending(l.id),
  failed: hasFailed(l.id),
})))

// THE THREE KINDS OF WORK, NAMED. Tom, 2026-09-02: "I want all the TYPES of
// lines he has to record disambiguated… this map of the whole thing SHOULD be
// just the POD lines / then just the NEW SEEDS / then just the Re-Recording."
// His ordering, his split. Aran's link said "441 lines" and he could not tell
// what they were, because 441 was three unrelated jobs added together: 80 lines
// of his half of a two-hander, 305 brand-new Welsh sentences, and 56 takes we
// are asking him to give us again.
//
// The words are a voice artist's, not ours: "kind" is our internal vocabulary
// and never reaches this screen. "POD" and "SEEDS" DO -- Tom's ruling of
// 2026-09-02, "it's SEEDS" -- because those two are words he and the artists
// already say out loud. A kind with no lines in it is
// not shown at all — most recordists in the estate have only one or two of the
// three, and an empty heading reading "0 lines" is a question with no answer.
// The roster section a line belongs to: its kind, except that a seed already
// released in the course is its own section (see SECTION_ORDER).
// A RELAUNCH SANDBOX'S SENTENCES ARE NEW, though their seed rows exist in that
// course (Aran, 2026-10-14, job #347): #335 found his 640 new North sentences
// under "seeds already in the course … They are not new". Display only.
function sectionKeyOf(l) {
  const kind = l.kind || 'pod'
  return kind === 'seed' && l.seedExisting && !isBoothNewCourse(l.courseCode) ? 'seedexisting' : kind
}

// "Pass 1 of 2 · North batch 3 of 30" — the words a phrase line carries on the
// stage and its section carries on the map, from the server's own summary.
function phrasePlaceWords(pass, batch) {
  const p = phrases.value
  if (!p || !p.pass) return null
  const n = pass === p.pass ? p.batches : null
  return `Pass ${pass || p.pass} of ${p.passes} · ${boothCourseWords(p.courseCode, p.courseLabel)} batch ${batch || p.batch}${n ? ` of ${n}` : ''}`
}

const SECTION_ORDER = [
  // POD-1 IS ITS NAME. Tom, 2026-09-02: "we're interested in the PODS — the
  // conversations — we should call it POD-1, because that's the name we've been
  // referring to it as". It is the name he and the artists say out loud, so it
  // is the name on the screen; a generic "Conversations" can come back if there
  // is ever more than one pod. This string is a display constant, not a value off
  // the wire — the pod's own slug has said `pod-1` since 2026-09-10.
  { key: 'pod', heading: 'POD-1', blurb: 'Your half of the POD-1 conversations — the other characters are read by someone else.' },
  // NEVER RECORDED BY ANYONE, and the front of a wave rather than the end of
  // one: Tom, 2026-09-02, "these are also going to lead to many more phrases
  // that need recording of course". Said in the blurb because a recordist who
  // thinks this is the last of it will be surprised twice.
  //
  // NEW SEEDS IS ITS NAME, and it is Tom's own word, 2026-09-02: "it's SEEDS",
  // overruling an earlier taste call that "seed" was internal vocabulary. His
  // longer phrasing was "SEEDS should be 'NEW SEEDS'". The blurb below stays as
  // it is and carries the explanation; the heading carries the name.
    //
  // "nobody has recorded yet" was a lie for half of them. A seed sentence is
  // read by BOTH voices (target1 and target2 are two slots on one row), so a
  // line Aran has already given us still sits here for Catrin -- correctly --
  // and it read to him as a sentence being asked for twice (Aran, 2026-09-11,
  // "dw i'n mynd i ddysgu Cymraeg"). The blurb now says whose take is missing.
  // SEEDS ALREADY IN THE COURSE are not new (Aran recorded all 305 North Welsh
  // ones believing they were): the course already plays them, built from his
  // LEGO and phrase takes. All that is missing is the one take of the whole
  // sentence. Same job as NEW SEEDS to the queue, a different heading to him.
  { key: 'seedexisting', heading: 'Whole sentences — seeds already in the course', blurb: 'These sentences are already in the course. You have recorded the pieces and phrases inside them; what is missing is one reading of each whole sentence, at your natural pace. They are not new, and they do not bring new phrases to record.' },
  { key: 'seed', heading: 'NEW SEEDS', blurb: 'Course sentences that still need your voice. Every one of these is read by both voices, so some already have the other voice’s take. Each one will also bring more phrases to record later on.' },
  // TOM'S OWN SET, 2026-09-02: "ideally I just want the minimal phrase set,
  // that I can record so we can test the dice and splice approach." The
  // smallest set of chunks that recombine into every phrase in the course. Its
  // internal names -- LEGO, quarry, covering set -- never reach this screen,
  // for the same reason "pod" and "seed" do not.
  //
  // It sits between the re-records and the new sentences because it is new
  // reading, but it is the thing he came here to do. The set's SECOND speed --
  // the whole natural sentences -- is the 'seed' section directly below it, and
  // the blurb says so rather than duplicating those lines into two places.
  // THE SAME SENTENCE, READ A SECOND WAY, and it sits with the pod rather than
  // in a section of its own — the queue orders it immediately after its own
  // natural line, so it is read while the line is still in the mouth. This entry
  // exists only so a Take G that HAS been separated out (an old server, a jump
  // from the map) is still named in words rather than landing in "Everything
  // else".
  { key: 'takeg', heading: 'The same line, with gaps', blurb: 'The line you just read, read again with a clear pause at every mark. One gapped read is all it takes: every shorter practice phrase is cut out of it, so nothing here has to be recorded chunk by chunk.' },
  { key: 'quarry', heading: 'The minimal set', blurb: 'The smallest set of chunks that can be recombined into every phrase in the course. Read these slowly, with a clear gap between the words, so each one can be cut out cleanly. The full sentences below are read at your natural pace.' },
  // THIS SECTION USED TO BE CALLED "Re-recording in this course", and every row
  // in it carried the reason we had rejected the take. Tom, 2026-09-02: "they
  // must NOT see any clips that have already been ruled unusable - they must
  // just see those as lines that still need recording." A heading that names our
  // verdict on somebody's work is exactly what he ruled out, so the section is
  // named for what the lines ARE — individual course lines with no take on them
  // — and says nothing about how they got here. Aran would otherwise have read
  // "Aran's are all junk. All clipped badly at either or both ends" off his own
  // screen on the morning of the session.
  { key: 'rerecord', heading: 'MORE LINES', blurb: 'Single lines from the course that still need a recording — some from the conversations, some on their own.' },
  // A LEGO WHOSE TAKE IS MISSING (job #366) — a piece of a seed, read whole at
  // natural pace. Usually a LEGO that was corrected and so lost its old clip.
  { key: 'lego', heading: 'LEGOS', blurb: 'Single LEGOs from the course that still need your voice — usually ones whose words were corrected. Read each one at your natural pace.' },
  // AFTER THE SEEDS, because a phrase is built from a seed's LEGOs. One batch at
  // a time (job #619); the heading names the pass and the batch (rosterSections).
  { key: 'phrase', heading: 'PRACTICE PHRASES', blurb: 'Practice phrases, in course order, one batch at a time. The first pass is the phrases the app plays first; the rest come on a second pass later.' },
  // THE ONCE-RECORDED INTRO PIECES (job #210): every LEGO intro of the new North and South courses is spliced from these
  // two takes, his English take of the LEGO and the Welsh — read once each, for both courses.
  // POD 1 ENGLISH (job #537): the English side of the Pod 1 conversations, North and South on one card.
  // POD 1 NEW WORDS (job #551): pod lines whose words are changing; the pod takes the new words with this take.
  { key: 'podswap', heading: 'POD 1 · NEW WORDS', blurb: 'Pod 1 lines with new words. The pod keeps the old words and recording until you record these, then changes, North and South at once.' },
  { key: 'podknown', heading: 'POD 1 ENGLISH', blurb: 'The English of every Pod 1 line, read once each at your natural pace. One take serves both North and South.' },
  { key: 'intro', heading: 'Intro pieces', blurb: 'Two short pieces, read once each: every LEGO intro in the new North and South courses is put together from them — "The Welsh for" + your English LEGO + "is" + the Welsh. Read them the way you would say them in an intro.' },
]
// ONE POD IS NOT EVERY POD. Tom, 2026-09-04: "Aran's lines are now confusing -
// this special senedd pod lines are mixed in with his recorded already POD
// lines - this is just confusing and so these would be best separated out."
// The section above is keyed on `kind`, and both bodies of work are kind 'pod',
// so 91 lines of the POD-1 conversations and 373 lines of a committee session
// arrived under one heading reading "POD-1". Splitting on the pod's own slug is
// the whole fix; these are the headings for the pods we have words for.
//
// The slug NEVER reaches the screen -- `senedd-s4c-steve` is our vocabulary and
// carries a colleague's first name -- for the same reason "kind" and "quarry"
// do not. A pod nobody has written a heading for falls back to its own title,
// which is a human sentence a person wrote, and only then to a generic name.
const POD_SECTIONS = {
  // POD-1 IS ITS NAME -- Tom's ruling of 2026-09-02, unchanged and not ours to
  // revisit. `pod-1` is every course's core pod (Tom, 2026-09-13), so it is the
  // one core key this booth hits.
  'pod-1': { heading: 'POD-1', blurb: 'Your half of the POD-1 conversations — the other characters are read by someone else.' },
  // TASTE CALL, defaulted 2026-09-04 because Tom has not named this section. It
  // is one line, so overruling it is one line.
  'senedd-s4c-steve': { heading: 'SENEDD', blurb: 'The S4C committee session at the Senedd, 11 January 2024 — read in session order.' },
}
function podSectionFor(row) {
  // The booth's own pod names (Aran, 2026-10-13) win over every other heading,
  // so the section reads the same as its nav chip. Display only.
  const booth = boothPodHeading(row)
  const named = POD_SECTIONS[row.podSlug]
  if (booth) return { ...(named || { blurb: 'Your half of this conversation — the other characters are read by someone else.' }), heading: booth }
  if (named) return named
  const blurb = 'Your half of this conversation — the other characters are read by someone else.'
  // A pod line with NO slug at all is the world before this split existed -- an
  // older server mid-deploy, or a test fixture -- and there is exactly one such
  // group, so it keeps the name this screen has always given it.
  if (!row.podSlug) return { heading: 'POD-1', blurb }
  // A pod we have not written a heading for is named by its own title, which a
  // person wrote, and never by its slug.
  return { heading: row.podTitle || 'MORE CONVERSATIONS', blurb }
}
// WHERE THE NAV GOES, read off the queue itself: every pod this voice is
// cast in (first-appearance order, the server's own) and every course those
// lines belong to. Nothing is fetched for it — a line already says which pod
// and which course it is from.
const navPods = computed(() => {
  const seen = new Map()
  for (const l of lines.value) {
    if ((l.kind || 'pod') !== 'pod' || !l.podSlug || !l.courseCode) continue
    const key = `${l.courseCode}/${l.podSlug}`
    if (seen.has(key)) continue
    seen.set(key, { key, row: l, to: `/production/${l.courseCode}/pods/${l.podSlug}` })
  }
  const keys = [...seen.keys()]
  return [...seen.values()].map(({ row, ...p }) => ({ ...p, label: boothPodChip(row, keys) }))
})
const navCourses = computed(() => {
  const seen = new Map()
  for (const l of lines.value) {
    if (!l.courseCode || seen.has(l.courseCode)) continue
    seen.set(l.courseCode, { code: l.courseCode, to: `/production/${l.courseCode}` })
  }
  const all = [...seen.values()]
  const codes = all.map(c => c.code)
  return all.map(c => ({ ...c, label: boothCourseChip(c.code, codes) }))
})
const rosterRef = ref(null)
// "Lines" is on this page: open the whole list and put it under his thumb.
function goToLines() {
  const r = Array.isArray(rosterRef.value) ? rosterRef.value[0] : rosterRef.value
  sheetOpen.value = true
  if (r && r.openList) r.openList()
  nextTick(() => {
    const el = r && r.$el && r.$el.querySelector ? r.$el.querySelector('.roster-toggle') : null
    if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

const rosterSections = computed(() => {
  const byKind = new Map(SECTION_ORDER.map(s => [s.key, []]))
  // A kind we did not plan for gets a section of its own rather than vanishing:
  // a line silently missing from the map is the one failure this screen cannot
  // afford, and the sections must always add back up to the whole queue.
  const other = []
  // Pod lines split one level further, by which pod they belong to. Keyed in
  // FIRST-APPEARANCE order, which is the queue's own order -- the server sorts
  // by course, then pod, then position, so each pod's lines are already
  // contiguous and this introduces no second sort. A pod line with no slug on
  // the wire (an older server, mid-deploy) keys on '' and gets one group, which
  // is exactly the single "POD-1" section that existed before.
  const byPod = new Map()
  for (const row of rosterRows.value) {
    if (row.kind === 'pod') {
      const key = row.podSlug || ''
      if (!byPod.has(key)) byPod.set(key, { key: `pod:${key}`, ...podSectionFor(row), rows: [] })
      byPod.get(key).rows.push(row)
    } else if (byKind.has(row.section)) byKind.get(row.section).push(row)
    else other.push(row)
  }
  const out = []
  for (const s of SECTION_ORDER) {
    // The 'pod' slot in the order is where the pod groups go, in queue order.
    if (s.key === 'pod') { for (const g of byPod.values()) out.push(g); continue }
    const rows = byKind.get(s.key)
    if (rows.length && s.key === 'phrase' && phrasePlaceWords()) out.push({ ...s, heading: `PRACTICE PHRASES · ${phrasePlaceWords()}`, rows })
    else if (rows.length) out.push({ ...s, rows })
  }
  if (other.length) out.push({ key: 'other', heading: 'Everything else', blurb: 'Lines that do not fall into the groups above.', rows: other })
  return out
})

// WORK THAT IS THERE AND CANNOT BE READ YET, IN WORDS.
//
// Aran, 2026-09-10: "none of the extra content is visible in there". It was
// not: 168 of the 567 Senedd lines have never been translated into Welsh, and a
// pod line with no target text was dropped by the server before it was counted
// — so his page could not show it and could not even total it, and he read the
// gap, correctly, as work that had gone missing. It is named for the same
// section the readable lines of that pod sit in, so the two are obviously one
// body of work, and it says plainly that nothing has been lost.
//
// It is NOT a queue line and never becomes one: there is nothing to read.
const notReadyNotes = computed(() => notReady.value
  .filter(n => Number(n.lines) > 0)
  .map(n => ({
    key: n.podId || n.podSlug || 'pod',
    heading: podSectionFor({ courseCode: n.courseCode, podSlug: n.podSlug, podTitle: n.podTitle }).heading,
    lines: Number(n.lines),
  })))

// WORK HE HAS DONE THAT LEFT HIS LIST, IN WORDS.
//
// Tom, 2026-09-10: "we recast Aran's lines for Catrin to disambiguate the roles
// better." 29 lines of the Welsh pod moved that way, deliberately. His takes of
// them are still there and still what a learner hears — but the lines belong to
// her now, so they left his queue and his own history stopped at the last line
// he still owns. He read that as his recordings running out at scene 14, and he
// was describing something real: the page had no way to say this.
//
// It says RECORDED, and it says WHOSE THE LINE IS NOW, and it never appears
// among the counts of what is left. Nothing here asks him to do anything.
const handedOnNotes = computed(() => handedOn.value
  .filter(n => Number(n.lines) > 0)
  .map(n => ({
    key: n.podId || n.podSlug || 'pod',
    heading: podSectionFor({ courseCode: n.courseCode, podSlug: n.podSlug, podTitle: n.podTitle }).heading,
    castTo: n.castTo || 'somebody else',
    lines: Number(n.lines),
  })))

// WHICH BODY OF WORK A LINE BELONGS TO, as the roster names it. One function,
// so the map's headings and the stage's own words cannot drift apart.
function sectionHeadingOf(line) {
  if (!line) return null
  const kind = sectionKeyOf(line)
  if (kind === 'pod') return podSectionFor(line).heading
  const named = SECTION_ORDER.find(s => s.key === kind)
  return named ? named.heading : 'Everything else'
}

const current = computed(() => lines.value[index.value] || null)

// ── WHAT IS SAID EITHER SIDE OF THIS LINE ────────────────────────────────────
//
// Aran, 2026-09-16, agreed by Tom: he was proofreading all 438 lines of the
// health pod on the pod page before recording, because to judge a line he needs
// to see it IN CONTEXT — both speakers — and in the booth he only ever sees his
// own lines. So the exchange comes down on the wire (`context`, see
// exchangeContext in recordist-queue.cjs) and is drawn around the well.
//
// ONE SHORT CUE EACH SIDE. The server sends two, the phone draws the nearest
// one: the line being read is 44vh and must stay the biggest thing on the
// screen, and a column of dimmed text either side of it is a second thing to
// read at a microphone. Nothing here is tappable — the mic is live and the
// thumb is near the transport.
const cueBefore = computed(() => (current.value?.context?.before || []).slice(-1))
const cueAfter = computed(() => (current.value?.context?.after || []).slice(0, 1))

// THE CROSSING, ANNOUNCED. Aran, 2026-09-10, on finding course content in the
// middle of the flow: the interleaving itself was fixed earlier today, but the
// crossing from pod DIALOGUE into the course's own SENTENCES stayed nearly
// silent — a small caption above the crib and nothing else — and a reader one
// line at a time has no way to know the kind of material has changed under him.
//
// It is drawn IN FLOW, above the line, and it interrupts nothing: no modal, no
// tap to dismiss, no pause in the run. It appears on the first line after a
// crossing and goes as soon as he moves on, and it compares against the line he
// last READ rather than against queue position, so it is still right when he
// has jumped into the middle from the map.
const crossingNote = computed(() => {
  const to = sectionHeadingOf(current.value)
  const from = sectionHeadingOf(lastLine.value)
  if (!to || !from || to === from) return null
  return { from, to }
})

// A seed sentence is the sentence a course is built from, and its take lands in
// course_seeds' own audio slot rather than in a pod. On a TEST FIXTURE course
// the KNOWN (English) side is recordable too, and then two lines carry the same
// words in different languages -- so which side this one is has to be said out
// loud or they are indistinguishable.
function kindWordsFor(l) {
  if (!l) return null
  // WHICH BODY OF WORK HE IS IN, while he is in it. The roster names the groups
  // but the roster is the map; once he taps Start he is one line at a time and
  // the screen went back to saying nothing about which of two unrelated jobs
  // this line came from (Tom, 2026-09-04). Same words as the heading above it,
  // so the two cannot drift apart.
  if ((l.kind || 'pod') === 'pod') return podSectionFor(l).heading
  // A minimal-set piece is a CHUNK, not a sentence, and it is read differently
  // from everything else on this screen. Saying which of the two speeds this
  // line is is the whole reason the set has two of them.
  if (l.kind === 'quarry') {
    // The tap is named on the line itself. Nothing is listening for the end of
    // a gapped read, so "tap Next" is not a hint, it is how the queue moves.
    return l.quarrySource === 'word'
      ? 'One word - read it slowly, on its own, then tap Next'
      : 'A chunk - read it slowly, with a gap between the words, then tap Next'
  }
  // A TAKE G is the sentence he has just read, read again with a pause at every
  // mark. The instruction has to name the marks, because "read it slowly" is not
  // something two people do the same way and the aligner needs the gaps in
  // specific places — it maps the voiced stretches onto the marks one for one
  // and refuses the take if the counts disagree.
  if (l.kind === 'takeg') {
    const n = Array.isArray(l.takeGChunks) ? l.takeGChunks.length : 0
    const marks = n > 1 ? `${n - 1} pause${n > 2 ? 's' : ''}` : 'a pause'
    return `The same line again - pause clearly at each ${'…'} (${marks}), then tap Next`
  }
  if (l.kind === 'phrase') {
    const side = l.role === 'known' ? ' - English side' : (l.role === 'target2' ? ' - second voice' : '')
    const where = phrasePlaceWords(l.phrasePass, l.phraseBatch)
    return `Practice phrase${where ? ` · ${where}` : ''}${side}`
  }
  if (l.kind === 'podknown') return `Pod 1 English${l.speaker ? ` · ${l.speaker}` : ''} - North and South`
  if (l.kind === 'podswap') return `Pod 1 new words${l.speaker ? ` · ${l.speaker}` : ''}${l.replacesText ? ` - replaces "${l.replacesText}"` : ''}`
  if (l.kind === 'lego') {
    const which = l.legoId || (l.seedNumber ? `seed ${l.seedNumber}` : null)
    return `LEGO${which ? ` ${which}` : ''}${l.role === 'target2' ? ' - second voice' : (l.role === 'known' ? ' - English side' : '')}`
  }
  if (l.kind !== 'seed') return null
  if (l.seedExisting) {
    const whole = l.seedNumber ? `Whole sentence ${l.seedNumber}, already in the course` : 'Whole sentence, already in the course'
    return l.role === 'known' ? `${whole} - English side` : (l.role === 'target2' ? `${whole} - second voice` : whole)
  }
  const which = l.role === 'known' ? 'English side' : (l.role === 'target2' ? 'second voice' : null)
  const number = l.seedNumber ? `Seed sentence ${l.seedNumber}` : 'Seed sentence'
  return which ? `${number} - ${which}` : number
}
const lineKindWords = computed(() => kindWordsFor(current.value))

/**
 * Split a line into readable segments.
 *
 * Pod dialogue is plain text and comes back as a single segment. LEGO narration
 * — which reaches the queue because the queue is content-type-agnostic — is
 * stored with markup:
 *
 *   The Welsh for <src>are they?</src> is <tgt>ydyn nhw?</tgt> <tgt>Ydyn nhw?</tgt>
 *
 * Rendered raw, the recordist sees and reads the tags. So the tags are parsed
 * out here and each part carries its own class: the known-language part and the
 * target part look different on screen, and the recordist just reads the words.
 * Done with a parser rather than v-html because this is database content and
 * v-html on database content is an injection waiting to happen.
 *
 * Same reasoning takes the learner-facing breakdown ellipses out here: they are
 * markup for the learner's ear, not for the reader's mouth, and a recordist who
 * sees them reads them as "hesitate". Every display of a line goes through this
 * function, so stripping once at the top is the whole change — and it is
 * DISPLAY ONLY. `line.text` keeps its markers everywhere else, because they are
 * part of the clip's identity when the take is posted back.
 */
function segmentsFor(text) {
  const raw = stripBreakdownMarkers(text)
  if (!raw) return []
  const out = []
  const re = /<(src|tgt)>([\s\S]*?)<\/\1>/g
  let at = 0
  let m
  while ((m = re.exec(raw)) !== null) {
    if (m.index > at) out.push({ kind: 'plain', text: raw.slice(at, m.index) })
    out.push({ kind: m[1], text: m[2] })
    at = m.index + m[0].length
  }
  if (at < raw.length) out.push({ kind: 'plain', text: raw.slice(at) })
  // Any stray unmatched tag would still be visible, so strip the shape itself
  // as a last resort rather than showing a half-tag.
  return out.map(s => ({ ...s, text: s.text.replace(/<\/?(?:src|tgt)>/g, '') }))
}

const currentSegments = computed(() => segmentsFor(current.value?.text))

// The same text with the markup taken out, for the places that show a line as
// one plain string (the coming-up list, the listen-back rows). Without this the
// recordist reads `<tgt>` in the queue preview.
function plainText(text) { return segmentsFor(text).map(s => s.text).join('') }

// A LINE WHOSE TAKE IS STILL GOING UP IS NOT A LINE TO READ.
//
// Aran, 2026-09-10: "to be able to carry on recording only items that are not
// currently in the upload queue." Within one session `isRecorded` already
// covers it — a queued take marks the line done the moment it is queued. What
// it never covered is a take carried over on the DEVICE from an earlier
// session: the server has not got it, so the line comes back saying
// unrecorded, and the booth would serve it to him again for a read he has
// already given us.
//
// A FAILED take is deliberately NOT settled. That line does still need reading,
// and it is the one case where offering it again is the whole point.
// A take that saved but did not match its words is not settled either (job #842): it is owed again.
function ownSettled(l) { return (isRecorded(l) && !hasMismatch(l.id)) || isPending(l.id) }
// ONE TAKE SERVES EVERY LINE OF THE SAME WORDS (Aran's standing rule, job #198). A seed sentence,
// the LEGO of exactly its words, a practice phrase that says them: once one is said, its twins are
// settled too, at once — the server fills their slots from that one take (fillSameWordsSlots).
// `closingTwinKeys` holds the line he has just moved on from, whose take has not landed yet.
const closingTwinKeys = ref(new Set())
const saidKeys = computed(() => saidTwinKeys(lines.value, ownSettled, closingTwinKeys.value))
function isSettled(l) {
  if (ownSettled(l)) return true
  const k = twinKey(l)
  return !!k && saidKeys.value.has(k)
}

// THE READING FLOW (Aran, 2026-10-15, job #816: "when I open a new batch, quite often several
// of them are marked green already ... I'm given those to re-record again in the flow with the
// rest. Could we just skip them? Ideally they wouldn't even show"). A batch often opens with
// lines already settled — saved on the server, or recorded here and still going up — because one
// take covers every copy of the same words (#791). Those lines are NOT in the reading flow:
// Start, ›, ‹, auto-advance and Jump walk only the lines still owed, in course order.
//
// A line he has stood on in THIS session stays in the flow once he has recorded it, so ‹ still
// goes back to it (#757). A hidden line he taps in Lines & settings joins the flow the same way:
// pinCursor() marks it. Reset each time a batch is opened (load).
const touchedIds = ref(new Set())
function touchLine(id) {
  if (id === null || id === undefined || touchedIds.value.has(id)) return
  touchedIds.value = new Set([...touchedIds.value, id])
}
function inFlow(l) { return !!l && (!isSettled(l) || touchedIds.value.has(l.id)) }
const flowIndices = computed(() => lines.value.reduce((out, l, i) => (inFlow(l) ? (out.push(i), out) : out), []))
// "8 already recorded — hidden · show": the lines left out of the flow, and the switch that
// draws them in Lines & settings (and on the rail), where Again is on every row.
const hiddenCount = computed(() => lines.value.length - flowIndices.value.length)
const showHidden = ref(false)
// ONE STEP ALONG THE FLOW from line i (which need not itself be in it), or -1.
function nextFlowFrom(i) {
  for (let k = i + 1; k < lines.value.length; k++) if (inFlow(lines.value[k])) return k
  return -1
}
function prevFlowFrom(i) {
  for (let k = Math.min(i, lines.value.length) - 1; k >= 0; k--) if (inFlow(lines.value[k])) return k
  return -1
}
// Line i's number in the flow ("Line 3 of 12"), or null for a hidden line.
function flowPos(i) {
  const p = flowIndices.value.indexOf(i)
  return p === -1 ? null : p + 1
}
function toggleHidden() {
  showHidden.value = !showHidden.value
  if (showHidden.value) openSheet()
}
// The rows the rail and the batch list draw: the flow, or every line once he has asked to see them.
const shownRows = computed(() => lines.value.map((l, i) => ({ l, i })).filter(({ l }) => showHidden.value || inFlow(l)))

// WHERE START LANDS: the first line in queue order that is still to read, and
// never anything else. This used to return 0 — the top of the queue, recorded
// or not — whenever the re-read switch was on, and that switch was remembered
// per artist, so one tick of it put Start on an already-recorded line in every
// session after (Tom's booth, 2026-09-12: "Start recording — A black coffee,
// please." over a pod block reading "all 24 recorded"). -1 means nothing is
// owed, and Start is disabled on it. Proved by RecordistRoom.artistsDay.test.js.
// THE POD A LINK NAMED. /r/:voiceId?course=<code>&pod=<slug> is this same booth
// with Start on that pod's first unread line — the door the pod pages draw
// (RecordDoor.vue), so a recordist who taps "Record your lines" on a pod page
// lands in that pod's work rather than at the top of everything he owes. Read
// off the address, like ?course=, so the booth keeps no router dependency.
// Nothing else changes: the queue, the map and the counts are the whole queue.
const podScope = new URLSearchParams(window.location.search).get('pod') || ''

const startIndex = computed(() => {
  if (!lines.value.length) return -1
  // A pod with nothing owed in it falls through to the queue's own first unread
  // line — never to "Nothing left to read" while work is owed elsewhere.
  if (podScope) {
    const inPod = lines.value.findIndex(l => !isSettled(l) && (l.podSlug || '') === podScope)
    if (inPod !== -1) return inPod
  }
  return lines.value.findIndex(l => !isSettled(l))
})

// WHERE THE RUN GOES NEXT — and it may go BACKWARDS, which is the whole of
// tonight's fix.
//
// Tom, 2026-09-02: "going back and forth threw it out of whack a bit". This
// scan only ever looked forward, and the outstanding set is no longer something
// that only shrinks in front of you: rewriting a line puts it back to
// outstanding wherever it sits, a take that came out silent leaves its line
// outstanding behind you, and the roster's one-tap "Record" drops the cursor
// into the middle of the queue with outstanding lines above it. In every one of
// those cases a forward-only scan reached the end of the list, said "Done", and
// left work owed that the run could never offer again — while the roster went
// on truthfully saying "1 still to read". Two counts, both computed from the
// same lines, disagreeing on the screen. That is the out-of-whack.
//
// So the run, which only ever reads OUTSTANDING lines, wraps: forward to the
// end, then round from the top, and it stops only when there is genuinely
// nothing left anywhere. The line we are standing on is excluded — we have just
// read it, and a take that failed on it must not put the queue in a loop with
// itself. Her failure note and the roster's one-tap re-record are the way back
// to that one.
//
// A RECORDED LINE IS NEVER A NEXT STEP. There is no mode in which it is: the
// re-read switch that once made this scan return every line went with Tom's
// 2026-09-11 ruling (see the ready card), and a recorded line is reached only by
// the artist tapping it on the map.
function nextIndexFrom(i) {
  for (let k = i + 1; k < lines.value.length; k++) {
    if (!isSettled(lines.value[k])) return k
  }
  for (let k = 0; k < i && k < lines.value.length; k++) {
    if (!isSettled(lines.value[k])) return k
  }
  return -1
}
// › goes to the next line in the reading flow; on the last one it is Done.
const hasNext = computed(() => nextFlowFrom(index.value) !== -1)
// The one control that skips: to the next line still owed, wrapping round.
const nextUnrecordedIndex = computed(() => nextIndexFrom(index.value))

// What the recordist is about to be asked for. Six is what fits under the line
// on a phone without pushing the controls off the bottom of the screen.
const UPCOMING_SHOWN = 6
// The lines › will walk him through, in order — the same lines, recorded or not,
// because › no longer skips anything (THE ONE CURSOR).
const upcoming = computed(() => flowIndices.value.filter(k => k > index.value).slice(0, UPCOMING_SHOWN).map(k => lines.value[k]))
// STILL TO READ — the same set the roster counts, and it has to be, because
// both numbers are on the screen at once. Counting forward from the cursor made
// them disagree the moment anything became outstanding behind it: the roster
// said one line was owed and the stage said none were.
const remainingToRead = computed(() => lines.value.reduce((n, l) => n + (isSettled(l) ? 0 : 1), 0))
// THE LINE START WILL OPEN ON, drawn big on the batch page before Start (job #424): the batch
// page IS the reading screen, so the first thing he reads is already where he will read it.
// THE CURSOR BEFORE START: the line he was on when he last left this batch (restored from
// localStorage, or put there by a tap on the rail), else the first line still owed. A cursor
// he chose may sit on a recorded line — that is the line he asked for.
const pinnedId = ref(null)
const readyIndex = computed(() => {
  if (pinnedId.value !== null) {
    const i = lines.value.findIndex(l => l.id === pinnedId.value)
    if (i !== -1 && inFlow(lines.value[i])) return i
    // He left off on a line that is recorded now: Start opens on the next line still owed
    // after it — a recorded line is never where a session starts (job #816).
    if (i !== -1) {
      const k = lines.value.findIndex((l, j) => j > i && !isSettled(l))
      if (k !== -1) return k
    }
  }
  return startIndex.value
})
// A BATCH WHOSE EVERY LINE HAS A TAKE — saved, or recorded and still going up from this device —
// is done, and uploading never holds him on it (Aran, 15 Oct: a fully amber batch offered no way
// on). A refused line is still owed, so it keeps `remainingToRead` above zero and says nothing here.
const batchUploadingNote = computed(() => {
  if (remainingToRead.value > 0 || !lines.value.length) return ''
  const n = lines.value.reduce((c, l) => c + (isPending(l.id) ? 1 : 0), 0)
  return n > 0 ? `${n} still uploading — they'll finish in the background.` : ''
})
const startLine = computed(() => (readyIndex.value === -1 ? null : lines.value[readyIndex.value]))
// WHERE THE CURSOR IS KEPT: per voice, per batch (or per door link).
function cursorScope() {
  const q = new URLSearchParams(window.location.search)
  return cursorScopeKey({ batch: batchScope.value, course: q.get('course') || '', pod: q.get('pod') || (q.get('step') ? `step:${q.get('step')}` : '') })
}
function pinCursor(lineId) {
  pinnedId.value = lineId ?? null
  touchLine(pinnedId.value)
  saveCursor(props.voiceId, cursorScope(), pinnedId.value)
}
// Every move of the live cursor is remembered at once: the booth is closed by a laptop lid as
// often as by a button.
watch(index, (i) => {
  if (phase.value !== 'recording') return
  const l = lines.value[i]
  if (l) pinCursor(l.id)
})
// "Line 37 of 100 · saved": where the cursor is, and what that line holds.
function lineStateWords(l) {
  if (!l) return ''
  if (isPending(l.id)) return 'uploading'
  if (hasFailed(l.id) && !isRecorded(l)) return 'refused'
  if (hasMismatch(l.id)) return "didn't match"
  if (isRecorded(l)) return 'saved'
  return 'not yet'
}
// Counted along the reading flow: Y is the lines still to read in this session, not the batch.
const linePosWords = computed(() => {
  const f = flowIndices.value
  return `Line ${Math.max(1, f.filter(k => k <= index.value).length)} of ${f.length}`
})
// The live count and its bar, over the same flow.
const flowRecorded = computed(() => flowIndices.value.reduce((n, k) => n + (isRecorded(lines.value[k]) ? 1 : 0), 0))
const flowPct = computed(() => (flowIndices.value.length ? Math.round((flowRecorded.value / flowIndices.value.length) * 1000) / 10 : 0))
const lineState = computed(() => lineStateWords(current.value))
const startKindWords = computed(() => kindWordsFor(startLine.value))

// ── Hearing the stored clip ─────────────────────────────────────────────────
const playingId = ref(null)
const playbackError = ref(null)
let audioEl = null

// The microphone is HELD — not stopped — while a stored take plays. Two reasons,
// and the second is the one that matters: a bar twitching to the speaker looks
// like the machine is recording you when it is playing at you, and the capture
// that was running would otherwise file that playback as your take of the line
// on screen. Holding discards the open capture and re-opens the line when the
// playback ends, so the two states are mutually exclusive in fact, not just in
// the wording.
const micHeld = ref(false)
// WHY the mic is held, when the reason is Aran deliberately pausing. There is
// exactly one notion of "the mic is not listening" in this booth and it is
// `micHeld`; this is a label on it, never a second copy of it. It is only ever
// set true in the same breath as micHeld, and releaseMic() — the one door out —
// clears it, so the two cannot drift apart.
const paused = ref(false)
// The settling period at a cold start: the mic is open and capturing, the line
// is not yet on screen, and the transport is inert. See COLD_START_SETTLE_MS.
const arming = ref(false)

// WHAT THE MIC IS DOING, as one chip on the live stage (job #424) — the words are micSignal's.
const micSignal = computed(() => micSignalFor({
  editing: !!editingId.value,
  paused: paused.value,
  playing: !!playingId.value,
  arming: arming.value,
  clipping: recorder.clipping.value && !micHeld.value,
  meterTrusted: recorder.meterTrusted.value,
  micDb: micDb.value,
}))

// ── The prompter's frame (job #424) ─────────────────────────────────────────
// The three screens drawn one viewport tall: the batch page, the live stage and the done screen.
const fitPhase = computed(() => phase.value === 'ready' || phase.value === 'recording' || phase.value === 'done')
const progressPct = computed(() => (lines.value.length ? Math.round((recordedCount.value / lines.value.length) * 1000) / 10 : 0))
// THE WHERE-AM-I WORDS: the batch header inside a batch (job #378); outside one (a pod or course
// link, a recording pack) who and how many are left, so the row is never empty.
const whereWords = computed(() => {
  if (batchScope.value) return batchHeader.value
  // A CONTROLLED QUEUE'S STEP says which step it is by name: "Pod 1 · 28 left" (job #247).
  const step = voice.value.podsDone && voice.value.podsDone.current
  if (step) return `${step.title} · ${remainingToRead.value.toLocaleString('en-GB')} left`
  const who = [voice.value.displayName, voice.value.languageName].filter(Boolean).join(' · ')
  const left = `${remainingToRead.value.toLocaleString('en-GB')} left`
  return who ? `${who} · ${left}` : left
})
// One square of the desktop rail: the same four facts the map draws, plus where he is.
// THE RAIL'S FOUR STATES, one colour each, never two states in one colour (Aran, 2026-10-15):
// done = the server holds the take (green); up = recorded, still uploading (amber); failed =
// the server refused it (red); empty = not recorded yet (grey).
const RAIL_LEGEND = [
  { state: 'done', words: 'Saved on the server' },
  { state: 'up', words: 'Recorded, still uploading' },
  { state: 'failed', words: "Refused or didn't match, record again" },
  { state: 'empty', words: 'Not recorded yet' },
]
// THE RAIL FITS ITS COLUMN (job #286): measured, not guessed, whenever the column or the batch
// changes size. The column is display:none on a phone, so there it measures 0 and nothing changes.
const railShown = computed(() => fitPhase.value && phase.value !== 'done' && shownRows.value.length > 1)
const railWrapRef = ref(null)
const railLegendRef = ref(null)
const railFit = ref(fitRail({ n: 0 }))
// The app bar above the booth hides while the mic is live and hands its height to the column. The
// squares are sized for the column WITH the bar (the tallest bar seen), so Start never grows them.
let railNavbarMax = 0
function measureRail() {
  const wrap = railWrapRef.value
  if (!wrap || !wrap.clientWidth) return
  const cs = getComputedStyle(wrap)
  const px = (v) => parseFloat(v) || 0
  const legend = railLegendRef.value
  const width = wrap.clientWidth - px(cs.paddingLeft) - px(cs.paddingRight)
  const navbar = px(getComputedStyle(document.documentElement).getPropertyValue('--app-navbar-height'))
  railNavbarMax = Math.max(railNavbarMax, navbar)
  const height = wrap.clientHeight - (railNavbarMax - navbar) - px(cs.paddingTop) - px(cs.paddingBottom) - (legend ? legend.offsetHeight + px(cs.rowGap) : 0)
  const f = fitRail({ n: shownRows.value.length, width, height })
  const was = railFit.value
  if (f.cols !== was.cols || f.sq !== was.sq || f.gap !== was.gap || f.scroll !== was.scroll) railFit.value = f
  if (f.scroll) nextTick(() => { const now = wrap.querySelector('.rail-sq.now'); if (now && now.scrollIntoView) now.scrollIntoView({ block: 'nearest' }) })
}
let railObserver = null
watch(railWrapRef, (el, old) => {
  if (railObserver && old) railObserver.unobserve(old)
  if (!el) return
  if (!railObserver && typeof ResizeObserver !== 'undefined') railObserver = new ResizeObserver(() => measureRail())
  if (railObserver) railObserver.observe(el)
  nextTick(measureRail)
})
watch(() => shownRows.value.length, () => nextTick(measureRail))
watch([index, readyIndex], () => { if (railFit.value.scroll) nextTick(measureRail) })
onBeforeUnmount(() => { if (railObserver) railObserver.disconnect() })
function railClass(l, i) {
  return {
    now: phase.value === 'recording' ? i === index.value : i === readyIndex.value,
    done: isRecorded(l) && !isPending(l.id) && !hasMismatch(l.id),
    up: isPending(l.id),
    failed: (hasFailed(l.id) && !isRecorded(l)) || hasMismatch(l.id),
  }
}
// THE SHEET: everything that is not the line. "Change" on the settings line opens it at the
// settings; the where-am-I row's button opens it at the top.
const sheetOpen = ref(false)
const settingsRef = ref(null)
const whereRef = ref(null)
// The phone dropdown hangs from the bottom of the where-am-I row (and any banner above it).
const sheetTop = ref(44)
function closeSheet() { sheetOpen.value = false }
let swipeY = null
function swipeStart(e) { swipeY = e.touches && e.touches[0] ? e.touches[0].clientY : null }
function swipeEnd(e) {
  const t = e.changedTouches && e.changedTouches[0]
  if (swipeY !== null && t && swipeY - t.clientY > 40) closeSheet()
  swipeY = null
}
function onSheetKey(e) { if (e.key === 'Escape') closeSheet() }
watch(sheetOpen, (open) => {
  if (open) window.addEventListener('keydown', onSheetKey)
  else window.removeEventListener('keydown', onSheetKey)
})
onBeforeUnmount(() => window.removeEventListener('keydown', onSheetKey))
function openSheet(at) {
  const w = whereRef.value
  if (w) sheetTop.value = w.offsetTop + w.offsetHeight
  sheetOpen.value = true
  if (at === 'settings') nextTick(() => { const el = settingsRef.value; if (el && el.scrollIntoView) el.scrollIntoView({ block: 'start' }) })
}
// A SQUARE ON THE RAIL: live, the cursor goes straight there; before Start, Start opens there.
function onRailTap(i) {
  const l = lines.value[i]
  if (!l || editingId.value) return
  if (phase.value === 'recording') return goToLine(i)
  if (phase.value === 'ready') pinCursor(l.id)
}
// THE BATCH LIST (Aran, 2026-10-15). A row's dot wears the rail's four colours, from the same facts.
const showGrid = ref(false)
function lineDot(l) {
  const c = railClass(l, -1)
  return c.up ? 'up' : c.failed ? 'failed' : c.done ? 'done' : 'empty'
}
// A take to play: stored on the server, this tab's blob, or one still waiting on this device.
function hasTake(l) {
  return !!(storedUrlFor(l.id) || localUrlFor(l.id) || queue.isUnsent(l.id))
}
// Tapping the words moves the cursor: before Start, Start opens there; from the done screen, back
// to the batch page standing on it. The sheet steps aside so the line is in view.
function onListTap(i) {
  const l = lines.value[i]
  if (!l || editingId.value) return
  pinCursor(l.id)
  closeSheet()
  if (phase.value === 'done') backToStart()
}
// ▶ plays his take of that line and touches nothing else. A take still waiting to upload from an
// earlier visit has no blob in this tab, so it is read off the device store first.
async function playFromList(lineId) {
  if (playingId.value !== lineId && !storedUrlFor(lineId) && !localUrlFor(lineId) && queue.unsentBlob) {
    const blob = await queue.unsentBlob(lineId).catch(() => null)
    if (blob) rememberLocalTake(lineId, blob)
  }
  togglePlay(lineId)
}
// A line tapped on the map opens the mic on it: the sheet steps out of the way first.
function recordFromSheet(lineId) {
  closeSheet()
  return recordOne(lineId)
}
watch(phase, (p) => { if (p === 'recording') sheetOpen.value = false })

// ── Rewriting a line, on a TEST COURSE only ─────────────────────────────────
// Tom, 2026-09-02: "it is a TEST course so it can have any rules we like", so
// the booth may rewrite a zzz_ line's text in place and he can walk the real
// journey — edit, read it, come back, edit again, read it again.
//
// `canEditText` comes off the SERVER, per line, and the server checks it again
// on the write. A live pod line never gets an edit control here and could not
// be written even if one appeared: changing live pod text in place breaks the
// content-change migration protocol silently.
//
// WHAT HAPPENS TO THE TAKE THE LINE ALREADY HAD. Nothing is deleted. A clip is
// identified by its text, so new text simply has no take — the line goes back to
// outstanding, here and on the server, and the old clip stays exactly where it
// was until a new one lands.
const editingId = ref(null)
const editText = ref('')
const editSaving = ref(false)
const editError = ref(null)
// WHICH SIDE of the line the open editor is on. 'target' is his words; 'known'
// is the crib, which is his to fix too — and fixing it never touches his take.
const editingSide = ref('target')
const editBox = ref(null)
// The box grows to the words, from the first frame, so opening the editor moves
// nothing on the page.
const editBoxHeight = ref('auto')
// The one short human line, and it appears ONLY when an edit actually cost
// something — see saveEdit. A single ref, overwritten, so there is no stack and
// nothing to dismiss.
const savedNote = ref('')
// WHICH ROW it belongs to. The roster puts it on that row rather than under the
// whole list — see RecordistRoster.
const savedId = ref(null)
let savedTimer = null
// Esc blurs the box on its way out, and blur is what saves. This says which of
// the two just happened.
let abandoning = false

function say(words, lineId = null) {
  savedNote.value = words
  savedId.value = lineId
  clearTimeout(savedTimer)
  savedTimer = setTimeout(() => { savedNote.value = ''; savedId.value = null }, 6000)
}

// TAP THE WORD YOU MEANT. The offset is worked out from where the thumb landed
// before the paragraph is replaced by the box, because afterwards there is
// nothing left to measure against.
function onLineTap(ev) {
  const l = current.value
  if (!l || !l.canEditText) return
  beginEdit(l.id, caretOffsetFromPoint(ev.currentTarget, ev.clientX, ev.clientY))
}

function beginEdit(lineId, caretAt = null, side = 'target') {
  const l = lines.value.find(x => x.id === lineId)
  if (!l || !l.canEditText) return
  if (editingId.value === lineId && editingSide.value === side) return
  editingSide.value = side
  stopPlayback()
  // Same hold as a playback, for the same reason: a live microphone under an
  // open keyboard is recording the room and calling it his take. The SESSION is
  // held, never ended — the queue, the position and the run all survive.
  if (phase.value === 'recording') {
    micHeld.value = true
    try { recorder.discardLine() } catch { micHeld.value = false }
  }
  abandoning = false
  editError.value = null
  savedNote.value = ''
  savedId.value = null
  editText.value = side === 'known' ? plainText(l.knownText || '') : plainText(l.text)
  editingId.value = lineId
  nextTick(() => {
    sizeEditBox()
    openEditorAt(editBox.value, caretAt)
  })
}

// Height follows the words, so a line that wraps onto a third row pushes nothing
// about and a shorter one leaves no hole.
function sizeEditBox() {
  const el = editBox.value
  if (!el) return
  el.style.height = 'auto'
  editBoxHeight.value = `${el.scrollHeight}px`
}

function cancelEdit() {
  abandoning = true
  editingId.value = null
  editingSide.value = 'target'
  editError.value = null
  releaseMic()
}

// The blur that ends an edit. It saves — unless Esc got there first, in which
// case the original text is already what is on screen and there is nothing to do.
function commitEdit() {
  if (abandoning) { abandoning = false; return }
  if (!editingId.value || editSaving.value) return
  saveEdit(editingId.value, editText.value)
}

async function saveEdit(lineId, text, side = editingSide.value) {
  const l = lines.value.find(x => x.id === lineId)
  const next = String(text || '').trim()
  if (!l) return
  const known = side === 'known'
  if (!next || next === plainText(known ? (l.knownText || '') : l.text)) { cancelEdit(); return }
  const wasRecorded = isRecorded(l)
  editSaving.value = true
  editError.value = null
  try {
    const res = await fetch(
      withBoothKey(`${apiBase()}/api/recording/voice/${encodeURIComponent(props.voiceId)}/line/${encodeURIComponent(lineId)}/text`, props.voiceId),
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        // ONE SIDE PER SAVE. The server unlinks only the take of the side whose
        // words moved (recordist-router.cjs), so a known-side fix never costs
        // him his own take, and the screen below follows the same rule.
        body: JSON.stringify(known ? { knownText: next } : { text: next }),
      }
    )
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || 'That did not save. Try again.')
    if (known) {
      // THE CRIB CHANGED; HIS TAKE DID NOT. Nothing about recorded-ness moves:
      // the known take (somebody else's voice, or a machine's) is set aside by
      // the server, and that is not his to read again.
      l.knownText = data.knownText !== undefined ? data.knownText : next
      lines.value = [...lines.value]
      editingId.value = null
      editingSide.value = 'target'
      releaseMic()
      return
    }
    // DID THIS EDIT ACTUALLY COST THE ARTIST ANYTHING?
    //
    // The artist's own view of the line, and nothing else. NOT the server's
    // `unlinkedAudioId`: a slot can hold a clip this artist did not make — a
    // TTS take, or another voice's — which the booth already shows as a line
    // still to record. Saying "read it again" about a line they have never read
    // is the tool talking about itself. Observed on cym_n_for_eng:pod-1:SC08-S006,
    // whose slot is filled and whose queue entry is recorded:false.
    const hadTake = wasRecorded
    // The line is now a line nobody has read: new text, no take, outstanding.
    // Every count and every control on this page reads off these fields, so
    // saying it once here is what makes the roster, the progress line and the
    // Start button all agree without a reload.
    l.text = data.text
    if (data.knownText !== undefined) l.knownText = data.knownText
    l.recorded = false
    l.clipUrl = null
    l.rerecordWanted = false
    doneIds.value.delete(lineId)
    doneIds.value = new Set(doneIds.value)
    if (queue.saved.delete) queue.saved.delete(lineId)
    if (queue.failed.delete) queue.failed.delete(lineId)
    sessionIds.value = sessionIds.value.filter(id => id !== lineId)
    if (lastLine.value && lastLine.value.id === lineId) lastLine.value = null
    lines.value = [...lines.value]
    editingId.value = null
    // NOTHING IS SAID IN THE COMMON CASE, and that is the point (Tom,
    // 2026-09-03). Fixing a line before anybody has read it costs nothing:
    // there is no take to clear, nothing goes back into the queue, and there is
    // no consequence to report. The corrected line IS the receipt.
    //
    // Where a take DID exist, one short line — because there the edit really has
    // taken something away and the artist has to know to read it again. The
    // server's own word for it: which clip, if any, this unlinked.
    if (hadTake) {
      say(data.alsoChanged
        ? `Saved, read it again — also fixed on ${data.alsoChanged} other ${data.alsoChanged === 1 ? 'line' : 'lines'}.`
        : 'Saved, read it again.', lineId)
    }
    // The mic comes back only where the editor has actually closed. Released in
    // a `finally`, a failed save left the microphone live underneath an open
    // rewrite box while the screen still said "mic paused" — recording her
    // typing, and lying about it in the one place that is meant to be certain.
    releaseMic()
  } catch (err) {
    // The words stay in the box. Nothing the artist typed is thrown away
    // because the network was not there.
    editError.value = (err && err.message) || 'That did not save. Try again.'
  } finally {
    editSaving.value = false
  }
}

// Which bytes a line's play button points at, in strict precedence — the order
// IS the honesty. A failed or in-flight NEW take must never fall back to the
// clip it is replacing: playing the previous take under the word "stored" is
// the same lie as playing the local blob.
function storedUrlFor(lineId) {
  if (queue.failed.has(lineId)) return null                       // nothing to play
  if (queue.saved.has(lineId)) return recordistClipUrl(props.voiceId, lineId)
  if (sessionIds.value.includes(lineId)) return null              // this session's take is still in flight
  const line = lines.value.find(l => l.id === lineId)
  // clipUrl, and the SERVER decides what that is. It used to be sent for any
  // line with a take, including one whose take we had rejected, so a "Listen"
  // button played the reader their own junk read back at them. Under Tom's
  // 2026-09-02 ruling the server sends null for those, and this needs no rule of
  // its own: no clip on the wire, no button. The three checks ABOVE this line
  // are all THIS SESSION's — a take just made still plays, refused or not.
  // BELT AND BRACES on the one thing this screen must never do. The server
  // already withholds clipUrl for a rejected take; refusing to play a line that
  // still admits `rerecordWanted` means the leak needs BOTH sides to fail.
  if (line?.rerecordWanted) return null
  return line?.clipUrl ? recordistClipUrl(props.voiceId, lineId) : null  // a take from a previous session
}
// THE TAKE JUST MADE, PLAYABLE AT ONCE. The in-browser blob of this session's
// take, by object URL, offered only while the stored clip is not yet there and
// the upload has not failed. Never offered once stored (the stored bytes are the
// truth) and never for a failed take (the button must say NOT SAVED).
const localTakeUrls = new Map()
const localTakeVersion = ref(0)
function localUrlFor(lineId) {
  localTakeVersion.value // reactive dependency: a new take re-evaluates this
  if (queue.failed.has(lineId) || queue.saved.has(lineId)) return null
  return localTakeUrls.get(lineId) || null
}
function rememberLocalTake(lineId, blob) {
  const old = localTakeUrls.get(lineId)
  if (old) URL.revokeObjectURL(old)
  try { localTakeUrls.set(lineId, URL.createObjectURL(blob)) } catch { localTakeUrls.delete(lineId) }
  localTakeVersion.value++
}
function forgetLocalTakes() {
  for (const u of localTakeUrls.values()) URL.revokeObjectURL(u)
  localTakeUrls.clear()
}
function isPending(lineId) {
  // `isUnsent` is the durable answer — it covers takes carried over from a
  // previous session, which sessionIds knows nothing about.
  if (queue.isUnsent(lineId)) return true
  return !queue.saved.has(lineId) && !queue.failed.has(lineId) && sessionIds.value.includes(lineId)
}
function hasFailed(lineId) { return queue.failed.has(lineId) }

// ── Takes that saved but did not match their words (job #842) ──────────────
// The server's script check runs after the upload answers, so its verdict arrives by polling
// (pollTextChecks, below). A flagged line is SAVED — green would be a lie and so would grey — so it
// is drawn like a refused one: red on the rail, back in the reading flow, counted on the slim bar,
// with one small line under the words saying what was heard. Reading it again clears it at once.
// (textCheckFails and retakenAt are declared beside `lines`, so nothing in setup meets them early)
function hasMismatch(lineId) { return textCheckFails.value.has(lineId) && !isPending(lineId) }
function noteRetake(lineId) {
  const r = new Map(retakenAt.value); r.set(lineId, Date.now()); retakenAt.value = r
  if (textCheckFails.value.has(lineId)) {
    const m = new Map(textCheckFails.value); m.delete(lineId); textCheckFails.value = m
  }
}

// ── Is my work safe? ────────────────────────────────────────────────────────
// Three states, three sets of words, and they are never interchangeable:
//   • the device is not persisting     — closing this tab really does lose work
//   • takes are waiting to go up       — the bytes are safe, the upload is not done
//   • everything is on the server      — nothing said, because nothing is wrong
// The middle one is the one that did not exist before, and the one Aran needed
// on the night he could not tell whether his session had survived.
const unsentCount = computed(() => queue.pendingCount.value)
function takesWord(n) { return n === 1 ? 'take' : 'takes' }

const safetyBanner = computed(() => {
  if (!queue.persistent.value && unsentCount.value > 0) {
    return {
      cls: 'risk',
      head: `${unsentCount.value} ${takesWord(unsentCount.value)} not saved on this device`,
      detail: 'This browser will not keep recordings, so keep this page open until they have all uploaded.',
    }
  }
  // A refused take has no banner of its own: on the home page it is a row of the one Re-record
  // card (job #806), and in a batch the rail marks it and one slim bar counts it (job #783).
  if (unsentCount.value > 0) {
    const carried = queue.carriedOverCount.value
    return {
      cls: 'waiting',
      head: `${unsentCount.value} ${takesWord(unsentCount.value)} still to upload`,
      detail: carried > 0
        ? `Saved on this device — including ${carried} from an earlier session — and uploading now. Nothing is lost if you close this page.`
        : 'Saved on this device and uploading now. Nothing is lost if you close this page.',
    }
  }
  // Never null (Aran, job #340): the line is always on screen, so uploads catching up changes its
  // words and colour but never its height — nothing below it jumps.
  return { cls: 'done', head: 'All takes uploaded, brilliant work!', detail: 'Everything you have recorded is safely on the server.' }
})

const doneHeadline = computed(() => {
  if (unsentCount.value === 0) return 'All saved'
  return queue.persistent.value ? 'Saved on this device — still uploading' : 'Saving…'
})
const doneNote = computed(() => {
  if (!queue.persistent.value) return 'Keep this page open until everything has saved.'
  const n = unsentCount.value
  return `${n} ${takesWord(n)} still to upload — they are saved on this device and will finish next time you open the booth.`
})

// ── Compare: raw original vs processed ──────────────────────────────────────
// One open at a time. The panel owns its own audio element, so opening a second
// one while the first still played would put two takes of two lines on top of
// each other — and the whole point is hearing one thing clearly.
const comparingId = ref(null)
function toggleCompare(lineId) {
  stopPlayback()
  comparingId.value = comparingId.value === lineId ? null : lineId
}

const failedNote = computed(() => {
  if (!lastLine.value) return null
  return queue.failed.get(lastLine.value.id) || null
})
// Every line this voice has a STORED take for — which is not the same set as
// the lines counted done. When a whole set is commissioned again (T-20 ALL:
// Aran's 170 Welsh lines, 71 of them with an existing take), every line reads
// as outstanding, and keying this off `recorded` emptied the section and took
// Compare with it — exactly when he most needs to hear what he already gave us.
const alreadyRecorded = computed(() => lines.value.filter(l => l.clipUrl))
// EVERY CATEGORY, NEVER JUST ONE (Tom, 2026-09-03). This listed only his POD
// sentences, because a minimal-set piece stopped being a line the moment it was
// recorded — the quarry dropped free pieces out of the set, so there was nothing
// left here to list. That is fixed at the source in lego-quarry.cjs; what the
// row needs from this screen is to SAY which category it is, so a list mixing
// conversations, chunks and seed sentences reads as one thing rather than as an
// unexplained jumble.
const KIND_WORDS = { pod: 'POD-1', seed: 'NEW SEEDS', seedexisting: 'Whole sentences — seeds already in the course', quarry: 'The minimal set', rerecord: 'MORE LINES', phrase: 'PRACTICE PHRASES' }
function kindWords(l) {
  // A pod line is named by ITS OWN pod, not by the word "pod": this list is
  // searchable, and "senedd" has to find the Senedd lines in it.
  if ((l.kind || 'pod') === 'pod') return podSectionFor(l).heading
  return KIND_WORDS[sectionKeyOf(l)] || 'Everything else'
}
// THE ESTATE RULE, applied to a list rather than a dropdown (Tom, 2026-09-03:
// "all dropdowns in popty, or in general in ANY of my work should have
// search/filter at the very top"). Same threshold as FilterSelect: past eight
// rows nobody should be scrolling to find one line. Matches the words AND the
// category, so "minimal" narrows to the chunks.
const RECORDED_FILTER_THRESHOLD = 8
const recordedFilter = ref('')
// The words AND the category, so "senedd" narrows to the Senedd lines and
// "minimal" to the chunks. One function, used by the grouping below and by the
// "nothing matches" line, so a filter can never find a row the list then fails
// to draw.
function recordedMatches(l, q) {
  return plainText(l.text).toLowerCase().includes(q) || kindWords(l).toLowerCase().includes(q)
}
const alreadyRecordedShown = computed(() => {
  const q = recordedFilter.value.trim().toLowerCase()
  if (!q) return alreadyRecorded.value
  return alreadyRecorded.value.filter(l => recordedMatches(l, q))
})
// GROUPED LIKE THE QUEUE, AND FROM THE QUEUE'S OWN NAMES. Tom, 2026-09-04: "it
// would be great if Aran could see the lines already recorded by expandable
// section". The headings come from kindWords() and the ORDER comes from
// rosterSections — the queue's own computed — rather than from a second copy of
// the strings living down here, because a second copy is how the two halves of
// this screen would come to disagree.
const recordedSectionList = computed(() => recordedSections(alreadyRecorded.value, {
  headingFor: kindWords,
  order: rosterSections.value.map(s => s.heading),
  filter: recordedFilter.value,
  matchRow: recordedMatches,
}))
// ALL SHUT WHEN HE LANDS. The point of the sections is that the settings panel
// is SHORT: 168 rows under a heading he has not asked to open is the flat list
// again with extra steps. His own taps are remembered while the page is open,
// so clearing a search puts the panel back the way he left it rather than
// slamming everything shut underneath him.
// The state itself lives in section-collapse.js, shared with the every-line
// list in RecordistRoster: one copy of "which sections are open", two lists.
const recordedCollapse = useSectionCollapse()
const isRecordedSectionOpen = recordedCollapse.isOpen
const toggleRecordedSection = recordedCollapse.toggle
const sessionLines = computed(() =>
  sessionIds.value.map(id => lines.value.find(l => l.id === id)).filter(Boolean)
)
const failedList = computed(() => sessionLines.value.filter(l => queue.failed.has(l.id)))

// REFUSED LINES IN THIS BATCH, in queue order: a line the server refused that holds no other take.
// The same test that makes Jump to next unrecorded stop on it (isRecorded is false while it is
// refused), so the bar's count, its Go to first, the rail and Jump never disagree.
const refusedInBatch = computed(() =>
  lines.value.map((l, i) => ({ l, i })).filter(({ l }) => (hasFailed(l.id) && !isRecorded(l) && !isPending(l.id)) || hasMismatch(l.id))
)
const firstRefusedIndex = computed(() => (refusedInBatch.value.length ? refusedInBatch.value[0].i : -1))
// Every refused line here was refused for having no speech on it (a blip moved it on, or only the
// room was heard): nothing was lost, so the bar is a small grey note, not a red one (job #915).
const isNoSpeechLine = (l) => hasFailed(l.id) && !hasMismatch(l.id) && isNoSpeechRefusal(queue.failed.get(l.id))
const refusedAllNoSpeech = computed(() => refusedInBatch.value.length > 0 && refusedInBatch.value.every(({ l }) => isNoSpeechLine(l)))
const currentRefusedNoSpeech = computed(() => !!current.value && isNoSpeechLine(current.value))
const currentRefusedWhy = computed(() => {
  const l = current.value
  if (l && hasMismatch(l.id) && !(hasFailed(l.id) && !isRecorded(l))) return mismatchLineWords(textCheckFails.value.get(l.id))
  if (!l || !hasFailed(l.id) || isRecorded(l) || isPending(l.id)) return ''
  return refusedLineWords(queue.failed.get(l.id))
})

function stopPlayback() {
  if (audioEl) { audioEl.onended = null; audioEl.onerror = null; audioEl.pause() }
  playingId.value = null
  releaseMic()
}

// Give the line back to the microphone after a playback. discardLine() first,
// always: the recorder kept running through the playback, and that capture is
// the speaker, not the reader. beginLine() then re-opens the same line clean.
// Both calls do their work synchronously — the promise discardLine returns is
// only the discarded blob, which nobody wants.
function releaseMic() {
  paused.value = false
  if (!micHeld.value) return
  micHeld.value = false
  if (phase.value !== 'recording') return
  try {
    recorder.discardLine()
    recorder.beginLine()
  } catch { /* the stream is gone; the phase change will have said so */ }
}

function togglePlay(lineId) {
  playbackError.value = null
  if (playingId.value === lineId) { stopPlayback(); return }
  const url = storedUrlFor(lineId) || localUrlFor(lineId)
  if (!url) return
  stopPlayback()
  // Hold the mic BEFORE a byte plays. Doing it after would leave the first
  // moment of the playback on the take.
  if (phase.value === 'recording') {
    micHeld.value = true
    try { recorder.discardLine() } catch { micHeld.value = false }
  }
  if (!audioEl) audioEl = new Audio()
  audioEl.src = url
  playingId.value = lineId
  audioEl.onended = () => { if (playingId.value === lineId) playingId.value = null }
  const fail = async () => {
    if (playingId.value === lineId) playingId.value = null
    playbackError.value = await diagnoseRecordistClip(props.voiceId, lineId)
  }
  audioEl.onerror = fail
  const p = audioEl.play()
  if (p && typeof p.catch === 'function') p.catch(fail)
}

// ── Session ─────────────────────────────────────────────────────────────────
async function begin() {
  const at = readyIndex.value
  if (at === -1) return
  micError.value = null
  try {
    await recorder.start(selectedDeviceId.value || null, captureProfile.value)
  } catch (err) {
    micError.value = friendlyMicError(err)
    return
  }
  recorder.listDevices()
  readThisSession.value = 0
  sessionIds.value = []
  lastLine.value = null
  advanceLock.reset()
  index.value = at
  phase.value = 'recording'
  pinCursor(lines.value[at] && lines.value[at].id)
  await settleThenReveal()
}

// OPEN THE MIC, THEN SHOW THE LINE (Tom's ruling, 2026-09-02).
//
// The recorder has been running since recorder.start() returned; this holds the
// line off the screen until it has captured enough room tone for the trim to
// take its margin out of, and only then reveals it. The reveal is the go
// signal.
//
// It costs nothing where nothing is owed: awaitLeadIn() settles at once when
// the active recorder is already old enough, which is every boundary inside a
// session, where #104's standby has been running through the quiet. Only a cold
// start — a session opening, or one line re-opened from the done screen —
// actually waits, and only for as long as it is short by.
async function settleThenReveal() {
  arming.value = true
  try {
    await recorder.awaitLeadIn()
  } catch { /* a dead recorder shows itself elsewhere; never trap her here */ }
  arming.value = false
  recorder.beginLine()
}

function friendlyMicError(err) {
  const n = err && err.name
  if (n === 'NotAllowedError') return 'Microphone blocked. Allow microphone access for this site, then tap Start again.'
  if (n === 'NotFoundError') return 'No microphone found. Use a device with one and try again.'
  if (n === 'NotReadableError') return 'Your microphone is in use by another app. Close it and try again.'
  return (err && err.message) || 'Microphone unavailable.'
}

// One line, one step forward — see src/views/recordist/advance-lock.js for the
// race it closes and why a debounce could not.
const advanceLock = createAdvanceLock()
// What the lock knows a line by. The id the server gave it, which is also what
// the take is filed under; the index is only a fallback for a line that somehow
// arrived without one, and a line with neither is never advanced from.
function lineKeyAt(i) {
  const l = lines.value[i]
  if (!l) return null
  return l.id ?? `#${i}`
}

const canGoBack = computed(() => phase.value === 'recording' && prevFlowFrom(index.value) !== -1)

let lastTapAt = 0
function debounced() {
  const now = Date.now()
  if (now - lastTapAt < 250) return false
  lastTapAt = now
  return true
}
// Back keeps its OWN window. The one above is shared between Next and Again to
// swallow a bouncy tap on the same control; Back is not that — "Next, no, back"
// is one of the fastest and most deliberate things a recordist does, and on the
// shared window it simply did not happen. Verified in the browser: a Back tap
// inside 250ms of a Next tap was silently dropped.
let lastBackTapAt = 0
function backDebounced() {
  const now = Date.now()
  if (now - lastBackTapAt < 250) return false
  lastBackTapAt = now
  return true
}

// `target` is the line as it was when the take was CLOSED (take-target.js), never
// a position: the cursor may be six lines away by the time the blob lands.
function commit(target, blob, hadSpeech, advance = null) {
  const found = resolveTakeTarget(target, lines.value)
  // THE WRONG-LINE GUARD. The line is gone or its words changed under the tail:
  // this audio belongs to nothing on the screen, so it is filed under nothing.
  if (!found.ok) return
  const line = found.line
  // Never save silence: a take with nothing said on it didn't happen.
  //
  // This used to be a blob-size test, and that test is now meaningless: every
  // clip carries pre-roll and tail by design, so even a line nobody read comes
  // back as several kilobytes of room. What the recorder KNOWS is whether it
  // ever heard the voice while this line was open, and that is what decides it.
  // The size floor stays underneath as a backstop for a capture that failed
  // outright.
  //
  // `hadSpeech` is TRUE, FALSE or NULL, and null means the recorder does not
  // know — its meter never delivered a sample, so it heard nothing about
  // anything. Only FALSE refuses a take. Not knowing is not the same as knowing
  // there was silence, and on 2026-08-22 the difference was a whole session:
  // every line read, every clip captured, every take refused, because the level
  // meter was reading zero and the meter is the only witness this test has.
  if (!blob || blob.size < 1200 || hadSpeech === false) {
    queue.markFailed(line.id, 'That take came out silent — read it again.')
    if (!sessionIds.value.includes(line.id)) sessionIds.value = [...sessionIds.value, line.id]
    lastLine.value = line
    return
  }
  // A line he came BACK to and read again is one line read, not two. The queue
  // already supersedes the earlier take of the same lineId and sessionIds
  // already refuses to list it twice; this is the last of the three counts that
  // was still double-counting a re-read.
  const firstTakeOfThisLine = !sessionIds.value.includes(line.id)
  queue.queueTake({ voiceId: props.voiceId, lineId: line.id, text: line.text, blob, micLabel: micLabel(), advance })
  noteRetake(line.id)
  rememberLocalTake(line.id, blob)
  doneIds.value.add(line.id)
  doneIds.value = new Set(doneIds.value)
  if (firstTakeOfThisLine) sessionIds.value = [...sessionIds.value, line.id]
  if (playingId.value === line.id) stopPlayback()
  lastLine.value = line
  if (firstTakeOfThisLine) readThisSession.value++
}

// The bar as a number. "Barely moving" and "not moving" look the same on a
// phone at arm's length and mean opposite things; this is what told us which
// one Tom was looking at on 2026-08-22, and it costs a label.
function db(v) {
  if (!(v > 0)) return '−∞'
  return `${(20 * Math.log10(v)).toFixed(0)} dB`
}
const micDb = computed(() => `${db(recorder.inputPeak.value)} · room ${db(recorder.roomTone.value)}`)

// ── The waveform ────────────────────────────────────────────────────────────
// Aran wants a confidence signal, not a tool: "some kind of visual
// representative of the waveform would give people confidence that they are
// doing it right". So this is movement over time and nothing else — no axis, no
// timeline, no scrubbing, no controls hanging off it.
//
// IT COSTS NOTHING ON THE CAPTURE PATH, and that is the whole design. The peaks
// are the ones useTapRecorder's existing meter loop already computes every frame
// for the bar this replaces; all that is added is a fixed 120-slot ring (two
// seconds at 60fps) of plain numbers — deliberately NOT reactive, so a value
// changing sixty times a second cannot drag Vue's renderer along with it — and
// one requestAnimationFrame that paints it. No second AnalyserNode, no second
// AudioContext, no second getUserMedia, no extra FFT.
const waveCanvas = ref(null)
const WAVE_SAMPLES = 120
const waveRing = new Float32Array(WAVE_SAMPLES)
let waveHead = 0
let waveRaf = null
let waveW = 0
let waveH = 0
let waveInk = null

function paintWave() {
  waveRaf = requestAnimationFrame(paintWave)
  const el = waveCanvas.value
  if (!el) return
  // A held mic writes silence, so the trace visibly FLATTENS rather than the
  // screen merely saying it is paused. Same reason the bar read 0%.
  waveRing[waveHead] = micHeld.value ? 0 : Math.min(1, recorder.inputPeak.value || 0)
  waveHead = (waveHead + 1) % WAVE_SAMPLES

  const dpr = Math.min(2, window.devicePixelRatio || 1)
  const w = Math.round(el.clientWidth * dpr)
  const h = Math.round(el.clientHeight * dpr)
  if (!w || !h) return
  if (w !== waveW || h !== waveH) { el.width = w; el.height = h; waveW = w; waveH = h }

  const ctx = el.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, w, h)
  // The trace takes the chip's own ink (CSS `color` on .wave), so it reads in light mode as well
  // as dark and turns red with the chip when it is too loud. Read every few frames, not every one.
  if (!waveInk || (waveHead % 15) === 0) waveInk = getComputedStyle(el).color || '#047857'
  ctx.fillStyle = waveInk
  const step = w / WAVE_SAMPLES
  const barW = Math.max(1, step - dpr)
  const mid = h / 2
  for (let i = 0; i < WAVE_SAMPLES; i++) {
    const v = waveRing[(waveHead + i) % WAVE_SAMPLES]
    // Half-height each side of the centre line, with a floor of one pixel so the
    // trace stays a line rather than disappearing in a quiet room.
    const a = Math.max(dpr / 2, (v * h) / 2)
    ctx.fillRect(i * step, mid - a, barW, a * 2)
  }
}

function startWave() {
  if (waveRaf != null) return
  waveW = 0; waveH = 0
  waveRing.fill(0)
  waveRaf = requestAnimationFrame(paintWave)
}
function stopWave() {
  if (waveRaf != null) { cancelAnimationFrame(waveRaf); waveRaf = null }
}
// Only while there is a canvas to paint into: the loop must not idle through the
// roster and done screens.
watch(phase, (p) => {
  if (p === 'recording') nextTick(startWave)
  else stopWave()
  emit('phase', p)
}, { immediate: true })

// What the recorder can honestly say about whether this line was read: true,
// false, or null for "no idea". Null is what a meter that is not delivering
// samples is entitled to say, and it is the only answer that never destroys a
// performance.
// ADVANCE TELEMETRY (Aran, 2026-10-26): auto, tap or stop, the ms since the
// meter last heard speech, and the speech/quiet thresholds then in force. It
// rides on the take's upload into the server's [BoothTake] line. Never allowed
// to throw: a telemetry fault must not cost a take or a step forward.
function advanceInfo(by) {
  try { return { by, ...recorder.advanceSnapshot() } } catch { return { by } }
}

function speechVerdict() {
  if (!recorder.meterTrusted.value) return null
  return recorder.lineHasSpeech.value
}

async function onNext(source = 'tap', to = 'next') {
  if (phase.value !== 'recording' || arming.value || busy.value || paused.value || !debounced()) return
  // Tapping a control while a take is playing means "enough listening". Stop it
  // and give the line back to the mic before anything is filed, so the playback
  // never lands inside the take this call is about to close.
  if (playingId.value) stopPlayback()
  // Exactly one step away from any one line. `busy` cannot do this job: on the
  // normal path there is no await inside the try, so it is true for a
  // synchronous instant and a watcher flushing on the next tick sails past it.
  if (!advanceLock.claim(lineKeyAt(index.value), source)) return
  busy.value = true
  try {
    const i = index.value
    // Snapshot BEFORE the next line opens: beginLine() resets it, and the blob
    // does not land for up to a tail-length afterwards.
    const hadSpeech = speechVerdict()
    // How this line moved on, read at the instant it did (the server logs it).
    const advance = advanceInfo(source === 'auto' ? 'auto' : 'tap')
    // The blob is not awaited before advancing. endLine() keeps the outgoing
    // recorder running for its tail — that is the whole point of it — so
    // waiting here would put a visible pause on every line for audio that is
    // already guaranteed. The screen moves now; the take files itself when the
    // tail is done.
    const target = takeTargetAt(lines.value, i)
    const pending = recorder.endLine()
    // The words he has just said are said: their twins leave the flow BEFORE the next line is
    // picked (job #198), not when the take lands a tail-length later.
    const closingKey = hadSpeech === false ? null : twinKey(lines.value[i])
    if (closingKey) closingTwinKeys.value = new Set([...closingTwinKeys.value, closingKey])
    // ONE LINE ON, never a scan (THE ONE CURSOR). On the last line this is Done.
    const n = to === 'unrecorded' ? nextIndexFrom(i) : nextFlowFrom(i)
    if (n !== -1) {
      index.value = n
      // Wherever he lands, that line gets its step forward: he may have left it
      // once already, earlier in the batch, and it must not refuse to let him go.
      advanceLock.reopen(lineKeyAt(n))
      recorder.beginLine()
    }
    pending.then(blob => {
      // Nothing heard on this line: he was moving, not reading, so nothing is
      // filed — a line he walked across keeps the take it had. Where the meter
      // cannot say (null), a line with no take yet is filed as before (a lost
      // take is the worse mistake), but a line that HAS one is left alone:
      // walking over saved work must never replace it with room tone.
      if (hadSpeech === false) return
      if (hadSpeech === null && target && lines.value.some(l => l.id === target.id && (isRecorded(l) || isPending(l.id)))) return
      commit(target, blob, hadSpeech, advance)
    }).finally(() => {
      // The take has landed (its line is now settled on its own) or was refused (its twins are
      // owed again): either way the line's own state speaks for its twins from here.
      if (closingKey && closingTwinKeys.value.has(closingKey)) {
        const next = new Set(closingTwinKeys.value); next.delete(closingKey); closingTwinKeys.value = next
      }
    })
    if (n === -1) {
      await pending
      // A run that ends on its last line starts the next visit at the first line still owed.
      clearCursor(props.voiceId, cursorScope()); pinnedId.value = null
      await finish()
    }
  } finally { busy.value = false }
}

// "Jump to next unrecorded" — the ONLY control that skips. Same filing as ›.
function onJumpUnrecorded() {
  if (nextUnrecordedIndex.value === -1) return
  return onNext('tap', 'unrecorded')
}

// ── Moving on by itself ─────────────────────────────────────────────────────
// The recordist reads; when they stop, the studio goes to the next line. No
// tap. This is only safe because the capture no longer ends where the line
// ends: the outgoing recorder runs on for its tail and the incoming one has
// been running since before this decision was made, so advancing a beat too
// early costs nothing but a slightly longer clip. Under the old per-line
// recorder the same feature would have cut every take.
const AUTO_ADVANCE_QUIET_MS = 1200

// A GAPPED READ ADVANCES ON A TAP, NEVER ON A SILENCE.
//
// Tom's ruling, 2026-09-02: "for this type of thing I reckon we could easily
// just have a next button after each phrase has been recorded. That would be
// fine - with no need for the automatic silence detection."
//
// The minimal set is read slowly with a deliberate gap around every word, so
// every pause in it looks exactly like the end of a take. No threshold tells
// the two apart, and there was never any point looking for one: the pause IS
// the performance here, and a button is the honest answer. He taps Next when he
// has finished the line.
//
// This is the only change to record mode, which Tom has otherwise ruled
// excellent, and it applies to the gapped style ALONE -- a natural-speed read
// keeps auto-advance exactly as it was. Nothing else about how a line is served
// moves: capture is continuous and never truncated (useTapRecorder keeps the
// outgoing recorder running for its tail), so auto-advance was the only thing a
// gapped read could trip.
const isGappedLine = computed(() => !!current.value && current.value.readStyle === 'gapped')

// THE VOLUMES Tom named, 2026-09-02. 30 is the default and it is the honest
// one: 198 lines, about 13 minutes, which is genuinely an evening job. The
// others are here so he can see what the burden does as the course grows
// before anyone commits a community recordist to it.
const SEED_VOLUMES = [30, 50, 100, 150, 300]
const maxSeed = ref(null)
const quarry = ref(null)
// THE PRACTICE-PHRASE BATCH SUMMARY, straight off the wire (job #619).
const phrases = ref(null)
// LINES OF HIS THAT HAVE NO TARGET TEXT YET, per pod, straight off the wire.
// See the note where it is read in load(), and the words it becomes below.
const notReady = ref([])
// LINES HE READ THAT ARE NOW CAST TO SOMEBODY ELSE, per pod. Same shape, and
// it is the OPPOSITE fact: notReady is work nobody can do yet, this is work he
// has already finished. Neither is ever offered to him to read.
const handedOn = ref([])
function setVolume(n) {
  if (maxSeed.value === n) return
  maxSeed.value = n
  // A reload, not a filter: the set is COMPUTED from the ceiling, so a bigger
  // volume is different lines rather than more of the same ones.
  load()
}

const autoAdvance = ref(true)
watch(() => recorder.quietMs.value, (ms) => {
  // The gapped read opts OUT of silence detection entirely, whatever the
  // checkbox says: its silences are data, not the end of anything.
  if (isGappedLine.value) return
  if (!autoAdvance.value || phase.value !== 'recording' || arming.value || busy.value) return
  // A held mic is not listening to anybody. Without this, the recordist's own
  // take coming out of the phone speaker would advance the queue for them.
  if (micHeld.value || playingId.value) return
  if (!recorder.lineHasSpeech.value) return
  // A BLIP IS NOT A READ (Aran, 2026-10-28, job #915): one loud frame sets
  // lineHasSpeech; a quiet may only end the line once MIN_VOICED_MS of it was
  // voiced. Taps are untouched — this is the auto-advance gate alone.
  if (recorder.voicedMs.value < MIN_VOICED_MS) return
  // A SILENCE NEVER ENDS THE BATCH (Aran, live, 2026-10-15 15:09 BST, batch 5): on
  // the last line he pressed Again, began reading, drew breath — and the booth
  // jumped to the finished screen mid-sentence, because a quiet on the LAST line
  // was the same call as tapping Done. On the last line it waits: the finished
  // screen comes only from Done (› past the last line) or Stop, both his own taps.
  if (!hasNext.value) return
  // No cooldown on a freshly-opened line, deliberately: beginLine() sets
  // lineHasSpeech back to false and quietMs to 0, and the guard above means the
  // watcher cannot fire again until the recordist has actually said something on
  // the NEW line. A timer here would be doing nothing that the recorder is not
  // already doing, so there isn't one.
  if (ms >= AUTO_ADVANCE_QUIET_MS) onNext('auto')
})

async function onAgain() {
  if (phase.value !== 'recording' || arming.value || busy.value || paused.value || !debounced()) return
  if (playingId.value) stopPlayback()
  busy.value = true
  try {
    await recorder.discardLine()
    recorder.beginLine()
  } finally { busy.value = false }
}

// ── Pause ───────────────────────────────────────────────────────────────────
// The distinction from Again, which matters: onAgain() discards and IMMEDIATELY
// starts capturing again — "I fluffed it, let me read that once more". Pause
// discards AND STOPS CAPTURING until he chooses to come back, which is the whole
// point when the dog is barking or somebody is talking to him. Both stay.
//
// Nothing is uploaded, nothing is filed, and no red "that take came out silent"
// row appears: discardLine() throws the open capture away and the line is never
// closed, so the queue never hears about it.
function pauseTake() {
  if (phase.value !== 'recording' || arming.value || editingId.value) return
  // A playback holds the mic too; stop it first so there is one hold, not two
  // fighting over the same flag.
  if (playingId.value) stopPlayback()
  if (micHeld.value) return
  paused.value = true
  micHeld.value = true
  try { recorder.discardLine() } catch { micHeld.value = false; paused.value = false }
}

// "Starts from fresh when they hit play" — releaseMic() discards whatever the
// held recorder caught while he was away and re-opens the SAME line clean. It is
// the same door playback and editing come back through.
function resumeTake() {
  if (!paused.value) return
  releaseMic()
}

function togglePause() {
  if (paused.value) resumeTake()
  else pauseTake()
}

// ── Back ────────────────────────────────────────────────────────────────────
// Aran, mid-session on 2026-08-23: there was no way back. A line read badly, or
// a line skipped by the double-advance, was simply gone until the whole queue
// came round again.
//
// The take on the line he is leaving is DISCARDED, not filed. He presses Back
// because the line behind him is the one that needs fixing — the line he is
// standing on is one he has not read yet, so there is nothing here worth
// keeping, and filing a half-second of room tone under it would put a red
// "that take came out silent" on a line he never attempted. Same call Again
// makes, for the same reason.
//
// The line he lands on may already have a take from this session. That is fine
// and is the point: queueTake supersedes any earlier take of the same lineId,
// drops its stored clip until the new one lands, and commit() no longer counts
// the re-read as a second line.
// AND IT WORKS WHILE PAUSED. Aran, 2026-09-10: "pause disables the back
// button" — he pressed Pause BECAUSE he wanted to go back. The lock was written
// to protect the held microphone, and it treated four buttons alike when they
// are not alike: Again and Next need the mic open and file a take, so they stay
// locked; Back files nothing at all and discards the line it leaves, which is
// exactly what Pause has already done. So it may run, and the one thing it must
// not do is quietly re-open the mic behind a screen that says Paused: the hold
// survives the step back, and Play is still the only way out of it.
async function onBack() {
  const p = prevFlowFrom(index.value)
  if (p === -1) return
  return goToLine(p)
}

// THE CURSOR GOES STRAIGHT TO A LINE: ‹ (one back) and a tap on the rail. Both
// discard the open capture and file nothing, for the reasons Back always has.
async function goToLine(prev) {
  if (phase.value !== 'recording' || arming.value || busy.value || !backDebounced()) return
  if (!(prev >= 0 && prev < lines.value.length) || prev === index.value) return
  busy.value = true
  try {
    await recorder.discardLine()
    index.value = prev
    // He has come back here on purpose, so this line gets its step forward back.
    advanceLock.release(lineKeyAt(prev))
    // And so does the Next/Again bounce guard. That window exists to swallow a
    // second tap on the SAME control; a Back in between is a deliberate change
    // of mind, so the Next that follows it is a fresh intention and must land.
    lastTapAt = 0
    // ONLY WHEN SOMETHING IS PLAYING. stopPlayback() releases the microphone
    // unconditionally, and releasing it is exactly what un-pauses him — so
    // calling it blind here would have turned every Back into a Play. Same
    // shape onFinish already uses, for the same reason.
    if (playingId.value) stopPlayback()
    // Paused means paused. Stepping back does not un-pause him.
    if (!paused.value) recorder.beginLine()
  } finally { busy.value = false }
}

// STOP HERE WORKS WHILE PAUSED TOO, and for the same reason as Back: it files
// nothing on the line he is standing on. Paused, there is no take to close —
// Pause threw it away and the recorder has been held ever since — so the open
// capture is DISCARDED rather than ended, and the session finishes exactly as
// it would from a line nobody read. Everything already recorded is untouched.
async function onFinish() {
  if (phase.value !== 'recording' || arming.value || busy.value) return
  if (playingId.value) stopPlayback()
  busy.value = true
  try {
    if (paused.value) {
      try { recorder.discardLine() } catch { /* the stream is gone; finish anyway */ }
      paused.value = false
      micHeld.value = false
      await finish()
      return
    }
    const i = index.value
    const hadSpeech = speechVerdict()
    const advance = advanceInfo('stop')
    const target = takeTargetAt(lines.value, i)
    const blob = await recorder.endLine()
    // Stop pressed on a line nobody read is not a failed take — it is the end
    // of the session. Filing it would put a phantom red line on a clean run.
    // But that only holds where the recorder KNOWS nobody read it: if the meter
    // is not reading, a dropped final line is a lost take, and a phantom row on
    // the done screen is the cheaper of the two mistakes.
    if (hadSpeech !== false) commit(target, blob, hadSpeech, advance)
    // Stopped after reading this line: the next visit opens on the line after it.
    if (hadSpeech === true && nextFlowFrom(i) !== -1) pinCursor(lines.value[nextFlowFrom(i)].id)
    await finish()
  } finally { busy.value = false }
}

async function finish() {
  await recorder.stop()
  phase.value = 'done'
}

// From the done screen: re-open the mic for one line that didn't save.
async function recordOne(lineId) {
  const i = lines.value.findIndex(l => l.id === lineId)
  if (i === -1) return
  micError.value = null
  // A take still playing is stopped first: the mic must never open on the speaker (F57).
  if (playingId.value) stopPlayback()
  try {
    await recorder.start(selectedDeviceId.value || null, captureProfile.value)
  } catch (err) { micError.value = friendlyMicError(err); return }
  // A jump from the done screen is not a step along the path he walked, so it
  // starts its own: Back must never take him from here into a queue position he
  // left ten minutes ago.
  advanceLock.release(lineKeyAt(i))
  index.value = i
  phase.value = 'recording'
  pinCursor(lines.value[i].id)
  await settleThenReveal()
}

// RE-RECORD ALL, the artist's own. Offered only when this voice has takes to
// start over from, never on a recording pack, and not while takes are still
// waiting to upload (they would land after the reset and half-undo it).
const rerecordBusy = ref(false)
const rerecordError = ref(null)
const canRerecordAll = computed(() =>
  !voice.value.pack && voice.value.recorded > 0 && queue.pendingCount.value === 0)
async function rerecordAllMine() {
  if (!window.confirm('Re-record all?\n\nYour current takes are kept; you will record every line again from the top.')) return
  rerecordBusy.value = true
  rerecordError.value = null
  try {
    const res = await fetch(withBoothKey(`${apiBase()}/api/recording/voice/${encodeURIComponent(props.voiceId)}/rerecord-all`, props.voiceId), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: true, asArtist: true, reason: 'Artist pressed Re-record all in the booth' }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.error || `Could not start over (${res.status})`)
    // Lines uploaded in this tab are no longer recorded: clear the screen's
    // saved set so Start does not skip them.
    queue.reset()
    await load()
  } catch (err) {
    rerecordError.value = (err && err.message) || 'Could not start over — try again.'
  } finally {
    rerecordBusy.value = false
  }
}

async function backToStart() {
  stopPlayback()
  await load()
}

// ── Keyboard ────────────────────────────────────────────────────────────────
function onKey(e) {
  if (phase.value !== 'recording' || arming.value || e.repeat) return
  // EDITING IS TYPING. Space, R and B are letters in a rewrite box long before
  // they are controls, and this listener is on the window: with the editor open,
  // every space Tom typed into a line was calling onNext() — advancing the
  // queue, closing the take, and filing whatever the mic had under the line he
  // was in the middle of rewriting. He could not type a space at all. That is
  // the sharpest edge of "going back and forth threw it out of whack".
  if (editingId.value) return
  const t = e.target
  if (t && (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT' || t.isContentEditable)) return
  if (e.code === 'Space') { e.preventDefault(); onNext() }
  else if (e.key === 'r' || e.key === 'R') { e.preventDefault(); onAgain() }
  else if (e.key === 'p' || e.key === 'P') { e.preventDefault(); togglePause() }
  else if (e.key === 'b' || e.key === 'B') { e.preventDefault(); onBack() }
  else if (e.key === 'j' || e.key === 'J') { e.preventDefault(); onJumpUnrecorded() }
}
function beforeUnloadGuard(e) {
  // A take in progress is genuinely lost by leaving, and so is an unsent take
  // on a device that will not persist it. An unsent take on a device that WILL
  // is not at risk, and throwing the browser's "Leave site?" dialog at the
  // artist over it would be telling them their work is in danger when it is
  // not. The banner says what is happening; this only stops a real loss.
  const atRisk = phase.value === 'recording' || (queue.pendingCount.value > 0 && !queue.persistent.value)
  if (atRisk) { e.preventDefault(); e.returnValue = '' }
}

// A NEW BUILD REACHES AN OPEN BOOTH (job #829, router/versionReload.js): the booth is a page an
// idle reload costs nothing (takes are on the device, the cursor is kept), so the timed look may
// reload it — but never while beforeUnloadGuard would stop a real loss, nor mid-edit of a line.
const reloadKey = `booth:${Math.random().toString(36).slice(2)}`
const reloadUnsafe = computed(() => phase.value === 'recording' || !!editingId.value || (queue.pendingCount.value > 0 && !queue.persistent.value))
watch(reloadUnsafe, (on) => holdReload(reloadKey, on), { immediate: true })
onMounted(() => allowIdleReload(reloadKey, true))
onBeforeUnmount(() => { allowIdleReload(reloadKey, false); holdReload(reloadKey, false) })

// ── Load ────────────────────────────────────────────────────────────────────
// THE SETUP CHECK's "I'm done" — only offered on a per-artist setup pack once
// every phrase has a take. The server re-checks the count; this is the tap.
const setupSubmitting = ref(false)
// Tom 2026-10-07 (#848): Submit from this many saved phrases; the pack stays ten. Server mirror: SETUP_MIN_SUBMIT.
const SETUP_MIN_SUBMIT = 5
const setupOpen = computed(() => {
  const setup = voice.value.pack && voice.value.pack.setup
  return !!setup && (setup.status === 'open' || setup.status === 'changes' || setupRetryAsked.value)
})
// A submitted check whose automatic verdict said "try again" is the artist's to
// re-record and resubmit (the server re-judges on every submit).
const setupRetryAsked = computed(() => {
  const setup = voice.value.pack && voice.value.pack.setup
  return !!setup && setup.status === 'submitted' && !!setup.autoVerdict && setup.autoVerdict.verdict === 'retry'
})
// A partial session (record 1 of 10, stop) must NOT read as finished (review
// #846): a take counts once it is on the server or saved here.
const setupRecorded = computed(() =>
  lines.value.filter(l => l.recorded || queue.saved.has(l.id)).length)
const setupEnough = computed(() => setupRecorded.value >= SETUP_MIN_SUBMIT)
const canSubmitSetupHere = computed(() =>
  setupOpen.value && queue.pendingCount.value === 0 && failedList.value.length === 0
    && sessionLines.value.length > 0 && setupEnough.value)
// Never tell an artist to record what they have recorded (review #850): while
// takes are captured but not yet uploaded (network outage), say nothing about
// what is left; the upload banner explains. Submit waits on the same count.
const setupIncompleteHere = computed(() =>
  setupOpen.value && queue.pendingCount.value === 0 && sessionLines.value.length > 0 && !setupEnough.value)
// The ready card's Submit (review #854): same guard as the done card. Submit
// must never run ahead of captured takes still waiting to upload, or failed.
const readyCanSubmit = computed(() =>
  voice.value.recorded >= SETUP_MIN_SUBMIT && queue.pendingCount.value === 0 && queue.failed.size === 0)
const setupError = ref(null)
async function submitSetup() {
  setupSubmitting.value = true
  setupError.value = null
  try {
    const res = await fetch(withBoothKey(`${apiBase()}/api/recording/voice/${encodeURIComponent(props.voiceId)}/submit`, props.voiceId), {
      method: 'POST', headers: {},
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.error || `Could not submit (${res.status})`)
    await load()
  } catch (err) {
    setupError.value = (err && err.message) || 'Could not submit — try again.'
  } finally {
    setupSubmitting.value = false
  }
}

// A QUIET load (job #804) is the queue read again when the booth comes back into view: the
// screen stays as it is while it runs, and only the lines and their counts are replaced — the
// cursor, this session's takes and the done list are his and stay. A quiet read that fails, or
// that finds he has moved on (Start, another batch, another load) by the time it lands, is
// dropped without a word: the page he is looking at is still true as of his last read.
let loadGen = 0
let lastQueueRead = 0
async function load({ quiet = false } = {}) {
  const gen = ++loadGen
  const was = phase.value
  const movedOn = () => gen !== loadGen || phase.value !== was
  const readStartedAt = Date.now()
  if (!quiet) {
    phase.value = 'loading'
    loadError.value = null
    loadSlow.value = false
  }
  try {
    // Always ask for the WHOLE queue, recorded lines included, and filter
    // locally: the map draws every line, a tapped recorded line can be read
    // again, and the progress line can say "8 of 87" — which it cannot do if
    // the server has already dropped the 8.
    const seedParam = maxSeed.value ? `&maxSeed=${maxSeed.value}` : ''
    // A COURSE LINK (the community course editor's "Copy link",
    // PodCastPanel): /r/:voiceId?course=<code> is this same booth scoped to
    // that course's lines, and Start lands on its first unread line as it does
    // for the whole queue. Read off the address rather than the router so the
    // booth keeps no router dependency; the language-wide link has no ?course=.
    const courseScope = new URLSearchParams(window.location.search).get('course')
    const courseParam = courseScope ? `&course=${encodeURIComponent(courseScope)}` : ''
    // A POD LINK — /production/:course/pods/:slug's "open Aran" door. The pod
    // half used to be read by nobody: the server answered with the whole
    // course and this page drew all of it, which for Aran was 1221 lines and
    // 1.7MB to reach the 438-line pod he was standing in front of. Sent, so the
    // server can narrow the read as well as the draw.
    const podScope = new URLSearchParams(window.location.search).get('pod')
    const podParam = podScope ? `&pod=${encodeURIComponent(podScope)}` : ''
    // A STEP LINK of a controlled queue (job #247): ?step=seeds is that step's lines only.
    const stepScope = new URLSearchParams(window.location.search).get('step')
    const stepParam = stepScope ? `&step=${encodeURIComponent(stepScope)}` : ''
    // ONE BATCH from the home screen (job #347): only its lines come over the wire.
    const b = batchScope.value
    let batchParam = b ? `&track=${encodeURIComponent(b.track)}&batch=${b.batch}` : ''
    // THE RE-RECORD BATCH (job #788) also carries this device's refused takes, so it reads them first.
    if (b && b.track === RERECORD_TRACK) {
      await queue.attach(props.voiceId)
      const also = alsoIds(queue.refusedTakes.value)
      if (also.length) batchParam += `&also=${encodeURIComponent(also.join(','))}`
    }
    // Time-limited (20s, one retry): a hung request must not strand the reader
    // on "Getting your lines…". The body is read inside the timed window.
    const { res, data: body } = await fetchWithTimeoutRetry(
      withBoothKey(`${apiBase()}/api/recording/voice/${encodeURIComponent(props.voiceId)}?includeRecorded=1${seedParam}${courseParam}${podParam}${stepParam}${batchParam}`, props.voiceId),
      { headers: {} },
      r => (r.ok ? r.json() : r.json().catch(() => ({})))
    )
    if (quiet && (movedOn() || !res.ok)) return
    if (res.status === 404) { phase.value = 'unknown'; return }
    if (res.status === 403) {
      // The link names a course this voice is not cast on: the server's
      // sentence says so (casting-rights.boothArrival), in words, not a code.
      throw new Error(body.error || `This link is for a course you are not cast on (${courseScope}).`)
    }
    if (!res.ok) throw new Error(`Could not load your lines (${res.status})`)
    const data = body
    voice.value = data
    // A QUEUE MAY ASK FOR AUTO-ADVANCE OFF, and one does. Pod and course lines
    // are single sentences, so stopping on a silence is right for them and the
    // default stays on. A recording PACK is paragraphs — the 25-second cloning
    // sample has four sentence pauses in it, and advancing on the first one
    // would file a third of a take and call it done. The reader can still turn
    // it back on with the checkbox; this only decides where it starts.
    if (data.autoAdvance === false) autoAdvance.value = false
    // Read back from the SERVER's answer, never assumed from what we asked for:
    // the ceiling is clamped there, and a screen that reports the number it
    // requested rather than the one it got is the kind of quiet lie this booth
    // has been bitten by before.
    quarry.value = data.quarry || null
    phrases.value = data.phrases || null
    if (data.quarry && data.quarry.maxSeed) maxSeed.value = data.quarry.maxSeed
    // WORK OF HIS THAT HAS NO WORDS YET. Straight off the wire and never
    // derived from `lines`: these are precisely the lines that are NOT in
    // `lines`, and the whole failure this closes is that they were nowhere at
    // all — 168 untranslated Senedd lines, absent from his queue and from
    // every number on his page, which he read as work gone missing and was
    // twice told was not there.
    notReady.value = Array.isArray(data.notReady) ? data.notReady : []
    // LINES HE READ THAT SOMEBODY ELSE NOW OWNS. Also straight off the wire and
    // for the same reason: they are precisely the lines that are NOT in
    // `lines`, because his queue only carries what he is cast for today.
    handedOn.value = Array.isArray(data.handedOn) ? data.handedOn : []
    lines.value = Array.isArray(data.lines) ? data.lines : []
    // ...and never a line whose take is still going up from this device: that is not a miss.
    if (b && b.track === RERECORD_TRACK) lines.value = lines.value.filter(l => !queue.isUnsent(l.id))
    // The re-record batch names its didn't-match lines itself (job #842); the poll keeps them current.
    seedMismatchesFrom(lines.value, readStartedAt)
    lastQueueRead = Date.now()
    if (quiet) return
    // RESUME. Anything left on the device by an earlier session — a tab closed
    // mid-upload, a phone that slept, a chalet with no signal — is picked up
    // here and starts going up before he reads a word.
    // AWAITED: the ready card (and its Submit) must not appear with pendingCount
    // still 0 while the device's IndexedDB queue has not been read yet.
    await queue.attach(props.voiceId)
    doneIds.value = new Set()
    sessionIds.value = []
    touchedIds.value = new Set()
    showHidden.value = false
    lastLine.value = null
    advanceLock.reset()
    // THE CURSOR SURVIVES A RELOAD: the line he was on when he last left this batch.
    pinnedId.value = loadCursor(props.voiceId, cursorScope())
    phase.value = 'ready'
  } catch (err) {
    if (quiet) return
    loadSlow.value = err instanceof LoadTimeoutError
    loadError.value = (err && err.message) || 'Network error'
    phase.value = 'error'
  }
}

// ── THE HOME SCREEN (Aran, 2026-10-14, job #347) ────────────────────────────
//
// The page used to open by fetching his whole queue — 2060 lines, 2.2MB — and
// drawing every one, then put Start on the first unread line in queue order (a
// Health test line). It now opens on a home screen drawn from a SUMMARY
// (/summary: cards, batches, counts) and fetches one batch's lines when he opens
// it, so Start lands in the batch he chose. The address carries where he is —
// ?track=<card> lists a card's batches, &batch=<n> opens one — so Back works.
//
// A course or pod link (?course= / ?pod=) is a door from another page and keeps
// the one-screen booth it always opened. So do a recording pack and a script
// still behind its setup check, and anything that cannot get a summary at all:
// the home screen is an addition, never a new way for the booth to fail.
const homeSummary = ref(null)
const unticked = ref(loadUnticked(props.voiceId))
function setTick(id, on) {
  const next = new Set(unticked.value)
  if (on) next.delete(id); else next.add(id)
  unticked.value = next
  saveUnticked(props.voiceId, next)
}
const queryStr = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null)
const isDoorLink = () => !!(queryStr(addressQuery.value.course) || queryStr(addressQuery.value.pod) || queryStr(addressQuery.value.step))
const batchScope = computed(() => {
  const track = queryStr(addressQuery.value.track)
  const batch = parseInt(addressQuery.value.batch, 10)
  if (isDoorLink() || !track || !Number.isFinite(batch) || batch < 1) return null
  return { track, batch }
})
const homeTrackKey = computed(() => (batchScope.value ? null : queryStr(addressQuery.value.track)))

// A reader of a course's KNOWN side (Aran's English booth reads the English of the Welsh
// courses) is told so on every card and header (job #378): "English for New Welsh — North".
function courseWordsFor(courseCode) {
  const words = boothCourseWords(courseCode, 'Course')
  const h = homeSummary.value
  const lang = h && h.language
  if (!lang || !courseCode || courseCode.startsWith(`${lang}_`) || !courseCode.endsWith(`_for_${lang}`)) return words
  return `${h.languageName || lang} for ${words}`
}
function describeTrack(t) {
  if (t.kind === 'seed') {
    const isNew = !!(t.newCourse || t.seedExisting === false)
    const old = SECTION_ORDER.find(x => x.key === 'seedexisting')
    return {
      short: isNew ? 'New sentences' : 'Sentences', cls: 'k-sent',
      title: `${courseWordsFor(t.courseCode)}: whole sentences`,
      what: isNew ? 'Read each new course sentence once, at your natural pace.' : old.blurb,
    }
  }
  // THE ENGLISH OF THE NEW LEGOs (job #255): read once each; his LEGO intros are spliced from these takes.
  if (t.kind === 'lego' && t.role === 'known') {
    return {
      short: 'English LEGOs', cls: 'k-lego',
      title: `${courseWordsFor(t.courseCode)}: English LEGOs`,
      what: 'The English of each new LEGO, read once each at your natural pace. Your LEGO intros are put together from these.',
    }
  }
  // POD 1 ENGLISH (Aran, 2026-10-29, job #537): the English of every Pod 1 line, one take serving North and South.
  // POD 1 NEW WORDS (Aran, 2026-10-29, job #551): read first; each take changes the pod's words and recording together.
  if (t.kind === 'podswap') {
    return {
      short: 'Pod 1 new words', cls: 'k-sent',
      title: 'Pod 1 — new words, North and South',
      what: 'Pod 1 lines whose words are changing. The pod keeps its old words and recording until you record these; then both change together, North and South.',
    }
  }
  if (t.kind === 'podknown') {
    return {
      short: 'Pod 1 English', cls: 'k-sent',
      title: 'Pod 1 English — North and South',
      what: 'The English of every Pod 1 line, read once each at your natural pace. One take serves both North and South.',
    }
  }
  if (t.kind === 'lego') {
    return {
      short: 'LEGOs', cls: 'k-lego',
      title: `${courseWordsFor(t.courseCode)}: LEGOs`,
      what: 'The pieces each new sentence is built from, one at a time. Read each once, at your natural pace.',
    }
  }
  if (t.kind === 'phrase') {
    const fp = (homeSummary.value && homeSummary.value.phrases && homeSummary.value.phrases.firstPass) || { build: 4, use: 3 }
    return {
      short: `Phrases · pass ${t.pass}`, cls: t.pass === 1 ? 'k-p1' : 'k-p2',
      title: `${courseWordsFor(t.courseCode)}: practice phrases, pass ${t.pass}`,
      what: t.pass === 1
        ? `The phrases the app plays first: up to ${fp.build} build and ${fp.use} use phrases for each new LEGO.`
        : 'The rest of the practice phrases. Opens when pass 1 is finished.',
    }
  }
  if (t.podSlug) {
    const sec = podSectionFor({ courseCode: t.courseCode, podSlug: t.podSlug, podTitle: t.podTitle })
    return { short: 'Script', cls: 'k-other', title: sec.heading, what: sec.blurb }
  }
  const named = SECTION_ORDER.find(x => x.key === t.kind)
  return { short: 'Lines', cls: 'k-other', title: named ? named.heading : 'Everything else', what: named ? named.blurb : '' }
}
// WHAT THIS DEVICE HAS RECORDED OF A BATCH, ahead of the server's count (Aran, 2026-10-15): takes
// still uploading are not in the summary, so Up next kept offering the batch he had just finished.
// Only ever raises a count, and only for the batch the device has open.
// BY LINE ID, AND ONLY ONCE THE LINES ON SCREEN ARE THAT BATCH'S (Aran, 15 Oct, job #818: LEGO
// batches he never read showed fully recorded). The address moves before the new batch's lines
// arrive, and this used to credit the batch just left — 100 saved sentences — to the batch just
// opened, for the rest of the session. creditLoadedBatch refuses unless the server's answer on
// screen names the batch the address names.
const localBatchRecorded = ref({})
watch([recordedCount, lines, batchScope, () => voice.value && voice.value.track, () => voice.value && voice.value.batch], () => {
  localBatchRecorded.value = creditLoadedBatch(localBatchRecorded.value, {
    scope: batchScope.value, served: voice.value, lines: lines.value, isRecorded, isRefused: l => queue.failed.has(l.id) && !isRecorded(l),
  })
})
// What this device knows beyond the server is UPLOADING (amber), never recorded (green, job #791).
function withLocalRecorded(t) {
  let extra = 0
  const batches = (t.batches || []).map(b => {
    const mine = Math.min((localBatchRecorded.value[`${t.key}#${b.n}`] || []).length, b.total || 0)
    const known = (b.recorded || 0) + (b.uploading || 0)
    if (mine <= known) return b
    extra += mine - known
    return { ...b, uploading: (b.uploading || 0) + mine - known }
  })
  return extra ? { ...t, batches, uploading: (t.uploading || 0) + extra } : t
}
// WHERE THE DEVICE'S UNSENT TAKES SIT (job #791). Every batch this device opens files its lines'
// places here, so the home screen can count a take still on the shelf against its batch; a take
// from before this was kept (or from another tab) is placed by reading the whole queue once.
const places = ref(loadPlaces(props.voiceId))
watch(() => props.voiceId, (id) => { places.value = loadPlaces(id) })
watch([lines, () => voice.value && voice.value.track, () => voice.value && voice.value.batch], () => {
  const b = batchScope.value
  const v = voice.value
  if (!b || !v || v.track !== b.track || v.batch !== b.batch || !lines.value.length) return
  const entries = {}
  for (const l of lines.value) entries[l.id] = [b.track, b.batch, !!l.recorded]
  places.value = savePlaces(props.voiceId, entries, { keep: queue.unsentLines })
})
const unsentIds = computed(() => [...(queue.unsentLines || [])])
const locatorPlaces = computed(() => (locatorLines.value ? placeLines(locatorLines.value, (homeSummary.value && homeSummary.value.tracks) || []) : null))
function placeOfLine(id) {
  const kept = placeFromEntry(places.value[id])
  if (kept) return kept
  const at = locatorPlaces.value && locatorPlaces.value.get(id)
  if (!at) return null
  const line = locatorLines.value.find(l => l.id === id)
  return { ...at, recorded: !!(line && line.recorded) }
}
const unplacedUnsent = computed(() => unsentIds.value.filter(id => !placeOfLine(id)).length)
const homeTracks = computed(() => withDeviceTakes((homeSummary.value && homeSummary.value.tracks) || [], { unsent: unsentIds.value, placeOf: placeOfLine })
  .map(t => ({ ...withLocalRecorded(t), ...describeTrack(t) })))
let locating = false
async function locateRefused() {
  if (locating || locatorLines.value) return
  locating = true
  try {
    const { res, data } = await fetchWithTimeoutRetry(
      withBoothKey(`${apiBase()}/api/recording/voice/${encodeURIComponent(props.voiceId)}?includeRecorded=1`, props.voiceId),
      { headers: {} },
      r => (r.ok ? r.json() : r.json().catch(() => ({})))
    )
    if (res.ok && data && Array.isArray(data.lines)) {
      locatorLines.value = data.lines
      // Keep the places of the takes still on the shelf, so the next visit need not read it all again.
      const entries = {}
      for (const id of unsentIds.value) {
        const p = placeOfLine(id)
        if (p) entries[id] = [p.track, p.batch, p.recorded]
      }
      if (Object.keys(entries).length) places.value = savePlaces(props.voiceId, entries, { keep: queue.unsentLines })
      await queue.reconcile()
    }
  } catch { /* the rows stay "finding the line"; Dismiss still works */ } finally { locating = false }
}
watch([phase, () => (queue.refusedTakes ? queue.refusedTakes.value.length : 0), unplacedUnsent], () => {
  if (phase.value === 'home' && ((queue.refusedTakes && queue.refusedTakes.value.length) || unplacedUnsent.value)) locateRefused()
}, { immediate: true })
// ── THE RE-RECORD CARD (Aran, 2026-10-15, job #788) ──────────────────────────
// The server's skips and text changes (/rerecord), with this device's refused takes merged in
// and anything still uploading or saved since taken off (recordist/rerecord-list.js).
const rerecordServer = ref({ items: [], recordedAlso: [], goneAlso: [] })
// Refused takes whose line the full queue no longer holds: old, not misses.
const goneRefusedIds = computed(() => goneRefusedLineIds({
  // The batch's own server answer first (it is what the batch will open), the full queue second.
  serverGone: rerecordServer.value.goneAlso,
  refusedTakes: (queue.refusedTakes && queue.refusedTakes.value) || [],
  queueLines: locatorLines.value,
  batchLines: lines.value,
  placed: places.value,
}))
const oldRefusedList = computed(() => oldRefusedIds({
  serverItems: rerecordServer.value.items,
  recordedAlso: rerecordServer.value.recordedAlso,
  refusedTakes: (queue.refusedTakes && queue.refusedTakes.value) || [],
  saved: queue.saved,
  goneIds: goneRefusedIds.value,
}))
// Only the refused COPIES on this device go, after a confirm; a take still uploading is never touched.
async function clearOldRefused(ids) {
  const n = (ids || []).length
  if (!n) return
  if (!window.confirm(`Clear ${n} old ${n === 1 ? 'copy' : 'copies'}?\n\nThese takes were refused and their lines are already recorded or no longer yours. Only these copies on this device are removed.`)) return
  for (const id of ids) await queue.discardRefused(id)
}
let refusedPlayer = null
async function playRefused(lineId) {
  const blob = await queue.refusedBlob(lineId)
  if (!blob) return
  if (refusedPlayer) { refusedPlayer.pause(); URL.revokeObjectURL(refusedPlayer.src) }
  refusedPlayer = new Audio(URL.createObjectURL(blob))
  refusedPlayer.play().catch(() => {})
}
const rerecordRows = computed(() => mergeRerecord({
  goneIds: goneRefusedIds.value,
  serverItems: rerecordServer.value.items,
  recordedAlso: rerecordServer.value.recordedAlso,
  refusedTakes: (queue.refusedTakes && queue.refusedTakes.value) || [],
  unsent: queue.unsentLines,
  saved: queue.saved,
  retaken: [...retakenAt.value.keys()].filter(id => retakenAt.value.get(id) >= rerecordReadAt.value),
}))
let rerecordFor = null
async function refreshRerecord() {
  const voiceId = props.voiceId
  const sentAt = Date.now()
  const also = alsoIds(queue.refusedTakes && queue.refusedTakes.value)
  try {
    const { res, data } = await fetchWithTimeoutRetry(
      withBoothKey(`${apiBase()}/api/recording/voice/${encodeURIComponent(voiceId)}/rerecord${also.length ? `?also=${encodeURIComponent(also.join(','))}` : ''}`, voiceId),
      { headers: {} },
      r => (r.ok ? r.json() : r.json().catch(() => ({})))
    )
    if (voiceId !== props.voiceId) return
    if (res.ok && data && Array.isArray(data.items)) {
      rerecordFor = voiceId
      rerecordReadAt.value = sentAt
      rerecordServer.value = { items: data.items, recordedAlso: Array.isArray(data.recordedAlso) ? data.recordedAlso : [], goneAlso: Array.isArray(data.goneAlso) ? data.goneAlso : [] }
      if (data.fresh === false) setTimeout(() => { if (phase.value === 'home') refreshRerecord() }, 4000)
    }
  } catch { /* the card waits for the next visit home; nothing else depends on it */ }
}
watch([phase, () => props.voiceId], () => {
  if (rerecordFor !== props.voiceId) rerecordServer.value = { items: [], recordedAlso: [], goneAlso: [] }
  if (phase.value === 'home') refreshRerecord()
}, { immediate: true })
function openRerecord() { goToAddress({ track: RERECORD_TRACK, batch: '1' }) }

// ── THE SCRIPT-CHECK POLL (job #842) ─────────────────────────────────────────
function seedMismatchesFrom(wireLines, sentAt) {
  const items = (wireLines || []).filter(l => l && l.rerecordWhy === 'didnt_match')
    .map(l => ({ lineId: l.id, takeId: l.rerecordTakeId || null, heard: l.rerecordHeard || null }))
  if (!items.length) return
  const merged = applyFailures(items, sentAt, retakenAt.value, new Map())
  if (!merged.size) return
  const m = new Map(textCheckFails.value)
  for (const [id, v] of merged) m.set(id, v)
  textCheckFails.value = m
}
let textCheckTimer = null
let textCheckIds = ''
async function pollTextChecks() {
  const voiceId = props.voiceId
  if (!voiceId || (phase.value !== 'recording' && phase.value !== 'home')) return
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
  const sentAt = Date.now()
  try {
    const res = await fetch(withBoothKey(`${apiBase()}/api/recording/voice/${encodeURIComponent(voiceId)}/text-check-failures`, voiceId))
    if (!res.ok || voiceId !== props.voiceId) return
    const data = await res.json()
    if (!data || !Array.isArray(data.items)) return
    textCheckFails.value = applyFailures(data.items, sentAt, retakenAt.value, textCheckFails.value)
    // At home the card is built from /rerecord, which carries these too: read it again when they change.
    const ids = data.items.map(i => i.takeId).sort().join(',')
    if (ids !== textCheckIds) { textCheckIds = ids; if (phase.value === 'home') refreshRerecord() }
  } catch { /* the next poll tries again; nothing else waits on this */ }
}
const TEXT_CHECK_POLL_MS = 20000
onMounted(() => { textCheckTimer = setInterval(pollTextChecks, TEXT_CHECK_POLL_MS); pollTextChecks() })
// ...and at once whenever he arrives on a batch or back home, not up to 20 s later.
watch(phase, (p) => { if (p === 'recording' || p === 'home') pollTextChecks() })
onBeforeUnmount(() => clearInterval(textCheckTimer))
watch(() => props.voiceId, () => { textCheckFails.value = new Map(); retakenAt.value = new Map(); textCheckIds = ''; pollTextChecks() })

// The card's ▶ on a didn't-match row: the take is on the server, so play what the server holds.
let storedPlayer = null
function playStoredTake(lineId) {
  if (storedPlayer) storedPlayer.pause()
  storedPlayer = new Audio(withBoothKey(`${apiBase()}/api/recording/voice/${encodeURIComponent(props.voiceId)}/line/${encodeURIComponent(lineId)}/clip`, props.voiceId))
  storedPlayer.play().catch(() => {})
}
// "It's fine — keep it": the check misheard. The take stays as it is and leaves the list.
async function keepMismatch(row) {
  if (!row || !row.takeId) return
  try {
    const res = await fetch(withBoothKey(`${apiBase()}/api/recording/voice/${encodeURIComponent(props.voiceId)}/text-check-failures/${encodeURIComponent(row.takeId)}/keep`, props.voiceId), { method: 'POST' })
    if (!res.ok) return
    const m = new Map(textCheckFails.value); m.delete(row.lineId); textCheckFails.value = m
    refreshRerecord()
  } catch { /* nothing changed; he can tap again */ }
}

const homeMainHeading = computed(() => {
  const codes = new Set(homeTracks.value.filter(t => t.kind === 'phrase' || t.newCourse).map(t => t.courseCode))
  return codes.size === 1 ? boothCourseWords([...codes][0], 'New work') : 'New work'
})
const homeNotes = computed(() => {
  const h = homeSummary.value
  if (!h) return []
  const out = []
  for (const n of (h.notReady || [])) {
    if (!(Number(n.lines) > 0)) continue
    const where = podSectionFor({ courseCode: n.courseCode, podSlug: n.podSlug, podTitle: n.podTitle }).heading
    out.push(`${n.lines} more ${n.lines === 1 ? 'line' : 'lines'} of ${where} ${n.lines === 1 ? 'is' : 'are'} still being written — nothing of yours has gone missing.`)
  }
  for (const n of (h.handedOn || [])) {
    if (!(Number(n.lines) > 0)) continue
    const where = podSectionFor({ courseCode: n.courseCode, podSlug: n.podSlug, podTitle: n.podTitle }).heading
    out.push(`You recorded ${n.lines} more ${n.lines === 1 ? 'line' : 'lines'} of ${where} that ${n.lines === 1 ? 'has' : 'have'} since been given to ${n.castTo || 'somebody else'}. Your takes are still there.`)
  }
  return out
})
const scopedTrack = computed(() => batchScope.value && homeTracks.value.find(t => t.key === batchScope.value.track))
// THE PERSISTENT HEADER inside a batch (job #378): which course, which section, which batch,
// how many left — "New Welsh — North · New sentences · batch 3 of 7 · 41 left". The count is the
// lines on screen still to read, so it moves as he reads.
const batchHeader = computed(() => {
  const t = scopedTrack.value
  const left = `${remainingToRead.value.toLocaleString('en-GB')} left`
  if (batchScope.value && batchScope.value.track === RERECORD_TRACK) return `Re-record · ${left}`
  if (!t) return phase.value === 'loading' ? 'Opening your batch…' : left
  const b = t.batches.find(x => x.n === batchScope.value.batch)
  // Pod 1 English spans North and South, so no one course's words head it (job #537).
  const parts = [t.kind === 'podknown' || t.kind === 'podswap' ? null : courseWordsFor(t.courseCode), t.short]
  // WHICH LANGUAGE, in so many words (job #392): with Welsh and English one tab apart, the header
  // says it, unless the course words already begin with it ("English for New Welsh — North").
  const h = homeSummary.value
  const tongue = h ? headerLanguage(parts[0], h.language, h.languageName) : ''
  if (tongue) parts.unshift(tongue)
  if (t.kind === 'phrase') parts.push(b ? `${b.courseLabel ? `${b.courseLabel} ` : ''}batch ${b.batch} of ${t.batches.length}` : null)
  else if (t.batches.length > 1) parts.push(`batch ${batchScope.value.batch} of ${t.batches.length}`)
  else if (t.kind !== 'seed' && t.kind !== 'lego') parts[parts.length - 1] = t.title.replace(`${courseWordsFor(t.courseCode)}: `, '') // a script names itself
  parts.push(left)
  return parts.filter(Boolean).join(' · ')
})
// After a batch: the next batch with lines left, in Up next's order — the same section's next
// batch (practice phrases included), else the next section's (booth-home.js nextBatchAfter,
// Aran 2026-10-16, job #203). Opening it leaves the upload queue running: takes live in the
// device's take store, not in this screen.
const nextBatch = computed(() => nextBatchAfter(homeTracks.value, batchScope.value, unticked.value))
// Said only once the home counts are in and name this batch's section: a summary still loading is not "nothing left".
const nothingLeftAnywhere = computed(() => !!scopedTrack.value && !nextBatch.value)
const showPhraseCard = computed(() => !!(phrases.value && (phrases.value.pass || phrases.value.finished)) &&
  (!batchScope.value || batchScope.value.track.startsWith('phrase.')))

// AFTER A POD (Kai, 2026-10-16, job #189): a pod link whose pod has nothing left of his to read
// offers the next pod where he still has lines, so nobody has to send him a new link. Which pod is
// the server's call (services/voice-engine/booth-next-pod.cjs); no answer keeps the old button.
// A STEP LINK (?step=, job #247) is a pod link's twin for a controlled queue's non-pod step
// ('Seed sentences (206)'): the same button carries on from either, in the order the server keeps.
const podFinished = computed(() => !!(queryStr(addressQuery.value.pod) || queryStr(addressQuery.value.step)) && !!voice.value.podsDone && startIndex.value === -1)
// AT THE END OF A STEP'S READING FLOW (Eleri, 2026-10-23): the done screen offers the next step
// even when lines she skipped are still owed in this one, so a practice-phrase step whose served
// batch holds only her skips still leads on to the rest of the plan. The batch page keeps the
// pod rule above: lines owed → Start, no Next.
const stepLink = computed(() => !!(queryStr(addressQuery.value.pod) || queryStr(addressQuery.value.step)))
const nextPod = computed(() => ((podFinished.value || (phase.value === 'done' && stepLink.value)) && voice.value.podsDone && voice.value.podsDone.nextPod) || null)
// A controlled queue names its own steps (`label`); any other pod keeps its section heading.
const nextPodName = computed(() => (nextPod.value ? (nextPod.value.label || podSectionFor(nextPod.value).heading) : ''))
const nextPodWords = computed(() => (nextPod.value && nextPod.value.podSlug ? `Next pod: ${nextPodName.value} →` : `Next: ${nextPodName.value} →`))
const allPodsDoneWords = computed(() => (voice.value.podsDone && voice.value.podsDone.remainingOutsidePods
  ? 'All your pods are done — thank you'
  : 'All done — thank you'))
function openNextPod() {
  const p = nextPod.value
  if (!p) return
  const { track, batch, pod, step, ...rest } = addressQuery.value
  // A phrase step's next batch of the plan is opened by its home-screen address (track/batch).
  if (p.track && p.batch) {
    const { course, ...keep } = rest
    return goToAddress({ ...keep, track: p.track, batch: String(p.batch) })
  }
  goToAddress(p.podSlug ? { ...rest, course: p.courseCode, pod: p.podSlug } : { ...rest, course: p.courseCode, step: p.step })
}
function openBatch(track, n) { goToAddress({ track, batch: String(n) }) }
function openNextBatch() { const nb = nextBatch.value; if (nb) openBatch(nb.track.key, nb.batch.n) }
function goHome() { goToAddress({}) }
function openCard(key) {
  const t = homeTracks.value.find(x => x.key === key)
  if (!t) return
  // A script is one batch: straight in. Sentences and phrases list their batches.
  if (t.kind !== 'phrase' && t.batches.length === 1) return openBatch(key, 1)
  goToAddress({ track: key })
}

async function fetchSummary() {
  const { res, data } = await fetchWithTimeoutRetry(
    withBoothKey(`${apiBase()}/api/recording/voice/${encodeURIComponent(props.voiceId)}/summary`, props.voiceId),
    { headers: {} },
    r => (r.ok ? r.json() : r.json().catch(() => ({})))
  )
  // A PARTIAL ANSWER NEVER DROPS A SECTION (job #823): a kind the server could not count this
  // time keeps its sections from the screen already drawn, or this device's kept one, as "counting…".
  const prev = (homeFor === props.voiceId && homeSummary.value) || loadSummarySnapshot(props.voiceId)
  const ok = res.ok && data && data.home && !data.setupLocked ? keepListedSections(data, prev) : null
  // Kept on this device so the next arrival draws at once (job #378). A summary that
  // cannot be a home screen clears it, so the snapshot never outlives its reason.
  if (ok) saveSummarySnapshot(props.voiceId, ok)
  else if (res.status !== 0 && res.status < 500) saveSummarySnapshot(props.voiceId, null)
  return ok
}

// THE HOME SCREEN AT ONCE, then the truth (Aran, 2026-10-14, job #378: "still takes a LONG
// time to load even if I just go to another tab and then come back"). A phone coming back to
// the tab often reloads it — the app reloads when a new build has landed, and a phone throws
// background tabs away — and every reload waited on a whole-queue summary (1-5 s on the
// server, plus a public hop that adds 1-8 s of its own). Now: whatever home screen this page
// or this device last had is drawn straight away, and the server's answer replaces it when it
// lands. A summary the server marks `fresh: false` (served from its cache while it rebuilds)
// is asked for once more a few seconds later, so the counts settle without a reload.
let homeFor = null
let refreshTimer = null
function applySummary(data) {
  homeSummary.value = data
  homeFor = props.voiceId
  voice.value = { ...voice.value, displayName: data.displayName, languageName: data.languageName }
}
// A FAILED READ IS ASKED AGAIN (Aran, 2026-10-15, job #829: "What I'm doing" on his Chromebook
// still lacked New Welsh — North: whole sentences after #823). The kept home is drawn first, and
// if the read behind it failed — a timeout while the API restarts after a deploy, a dropped
// connection — that kept home used to stay on screen until he left the tab and came back. Now it
// is asked again, backing off, for as long as the home screen is up, and the fresh answer
// replaces the kept one the moment it lands.
const HOME_RETRY_MS = [5000, 15000, 30000, 60000]
let homeRetries = 0
async function refreshHome(again = true) {
  let data = null
  try { data = await fetchSummary() } catch { data = null }
  clearTimeout(refreshTimer)
  if (!data) {
    if (homeSummary.value && phase.value === 'home') {
      const wait = HOME_RETRY_MS[Math.min(homeRetries++, HOME_RETRY_MS.length - 1)]
      refreshTimer = setTimeout(() => { if (phase.value === 'home') refreshHome() }, wait)
    }
    return false
  }
  homeRetries = 0
  if (homeFor === props.voiceId || !homeSummary.value) applySummary(data)
  if (again && data.fresh === false) refreshTimer = setTimeout(() => { if (phase.value === 'home') refreshHome(false) }, 4000)
  return true
}
async function loadHome() {
  // Moving between the home screen and a card's batch list needs no new read.
  if (phase.value === 'home' && homeSummary.value && homeFor === props.voiceId) return
  if (homeFor !== props.voiceId) homeSummary.value = null
  const shown = homeSummary.value || loadSummarySnapshot(props.voiceId)
  if (shown) {
    applySummary(shown)
    phase.value = 'home'
    // Takes left on this device by an earlier session start going up from here too.
    Promise.resolve(queue.attach(props.voiceId)).catch(() => {})
    refreshHome().then((ok) => {
      // The server says this voice no longer has a home screen (a pack, a locked setup
      // check): the snapshot was cleared, so leave it for the one-screen booth.
      if (!ok && phase.value === 'home' && !loadSummarySnapshot(props.voiceId)) { homeSummary.value = null; load() }
    })
    return
  }
  phase.value = 'loading'
  if (!(await refreshHome())) { homeSummary.value = null; return load() }
  await queue.attach(props.voiceId)
  phase.value = 'home'
}

// Where the address says he is. A recording in progress is finished first (its
// take kept), so Back on a phone mid-line never drops a take.
let entering = 0
async function enter() {
  const mine = ++entering
  if (phase.value === 'recording') {
    try { await onFinish() } catch { /* the stream is gone; carry on */ }
  }
  if (mine !== entering) return
  stopPlayback()
  if (isDoorLink()) return load()
  if (batchScope.value) {
    // The batch's own name comes from the summary; fetched alongside, never waited on.
    if (!homeSummary.value) {
      const kept = loadSummarySnapshot(props.voiceId)
      if (kept) applySummary(kept)
      fetchSummary().then(d => { if (d) applySummary(d) }).catch(() => {})
    }
    await load()
    // A DEEP LINK TO ONE LINE (?line=<id>, from a refused take on the home page): open that line.
    const want = queryStr(addressQuery.value.line)
    if (want && mine === entering && phase.value === 'ready') {
      const i = lines.value.findIndex(l => l.id === want)
      if (i !== -1) { index.value = i; await recordOne(want) }
    }
    return
  }
  return loadHome()
}

// ── The booth remembers how you left it ─────────────────────────────────────
//
// TWO STEPS, because the microphone is not known until the browser says so.
// First, at setup, restore this artist's last session outright: one person, one
// machine, one mic is the ordinary case and it should feel like nothing was
// forgotten. Then, once the devices resolve, if the mic in use has settings of
// its OWN they win — a capture profile is a fact about a microphone, and that
// is the whole reason this is keyed per device (recordist/booth-settings.js).
//
// A mic this artist has never used here inherits nothing and starts from
// `recommendedProfile`, and the "not the usual setting on this device" warning
// above the toggle draws itself whenever a restored profile disagrees with it —
// so a remembered choice can never be a silent one.
let settingsMicKey = null
function applyBoothSettings(saved) {
  if (!saved) return
  // Older rooms stored 'voice' (the old default) or 'dry' (someone who ticked
  // raw for a studio mic); they land on the setup they were closest to.
  if (saved.captureProfile === 'phone' || saved.captureProfile === 'pro') captureProfile.value = saved.captureProfile
  else if (saved.captureProfile === 'dry') captureProfile.value = 'pro'
  if (typeof saved.autoAdvance === 'boolean') autoAdvance.value = saved.autoAdvance
  // The old re-read switch (`saved.includeRecorded`) is deliberately NOT read
  // back: a remembered tick of it is exactly what put Tom's Start button on a
  // recorded line, and there is no longer anything for it to mean.
  if (typeof saved.showRecorded === 'boolean') showRecorded.value = saved.showRecorded
  if (saved.maxSeed) maxSeed.value = saved.maxSeed
}
// Synchronous, and BEFORE the load watch below fires: the seed ceiling is part
// of the request, so restoring it afterwards would cost a second round trip and
// show him the wrong volume in between.
applyBoothSettings(loadBoothSettings(props.voiceId))

function rememberBoothSettings() {
  saveBoothSettings(props.voiceId, settingsMicKey, {
    captureProfile: captureProfile.value,
    autoAdvance: autoAdvance.value,
    showRecorded: showRecorded.value,
    maxSeed: maxSeed.value,
  })
}
// Saved on every change rather than on leave: the booth is closed by shutting a
// laptop lid at least as often as by navigating away.
watch([captureProfile, autoAdvance, showRecorded, maxSeed], rememberBoothSettings)

// WHICH MIC, once the browser will say. Labels only exist after permission, so
// this runs again when the list refreshes rather than only once.
watch([() => recorder.devices.value, selectedDeviceId], () => {
  const list = recorder.devices.value || []
  if (!list.length) return
  const chosen = (selectedDeviceId.value ? list.find(d => d.deviceId === selectedDeviceId.value) : null) || list[0]
  const key = micKeyFor(chosen)
  if (key === settingsMicKey) return
  settingsMicKey = key
  // Only a record belonging to THIS mic overrides what is already on screen.
  // Anything else would re-apply the last session's settings over a choice he
  // has just made with his own hands.
  const own = loadBoothSettings(props.voiceId, key)
  if (own && own.source === 'device') applyBoothSettings(own)
  rememberBoothSettings()
}, { deep: true })

// ── EDIT THIS LINE (Aran, 2026-10-15, job #709) ─────────────────────────────────────────────
// The control is drawn only when the SERVER says this session is a God admin (canEditLines); the
// server refuses anyone else on every read and write. Everything the edit means — the course gate,
// the tiling check, which takes go back on the queue — is decided server-side
// (booth-line-edit-router.cjs); the booth only mirrors the answer onto the line on screen.
const lineEditor = ref(false)
const lineEditorFor = ref(null)
// The line as it stood before an edit, so Undo puts the screen back exactly as the door puts the row.
let lineBeforeEdit = null
function openLineEditor(lineOrId) {
  const l = typeof lineOrId === 'string' ? lines.value.find(x => x.id === lineOrId) : lineOrId
  if (!l || phase.value === 'recording') return
  lineEditorFor.value = l
}
function onLineEdited({ lineId, targetText, knownText, recordings }) {
  const l = lines.value.find(x => x.id === lineId)
  if (!l) return
  lineBeforeEdit = { ...l }
  // A known-side line reads the English; every other line reads the Welsh, with the other side as its crib.
  if (l.role === 'known') { l.text = knownText; l.knownText = targetText || null }
  else { l.text = targetText; l.knownText = knownText || null }
  // THIS VOICE'S TAKE: back on the list only when the door unlinked it (the words changed).
  const mine = (recordings || []).find(r => r.slot === l.role)
  if (mine && mine.fate === 'requeued') {
    l.recorded = false
    l.clipUrl = null
    doneIds.value.delete(lineId)
    doneIds.value = new Set(doneIds.value)
  }
  lines.value = [...lines.value]
}
function onLineEditUndone({ lineId }) {
  const i = lines.value.findIndex(x => x.id === lineId)
  if (i < 0 || !lineBeforeEdit || lineBeforeEdit.id !== lineId) return
  Object.assign(lines.value[i], lineBeforeEdit)
  if (lineBeforeEdit.recorded) doneIds.value = new Set([...doneIds.value, lineId])
  lineBeforeEdit = null
  lines.value = [...lines.value]
}

// NEW WORK WITHOUT A RELOAD (job #804): coming back to the tab, or the window regaining focus,
// reads the queue again — see recordist/queue-refresh.js for when it never does.
let boothActive = true
function refreshOnReturn() {
  if (!shouldRefreshQueue({
    visible: document.visibilityState !== 'hidden',
    active: boothActive,
    phase: phase.value,
    busy: busy.value,
    arming: arming.value,
    editing: !!editingId.value,
    pending: queue.pendingCount.value,
    lastAt: lastQueueRead,
  })) return
  lastQueueRead = Date.now()
  if (phase.value === 'home') { refreshHome(); refreshRerecord() } else load({ quiet: true })
}
onMounted(() => {
  canEditLines().then((ok) => { lineEditor.value = !!ok })
  document.addEventListener('visibilitychange', refreshOnReturn)
  window.addEventListener('focus', refreshOnReturn)
  window.addEventListener('keydown', onKey)
  window.addEventListener('beforeunload', beforeUnloadGuard)
  recorder.listDevices()
  // So the course pages the nav points at can draw "← Back to the booth".
  rememberBooth(props.voiceId)
})
onBeforeUnmount(() => {
  clearTimeout(refreshTimer)
  document.removeEventListener('visibilitychange', refreshOnReturn)
  window.removeEventListener('focus', refreshOnReturn)
  stopWave()
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('beforeunload', beforeUnloadGuard)
  stopPlayback()
  if (recorder.isRecording.value) recorder.stop()
  queue.teardown()
  forgetLocalTakes()
})

// ONE OF SEVERAL TABS (job #392). Under RecordistBooth this booth is kept alive while another
// voice's tab is showing, and the address then belongs to that voice: a booth only follows the
// address while the address names it, and coming back to the same place it left is not a move.
let enteredAt = null
watch(() => [props.voiceId, addressQuery.value.track, addressQuery.value.batch, addressQuery.value.course, addressQuery.value.pod, addressQuery.value.step], (at) => {
  const named = route && route.params && route.params.voiceId
  if (named && named !== props.voiceId) return
  const key = JSON.stringify(at)
  if (key === enteredAt) return
  enteredAt = key
  enter()
}, { immediate: true })
onActivated(() => {
  boothActive = true
  window.addEventListener('keydown', onKey)
  rememberBooth(props.voiceId)
})
onDeactivated(() => {
  boothActive = false
  window.removeEventListener('keydown', onKey)
  stopPlayback()
})
</script>

<style scoped>
/* Phone first: Aran and Catrin record on phones. Everything thumb-reachable,
   the line itself the biggest thing on the screen. */
.recordist {
  max-width: 640px;
  margin: 0 auto;
  padding: 1rem;
  min-height: 100vh;
  min-height: 100dvh; /* a phone's visible height, not the height behind its toolbars (job #834) */
  color: var(--color-paper, #f7f7f2);
  background: var(--color-void, #0f172a);
}
.rc-card {
  background: var(--color-shadow, #1e293b);
  border: 1px solid var(--color-graphite, #475569);
  border-radius: 16px;
  padding: 1.75rem 1.35rem;
  margin-top: 1.5rem;
}
.rc-card.center { text-align: center; }

/* The safety banner. Above everything, in every phase, and it takes no room
   at all when there is nothing to say — a badge that is always on screen stops
   being read within a session. Colour carries the same three-way distinction
   as the words, never instead of them. */
.safety-banner {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  border-radius: 12px;
  padding: 0.7rem 0.9rem;
  margin-top: 0.75rem;
  font-size: 0.85rem;
  line-height: 1.45;
  border: 1px solid transparent;
}
/* FIXED HEIGHT IN EVERY STATE (job #340): uploading N / all uploaded / at risk / refused all occupy
   the same box, so the page below never moves when the words change. Detail is clamped, never grown. */
.safety-banner { height: 5rem; box-sizing: border-box; overflow: hidden; justify-content: center; }
.safety-banner span { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.safety-banner.done { background: #10301f; border-color: #2f9e62; color: #d6f5e3; }
.safety-banner strong { font-size: 0.92rem; font-weight: 600; }
/* No opacity on the detail line. "Nothing is lost if you close this page" is
   the sentence that decides whether an artist closes the tab on a session's
   work, so it is not decoration to be dimmed — `strong` already carries the
   hierarchy. */
.safety-banner span { color: inherit; }
/* OPAQUE BACKGROUNDS, ONE PAIR PER THEME. These were translucent tints that
   relied on the dark canvas showing through: in light mode `.recordist` is
   white (see the light block at the bottom of this file), so the "113 takes
   still to upload" banner resolved to #cfe0ff text on a #e5eeff wash — 1.15:1,
   which is what Aran saw on 2026-09-18 and described as lilac on lilac, only
   readable by selecting it. An opaque background cannot be undone by whatever
   the banner happens to be sitting on, so the contrast below is the contrast
   that ships. Every pair here clears WCAG AA (all are above 8:1); the test
   RecordistRoom.bannerContrast.test.js recomputes them and fails if one drops. */
.safety-banner.waiting { background: #15243f; border-color: #3b6fb5; color: #dbe9ff; }
.safety-banner.risk { background: #3a1512; border-color: #d0574c; color: #ffdad5; }
.refused-summary { width: 100%; max-width: 46rem; margin: 0 auto 0.4rem; padding: 0.25rem 0.7rem; font-size: 0.85rem; line-height: 1.4; color: #fca5a5; background: rgba(127, 29, 29, 0.35); border: 1px solid rgba(248, 113, 113, 0.45); border-radius: 999px; text-align: center; flex: 0 0 auto; }
.hidden-note { margin: 0.2rem 0 0; font-size: 0.85rem; opacity: 0.8; text-align: center; }
.hidden-toggle { background: none; border: 0; padding: 0.2rem 0.1rem; font: inherit; font-weight: 700; color: var(--accent-2, #34d399); text-decoration: underline; cursor: pointer; }
.bl-row.hidden { opacity: 0.75; }
.refused-go { background: none; border: 0; padding: 0; font: inherit; font-weight: 700; color: inherit; text-decoration: underline; cursor: pointer; }
.refused-go:disabled { opacity: 0.5; cursor: default; }
.refused-why { margin: 0.5rem 0 0; font-size: 0.85rem; color: #fca5a5; }
:root[data-theme="light"] .refused-summary { color: #991b1b; background: #fef2f2; border-color: #fca5a5; }
:root[data-theme="light"] .refused-why { color: #b91c1c; }
/* No speech heard (job #915): plain small grey text, no pill, no red — in either theme. */
.refused-summary.quiet { color: #a3a3a3; background: none; border-color: transparent; }
.refused-why.quiet { color: #a3a3a3; }
:root[data-theme="light"] .refused-summary.quiet, :root[data-theme="light"] .refused-why.quiet { color: #525252; background: none; border-color: transparent; }
.safety-banner.refused { background: #3a2a0d; border-color: #e8a02a; color: #ffe9c2; }
/* ONE BATCH (job #347): where he is and the way back to the home screen. */
.batch-head { margin: -0.4rem 0 0.9rem; }
.batch-back { background: none; border: 0; font: inherit; font-weight: 600; color: var(--color-emerald, #06ffa5); padding: 0.3rem 0; min-height: 44px; cursor: pointer; }
.rc-card p.batch-title { margin: 0; font-size: 1rem; font-weight: 600; color: var(--color-paper, #f7f7f2); }
.batch-head { border: 1px solid var(--color-graphite, #475569); border-radius: 12px; padding: 0.2rem 0.8rem 0.6rem; }
.stage-where { margin: 0.4rem 0 0; font-size: 0.85rem; font-weight: 600; color: var(--color-paper-dim, #c1c1bb); text-align: center; }
:root[data-theme="light"] .batch-head { border-color: var(--line, #d4d4cf); background: #eef4fb; }
/* Small, muted, above everything and out of the flow of the work: it is the
   door, not part of the job. */
.rc-nav {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem 0.5rem;
  margin: 0 0 1rem;
  font-size: 0.95rem;
}
.rc-nav-item {
  display: inline-flex; align-items: center;
  min-height: 40px;
  line-height: 40px;
  padding: 0 0.6rem;
  border-radius: 8px;
  color: var(--color-emerald, #06ffa5);
  background: rgba(6, 255, 165, 0.08);
  text-decoration: none;
  font: inherit;
  font-weight: 600;
  border: 0;
  cursor: pointer;
}
.rc-nav-item:hover, .rc-nav-item:focus-visible { background: rgba(6, 255, 165, 0.2); }
.rc-nav-word { color: var(--color-paper-dim, #c1c1bb); font-weight: 600; }
.rc-nav-dot { color: var(--color-paper-dim, #c1c1bb); opacity: 0.6; }
.rc-hello { font-family: 'Josefin Sans', sans-serif; font-size: 1.6rem; margin: 0 0 0.35rem; }
.rc-card h2 { font-family: 'Josefin Sans', sans-serif; font-size: 1.3rem; margin: 0 0 0.6rem; }
.rc-card h3 { font-size: 0.95rem; margin: 1.25rem 0 0.35rem; }
.rc-card p { color: var(--color-paper-dim, #c1c1bb); font-size: 0.92rem; line-height: 1.6; }
.rc-progress-line { font-size: 1rem; color: var(--color-emerald, #06ffa5); margin: 0 0 1rem; }
.rc-spinner {
  width: 40px; height: 40px; margin: 0 auto 1rem;
  border: 3px solid var(--color-graphite, #475569);
  border-top-color: var(--color-tungsten, #ffa630);
  border-radius: 50%; animation: rc-spin 1s linear infinite;
}
@keyframes rc-spin { to { transform: rotate(360deg); } }

.how-to { list-style: decimal outside; margin: 0 0 1.25rem; padding-left: 1.4rem; color: var(--color-paper-dim, #c1c1bb); font-size: 0.95rem; line-height: 1.75; }
.how-to strong { color: var(--color-paper, #f7f7f2); }
kbd {
  font-family: 'IBM Plex Mono', monospace; font-size: 0.78em;
  background: var(--color-void, #0f172a); border: 1px solid var(--color-graphite, #475569);
  border-radius: 4px; padding: 0.05em 0.4em;
}

.mic-pick { margin: 1rem 0; }
.mic-label { display: block; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--color-paper-dim, #c1c1bb); margin-bottom: 0.35rem; }
.mic-select {
  width: 100%; padding: 0.7rem; border-radius: 8px;
  background: var(--color-void, #0f172a); color: var(--color-paper, #f7f7f2);
  border: 1px solid var(--color-graphite, #475569); font-size: 1rem; min-height: 48px;
}
/* THE MINIMAL SET's own card. Deliberately quiet: it sits above the roster and
   answers "how big is this job" in one line, which is the question a recordist
   standing at a microphone is actually asking. */
.volume-card {
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 10px;
  padding: 0.85rem 1rem;
  margin: 1rem 0 1.25rem;
  background: rgba(255, 255, 255, 0.04);
}
.volume-card h3 { margin: 0 0 0.35rem; font-size: 1rem; }
.phrase-kicker { margin: 0 0 0.2rem; font-size: 0.75rem; letter-spacing: 0.06em; text-transform: uppercase; color: var(--color-paper-dim, #c1c1bb); }
.phrase-title { font-size: 1.15rem; }
.phrase-count { margin: 0 0 0.55rem; font-size: 0.9rem; font-weight: 600; }
.volume-note { margin: 0 0 0.7rem; font-size: 0.85rem; line-height: 1.5; color: var(--color-paper-dim, #c1c1bb); }
.volume-row { display: flex; flex-wrap: wrap; align-items: center; gap: 0.45rem; }
.volume-label { font-size: 0.85rem; color: var(--color-paper-dim, #c1c1bb); margin-right: 0.25rem; }
.volume-btn {
  min-width: 3.2rem; min-height: 2.4rem;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 8px; background: transparent;
  color: inherit; font: inherit; font-size: 0.9rem; cursor: pointer;
}
.volume-btn.on { background: var(--color-emerald, #06ffa5); color: #07110c; border-color: transparent; font-weight: 600; }
.volume-btn:disabled { opacity: 0.5; cursor: default; }

.toggle-row { display: flex; gap: 0.7rem; align-items: flex-start; cursor: pointer; margin: 1rem 0 1.5rem; }
.toggle-row input { margin-top: 0.2rem; width: 20px; height: 20px; accent-color: var(--color-emerald, #06ffa5); flex-shrink: 0; }
.toggle-row strong { display: block; font-size: 0.95rem; }
.toggle-row small { display: block; font-size: 0.8rem; color: var(--color-paper-dim, #c1c1bb); line-height: 1.45; margin-top: 0.15rem; }

.setup-card { display: flex; flex-direction: column; gap: 0.5rem; padding: 1rem; margin: 0 0 1rem; border: 1px solid var(--color-gold, #d4a84b); border-radius: 10px; background: rgba(212, 168, 75, 0.08); }
.setup-card .setup-note { color: var(--color-gold, #d4a84b); }
.setup-card .setup-go { display: block; text-align: center; text-decoration: none; }
.btn-begin {
  display: block; width: 100%;
  font-family: 'Josefin Sans', sans-serif; font-size: 1.15rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.05em;
  color: var(--color-void, #0f172a); background: var(--color-emerald, #06ffa5);
  border: none; border-radius: 12px; padding: 1rem; cursor: pointer; min-height: 56px;
}
.btn-begin:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-next-batch[data-test="next-pod"] { overflow-wrap: anywhere; }
.pods-all-done {
  margin: 0; padding: 1rem; text-align: center; min-height: 56px;
  font-family: 'Josefin Sans', sans-serif; font-size: 1.15rem; font-weight: 700;
  color: var(--color-emerald, #06ffa5);
}
.btn-ghost {
  font-family: 'Josefin Sans', sans-serif; font-size: 0.95rem; color: var(--color-paper-dim, #c1c1bb);
  background: transparent; border: 1px solid var(--color-graphite, #475569);
  border-radius: 8px; padding: 0.75rem 1.4rem; cursor: pointer; margin-top: 1.25rem; min-height: 48px;
}
.note { font-size: 0.85rem; margin-top: 0.75rem; }
/* Quiet, in the room's own muted type. It is information, not an alarm: the
   thing it describes is nobody-in-this-room's problem. */
.not-ready, .handed-on { margin: 0.6rem 0 0.9rem; }
.handed-on p { margin: 0.35rem 0; font-size: 0.82rem; line-height: 1.5; color: var(--color-paper-dim, #c1c1bb); }
/* Green, because this one is finished work. The other note is neutral. */
.handed-on strong { color: var(--color-emerald, #06ffa5); font-weight: 600; }
.not-ready p { margin: 0.35rem 0; font-size: 0.82rem; line-height: 1.5; color: var(--color-paper-dim, #c1c1bb); }
.not-ready strong { color: var(--color-paper, #efeee9); font-weight: 600; }
.note.done { color: var(--color-emerald, #06ffa5); }
.note.error { color: #ff9d9d; }

/* Recording stage */
.stage { display: flex; flex-direction: column; gap: 0.85rem; padding-top: 0.75rem; }
.stage-top { display: flex; align-items: center; gap: 0.75rem; }
/* ON AIR: one small steady word. Live is the calm state, so it is the plain
   one; arming is the one that is dimmed, and the change between them is the
   whole message. */
.onair {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.62rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  white-space: nowrap;
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  color: var(--color-emerald, #06ffa5);
  border: 1px solid var(--color-emerald, #06ffa5);
}
.onair.arming {
  color: var(--color-paper-dim, #c1c1bb);
  border-color: var(--color-graphite, #475569);
}
.arming-well { display: flex; align-items: center; justify-content: center; }
.arming-words { font-size: 1.1rem; color: var(--color-paper-dim, #c1c1bb); margin: 0; }
/* Tall enough for a trace to have a shape, and no taller — it sits in the row
   the 10px bar sat in, between ON AIR and the dB tag. */
.meter {
  flex: 1; height: 26px; border-radius: 6px; overflow: hidden;
  background: var(--color-shadow, #1e293b); border: 1px solid var(--color-graphite, #475569);
}
.wave { display: block; width: 100%; height: 100%; }
.meter-tag { font-family: 'IBM Plex Mono', monospace; font-size: 0.68rem; color: var(--color-paper-dim, #c1c1bb); white-space: nowrap; }
.meter-tag.clip { color: var(--color-film-red, #e63946); }
/* Small and quiet, in the status band at the top rather than in the transport:
   it says what the run is doing and lets him change it, and it is nowhere near
   a button that files a take. */
.stage-auto {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0.35rem 0 0;
  font-size: 0.8rem;
  color: var(--color-paper-dim, #c1c1bb);
  cursor: pointer;
}
.stage-auto input { width: 1rem; height: 1rem; flex: 0 0 auto; accent-color: var(--color-emerald, #06ffa5); }
.stage-progress { margin: 0; font-size: 0.9rem; color: var(--color-paper-dim, #c1c1bb); }
/* In flow, above the line, and it stops nothing. Legible at a glance and gone
   at the next line — a marker, not an alert. */
.crossing {
  margin: 0.8rem 0 0.2rem;
  padding: 0.5rem 0.7rem;
  border-left: 3px solid var(--color-emerald, #06ffa5);
  background: rgba(6, 255, 165, 0.07);
  border-radius: 0 6px 6px 0;
  font-size: 0.85rem;
  color: var(--color-paper-dim, #c1c1bb);
}
.crossing strong { color: var(--color-paper, #efeee9); }
/* Recording is the room's own green; playing back is the tungsten amber used
   nowhere else on this screen. Two states, two colours, and the words underneath
   them say the same thing for anyone who does not read colour. */
.stage-progress.is-recording { color: var(--color-emerald, #06ffa5); }
.stage-progress.is-playing { color: var(--color-tungsten, #ffa630); font-weight: 600; }
.meter.held { opacity: 0.45; }
.meter-tag.held { color: var(--color-tungsten, #ffa630); }
.live-dot.off { background: var(--color-graphite, #475569); }

/* The same sentence on the cards, where there is no meter to read it off. */
.state-pill {
  display: inline-block;
  margin: 0 0 0.9rem;
  padding: 0.3rem 0.7rem;
  border-radius: 999px;
  font-size: 0.82rem;
  border: 1px solid var(--color-graphite, #475569);
  color: var(--color-paper-dim, #c1c1bb);
}
.state-pill.is-playing {
  color: var(--color-tungsten, #ffa630);
  border-color: var(--color-tungsten, #ffa630);
}
.state-pill.is-editing,
.stage-progress.is-editing { color: var(--color-tungsten, #ffa630); }
.state-pill.is-arming,
.stage-progress.is-arming { color: var(--color-paper-dim, #c1c1bb); }

/* THE BOX IS THE LINE. It sits in the line's own place, in the same well, at
   the same type size, with no border and no padding of its own — so opening the
   editor moves not one word on the page. The well's outline turns amber and
   that is the entire visual change. */
.line-well.editing { box-shadow: inset 0 0 0 2px var(--color-tungsten, #ffa630); }
.edit-box {
  display: block;
  width: 100%;
  border: 0;
  resize: none;
  overflow: hidden;
  font-family: inherit;
  background: transparent;
  caret-color: var(--color-tungsten, #ffa630);
}
.edit-box:focus { outline: none; }
/* IT SAYS WHAT HAPPENED, ONCE, QUIETLY, AND GOES. Not a toast: it has no
   dismiss, it cannot stack, and it never covers the line. */
.saved-note {
  margin: 0.6rem 0 0;
  font-size: 0.95rem;
  color: var(--color-tungsten, #ffa630);
}

/* THE line. Nothing else on the screen competes with it. */
.line-well {
  display: flex; flex-direction: column; justify-content: center;
  min-height: 44vh; min-height: 44dvh; padding: 1.5rem 1.1rem; border-radius: 16px;
  background: var(--color-shadow, #1e293b);
  box-shadow: inset 0 0 0 2px var(--color-emerald, #06ffa5);
}
.line-target {
  margin: 0; font-size: 2.1rem; line-height: 1.3; font-weight: 500;
  color: var(--color-paper, #f7f7f2);
}
/* Tap the words to change them. The only hint is that a tap does something at
   all — the line must stay the plainest, biggest thing on the screen. */
.line-target.tappable { cursor: text; -webkit-tap-highlight-color: rgba(255, 166, 48, 0.25); }
.line-target.tappable:active { color: var(--color-tungsten, #ffa630); }
.line-kind {
  margin: 0 0 0.35rem;
  font-size: 0.78rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  opacity: 0.5;
}
.line-known {
  margin: 1rem 0 0; font-size: 1rem; line-height: 1.5;
  color: var(--color-paper-dim, #c1c1bb); opacity: 0.75;
}
/* Narration segments. The words the recordist says are all of them — these only
   make the two languages tellable apart at a glance, never add anything to read. */
/* Colour alone tells the source segment from the target one: the source is
   often a script with no italic form, where italic is synthesised by shearing
   the glyphs (Tom, 2026-09-04). */
.seg-src { color: var(--color-paper-dim, #c1c1bb); }
.seg-tgt { color: var(--color-emerald, #06ffa5); }
.line-why {
  margin: 0.75rem 0 0; font-size: 0.85rem; line-height: 1.4;
  color: var(--color-paper-dim, #c1c1bb); opacity: 0.6;
}

/* THE EXCHANGE AROUND THE LINE. Dimmed, small, and nothing to touch — the line
   being read stays the biggest thing on the screen, and no affordance sits near
   the thumb while the mic is live. Two text lines at most, then it clips. */
.cue {
  list-style: none; margin: 0; padding: 0;
  display: flex; flex-direction: column; gap: 0.2rem;
  pointer-events: none;
}
.cue-before { margin-bottom: 0.4rem; }
.cue-after { margin-top: 0.4rem; }
.cue-line {
  display: flex; align-items: baseline; gap: 0.4rem; min-width: 0;
  font-size: 0.85rem; line-height: 1.35;
  color: var(--color-paper-dim, #c1c1bb); opacity: 0.55;
}
.cue-speaker {
  flex-shrink: 0;
  font-size: 0.66rem; letter-spacing: 0.05em; text-transform: uppercase;
  padding: 0.05rem 0.4rem; border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}
.cue-text {
  min-width: 0;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Coming up: legible, but never competing with the line being read. */
.upnext { margin-top: 0.15rem; }
.upnext-head {
  margin: 0 0 0.3rem; font-size: 0.7rem; letter-spacing: 0.06em; text-transform: uppercase;
  color: var(--color-paper-dim, #c1c1bb); opacity: 0.75;
}
.upnext-list {
  margin: 0; padding-left: 1.1rem; display: flex; flex-direction: column; gap: 0.22rem;
}
.upnext-list li {
  font-size: 0.8rem; line-height: 1.35; color: var(--color-paper-dim, #c1c1bb);
  opacity: 0.72; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.upnext-list li:first-child { opacity: 0.95; }

.live-dot {
  display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 0.4rem;
  background: var(--color-graphite, #475569);
}
.live-dot.hot { background: var(--color-emerald, #06ffa5); }

/* Three across on a phone, and Next still the biggest thing in the row. Back and
   Again share the left side by percentage rather than content width, so the row
   never wraps and no button ever falls under a thumb-sized target. */
.controls { display: flex; gap: 0.6rem; }
.ctl-back,
.ctl-again {
  flex: 0 0 26%; min-height: 68px;
  font-family: 'Josefin Sans', sans-serif; font-size: 1.05rem; font-weight: 600;
  border-radius: 14px; cursor: pointer;
  background: var(--color-shadow, #1e293b); color: var(--color-paper, #f7f7f2);
  border: 1px solid var(--color-graphite, #475569);
}
.ctl-next {
  flex: 1; min-height: 68px;
  font-family: 'Josefin Sans', sans-serif; font-size: 1.35rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.04em;
  border-radius: 14px; border: none; cursor: pointer;
  background: var(--color-emerald, #06ffa5); color: var(--color-void, #0f172a);
}
/* Full width and above the transport: he is mid-flow with a script in front of
   him, so it has to be findable with a thumb without looking down. Nothing else
   shrank to make room for it. */
.ctl-pause {
  width: 100%; min-height: 56px;
  font-family: 'Josefin Sans', sans-serif; font-size: 1.05rem; font-weight: 600;
  border-radius: 14px; cursor: pointer;
  background: var(--color-shadow, #1e293b); color: var(--color-paper, #f7f7f2);
  border: 1px solid var(--color-graphite, #475569);
}
/* Paused is the tungsten amber this screen already uses for "the mic is not
   listening", and it is the only lit thing on the page while it is true. */
.ctl-pause.paused {
  background: var(--color-tungsten, #ffa630); color: var(--color-void, #0f172a);
  border-color: var(--color-tungsten, #ffa630);
}
.ctl-back:disabled, .ctl-again:disabled, .ctl-next:disabled, .btn-finish:disabled, .ctl-pause:disabled { opacity: 0.5; cursor: default; }
.btn-finish {
  align-self: center; font-family: 'Josefin Sans', sans-serif; font-size: 0.85rem;
  color: var(--color-paper-dim, #c1c1bb); background: transparent;
  border: 1px solid var(--color-graphite, #475569); border-radius: 8px;
  padding: 0.6rem 1.3rem; cursor: pointer; min-height: 44px;
}
.kbd-hint { text-align: center; font-size: 0.72rem; color: var(--color-paper-dim, #c1c1bb); margin: 0; }

/* Done */
.listen-note { font-size: 0.78rem; margin: 0 0 0.6rem; }
/* Past eight rows the list gets a filter box, per the estate's dropdown rule. */
.listen-filter {
  width: 100%; box-sizing: border-box; margin: 0 0 0.6rem;
  padding: 0.5rem 0.65rem; font-size: 0.9rem; font: inherit;
  border: 1px solid rgba(255, 255, 255, 0.25); border-radius: 8px;
  background: rgba(0, 0, 0, 0.25); color: inherit;
}
.listen-filter::placeholder { opacity: 0.55; }
/* Which part of the list this line came from. Small, ahead of the words, so a
   mixed list reads as one thing. */
.listen-kind {
  display: inline-block; margin-right: 0.5rem; font-size: 0.62rem;
  letter-spacing: 0.06em; text-transform: uppercase; opacity: 0.55;
}
/* A SECTION OF THE ALREADY-RECORDED LIST. The whole heading is the tap target
   and it is a full-width button, sized for a thumb — count first then name, the
   same shape the queue's own section map uses, so the two halves of the screen
   read as one design. */
.listen-sec { margin: 0 0 0.5rem; }
.listen-sec-head {
  display: flex; align-items: center; gap: 0.6rem; width: 100%; text-align: left;
  font-family: 'Josefin Sans', sans-serif; color: var(--color-paper, #f7f7f2);
  background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 8px; padding: 0.55rem 0.7rem; min-height: 44px; cursor: pointer;
}
.listen-sec-head[aria-expanded="true"] { background: rgba(255, 255, 255, 0.1); }
.lsh-mark { font-size: 1rem; opacity: 0.7; width: 0.9rem; text-align: center; }
.lsh-count { font-size: 1rem; font-weight: 700; min-width: 1.8rem; }
.lsh-name { font-size: 0.85rem; letter-spacing: 0.04em; }
.listen-sec ul { margin-top: 0.5rem; }
.listen-back ul, .redo-list ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; }
.listen-back li {
  display: flex; align-items: center; gap: 0.75rem; justify-content: space-between;
  padding: 0.55rem 0.7rem; border-radius: 8px; background: rgba(255, 255, 255, 0.04);
}
.listen-back li.playing { background: rgba(6, 255, 165, 0.14); }
/* A row that can open a compare panel underneath it stacks instead of sitting
   on one line — on a phone the two play buttons and the text never fit across. */
.listen-back li.stacked { display: block; }
.listen-row { display: flex; align-items: center; gap: 0.75rem; justify-content: space-between; flex-wrap: wrap; }
.listen-actions { display: flex; align-items: center; gap: 0.4rem; flex-shrink: 0; }
.cmp-btn {
  font-family: 'Josefin Sans', sans-serif; font-size: 0.72rem; font-weight: 600;
  color: var(--color-paper, #f7f7f2); background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.18); border-radius: 6px;
  padding: 0.35rem 0.7rem; cursor: pointer; min-height: 36px;
}
.cmp-btn.open { border-color: var(--color-tungsten, #ffa630); color: var(--color-tungsten, #ffa630); }
.listen-text { font-size: 0.9rem; min-width: 0; }
.redo-list li {
  display: flex; flex-direction: column; gap: 0.3rem; align-items: flex-start;
  padding: 0.6rem 0.75rem; border-radius: 8px;
  background: var(--color-void, #0f172a); border: 1px solid var(--color-tungsten, #ffa630);
}
.redo-text { font-size: 0.9rem; color: var(--color-paper, #f7f7f2); }
.redo-why { font-size: 0.75rem; color: var(--color-tungsten, #ffa630); }
.redo-btn {
  font-family: 'Josefin Sans', sans-serif; font-size: 0.85rem; font-weight: 600;
  color: var(--color-void, #0f172a); background: var(--color-tungsten, #ffa630);
  border: none; border-radius: 8px; padding: 0.5rem 0.9rem; cursor: pointer; min-height: 40px;
}

/* DESKTOP: USE THE SCREEN (Tom, 2026-09-03). A min-width query, so not one
   pixel below 900px moves — Aran and Catrin record on phones and the phone
   layout above is exactly what ships today. Nothing is added to fill the space:
   the completeness grid simply gets many more marks per row, the roster and
   listen-back rows stop wrapping, and the controls have room. The spoken line
   keeps its reading measure inside the now-wide well: a 2.1rem line stretched
   to 1900px is harder to read aloud from than the column it replaced. */
@media (min-width: 900px) {
  .recordist { max-width: none; padding: 1.25rem 2rem; }
  .line-target { max-width: 34ch; }
  .line-known, .line-why { max-width: 68ch; }
  /* Prose keeps a reading measure for the same reason the line does. The
     centred cards are left alone — a capped paragraph in one stops being centred. */
  .rc-card:not(.center) p, .how-to, .toggle-row small { max-width: 68ch; }
  /* Back and Again stop scaling with the viewport at this width; Next still
     takes the rest of the row and is still the biggest thing in it. */
  .ctl-back, .ctl-again { flex: 0 0 9rem; }
}

@media (max-width: 480px) {
  .recordist { padding: 0.6rem; }
  .line-target, .edit-box { font-size: 1.8rem; }
  .kbd-hint { display: none; }
}

/* Light mode: the shared graphite border token is far too faint on white. */
:root[data-theme="light"] .recordist { background: var(--surface); }
:root[data-theme="light"] .rc-card,
:root[data-theme="light"] .mic-select,
:root[data-theme="light"] .meter,
:root[data-theme="light"] .btn-ghost,
:root[data-theme="light"] .btn-finish,
:root[data-theme="light"] .ctl-back,
:root[data-theme="light"] .ctl-again,
:root[data-theme="light"] .ctl-pause:not(.paused) { border-color: var(--line); }
/* The safety banner again, for white. Same three-way distinction, same hues,
   inverted weight: deep ink on a pale wash instead of pale ink on a deep one. */
:root[data-theme="light"] .safety-banner.done { background: #dcf3e5; border-color: #15803d; color: #0f4a26; }
:root[data-theme="light"] .safety-banner.waiting { background: #dbe9fb; border-color: #2563eb; color: #14306e; }
:root[data-theme="light"] .safety-banner.risk { background: #fbe2df; border-color: #b91c1c; color: #7a1512; }
:root[data-theme="light"] .safety-banner.refused { background: #fbeed6; border-color: #b45309; color: #6b3c06; }

/* "Edit this line" (job #709): a quiet text button under the line, readable in both themes. */
.ble-open { margin-top: 0.6rem; min-height: 44px; padding: 0 0.9rem; border-radius: 10px; border: 1px solid var(--line); background: transparent; color: var(--ink); font: inherit; font-weight: 600; cursor: pointer; }

/* ── THE PROMPTER (job #424; design #419 Option A, with B's desktop rail and C's done list) ──
   One viewport tall, nothing scrolls: where-am-I row · (live: status row) · the line, centred in
   what is left · the transport pinned to the bottom edge. Inside the booth's tab page the height
   comes from RecordistBooth (it subtracts the language tabs); mounted on its own it subtracts the
   app bar, whose height AppNavbar publishes as --app-navbar-height (0 while the bar is hidden). */
.recordist.fit {
  display: flex; flex-direction: column;
  max-width: none; margin: 0; padding: 0;
  height: calc(100dvh - var(--app-navbar-height, 0px)); min-height: 0;
  overflow: hidden;
}
.recordist.fit > .safety-banner { flex: none; margin: 0.5rem 0.75rem 0; padding: 0.45rem 0.75rem; height: 4.6rem; }
/* While he reads, an upload that is simply on its way is one line, not three: takes go up after
   every line, and the reassurance is said in full on the batch page and the done screen. A take
   at risk or refused keeps its whole sentence. */
.recordist.fit.live > .safety-banner.waiting,
.recordist.fit.live > .safety-banner.done { flex-direction: row; align-items: center; padding: 0.3rem 0.75rem; height: 2.2rem; }
.recordist.fit.live > .safety-banner.waiting span,
.recordist.fit.live > .safety-banner.done span { display: none; }
/* On the home page the uploading notice is ONE slim line (Aran, 2026-10-15, job #806); the detail stays in the title. */
.safety-banner.slim { flex-direction: row; align-items: center; padding: 0.3rem 0.75rem; height: 2.2rem; }
.safety-banner.slim span { display: none; }

.where {
  flex: none; display: flex; align-items: center; gap: 0.5rem;
  padding: 0.3rem 0.75rem; min-height: 44px;
  background: var(--surface, #1e293b); border-bottom: 1px solid var(--line, #334155);
}
.where-home {
  flex: none; background: none; border: 0; cursor: pointer;
  color: var(--accent-2, #34d399); font-weight: 800; font-size: 1.5rem; line-height: 1;
  min-width: 40px; min-height: 40px; padding: 0 0.4rem 0.2rem 0.1rem;
}
.where-words {
  flex: 1; min-width: 0; margin: 0;
  font-weight: 700; font-size: 0.875rem; color: var(--ink, #f1f5f9);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.where.live { padding-left: 1rem; }
.wm-short { display: none; font-size: 1.1rem; line-height: 1; }
.where.live .where-words { font-weight: 600; color: var(--muted, #94a3b8); }
.where-more {
  flex: none; background: none; border: 1px solid var(--line, #334155); border-radius: 999px;
  color: var(--ink, #f1f5f9); font: inherit; font-size: 0.8rem; font-weight: 600;
  padding: 0 0.75rem; min-height: 34px; cursor: pointer; white-space: nowrap;
}

.status {
  flex: none; position: relative; display: flex; align-items: center; gap: 0.5rem;
  padding: 0.45rem 0.75rem; background: var(--surface, #1e293b); border-bottom: 1px solid var(--line, #334155);
}
/* STOP AND PAUSE ARE REAL BUTTONS (Aran, 2026-10-15, job #675: "clear obvious buttons ... instead of
   just the small text about keyboard shortcuts"). They were 38px outlined ghosts the colour of the
   bar, so the only loud words on a desktop screen were the shortcut line. Now 48px, filled, with a
   glyph: Pause green, Stop red, Resume amber (the one lit thing while the mic is held). White text
   on each; the glyphs are CSS so the button text stays the plain word. */
.sp-row { max-width: 900px; margin: 0 auto 0.6rem; display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; }
.sp-row .btn-finish, .sp-row .ctl-pause {
  width: 100%; min-height: 52px; padding: 0 1rem; margin: 0;
  display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem;
  font-family: inherit; font-size: 1rem; font-weight: 700; border-radius: 12px; cursor: pointer;
  color: #fff; border: 0;
}
/* Fixed green, not --accent-2: that variable is mint (#34d399) in dark mode, and white on it is 1.9:1 (job #681). */
.sp-row .ctl-pause { background: #047857; }
.sp-row .btn-finish { background: #b91c1c; }
.sp-row .ctl-pause::before { content: '\23F8'; font-size: 1.1em; }
.sp-row .btn-finish::before { content: '\25A0'; font-size: 0.9em; }
.sp-row .ctl-pause.paused { background: #a85508; color: #fff; }
.sp-row .ctl-pause.paused::before { content: '\25B6'; }
.sp-row .btn-finish:disabled, .sp-row .ctl-pause:disabled { opacity: 0.45; }
.status .stage-progress { margin: 0 auto; font-size: 0.875rem; font-weight: 700; color: var(--ink, #f1f5f9); white-space: nowrap; }
.status-edge { position: absolute; left: 0; right: 0; bottom: -1px; height: 3px; background: var(--line, #334155); }
.status-edge i { display: block; height: 100%; background: var(--accent-2, #34d399); transition: width 0.3s; }
.mic {
  display: inline-flex; align-items: center; gap: 0.45rem; min-width: 0;
  padding: 0.3rem 0.6rem 0.3rem 0.5rem; border-radius: 999px;
  font-size: 0.8125rem; font-weight: 700;
  background: rgba(52, 211, 153, 0.14); color: var(--accent-2, #34d399);
}
.mic-word { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mic-dot { flex: none; width: 10px; height: 10px; border-radius: 50%; background: currentColor; animation: mic-pulse 1.4s infinite; }
@keyframes mic-pulse { 0% { opacity: 1; } 50% { opacity: 0.35; } 100% { opacity: 1; } }
.mic-row { flex: none; padding: 0.4rem 0.75rem 0; }
.mic-row .mic { display: flex; width: 100%; max-width: 900px; margin: 0 auto; box-sizing: border-box; border-radius: 12px; }
.mic-row .mic-word { flex: none; }
.mic .meter { flex: 1 1 auto; min-width: 0; width: auto; height: 40px; border: 0; border-radius: 0; background: transparent; }
.mic .wave { color: currentColor; }
.mic.is-paused, .mic.is-editing, .mic.is-arming { background: var(--surface-2, #334155); color: var(--muted, #94a3b8); }
.mic.is-paused .mic-dot, .mic.is-editing .mic-dot, .mic.is-arming .mic-dot, .mic.is-playing .mic-dot { animation: none; }
.mic.is-playing { background: rgba(255, 166, 48, 0.16); color: var(--accent, #ffa630); }
.mic.is-loud { background: rgba(248, 113, 113, 0.16); color: var(--danger, #f87171); }
.stage-auto { flex: none; justify-content: center; margin: 0; padding: 0.25rem 0.75rem; font-size: 0.78rem; border-bottom: 1px solid var(--line, #334155); }

.fit-body { flex: 1 1 auto; min-height: 0; display: flex; }
.recordist.fit .centre {
  flex: 1 1 auto; min-width: 0; min-height: 0; display: flex; flex-direction: column;
  margin: 0; padding: 0; border: 0; border-radius: 0; background: transparent; gap: 0;
}
.centre-line {
  flex: 1 1 auto; min-height: 0; overflow-y: auto;
  display: flex; flex-direction: column;
  width: 100%; max-width: 900px; margin: 0 auto; padding: 0.75rem 1.25rem;
}
/* Centred in what is left, and still readable from the top when a long line fills it: the
   auto margins centre a short block and collapse to nothing for a tall one. */
.recordist.fit .centre .centre-line > :first-child { margin-top: auto; }
.recordist.fit .centre .centre-line > :last-child { margin-bottom: auto; }
.recordist.fit .line-well {
  min-height: 0; padding: 0; border-radius: 12px; background: transparent; box-shadow: none;
}
.recordist.fit .line-well.editing { padding: 0.5rem; box-shadow: inset 0 0 0 2px var(--accent, #ffa630); }
.recordist.fit .line-target, .recordist.fit .ready-line {
  margin: 0; font-size: clamp(1.75rem, 7.4vw, 2.75rem); line-height: 1.22; font-weight: 500; letter-spacing: -0.01em;
  color: var(--ink, #f1f5f9);
}
.recordist.fit .ready-line.all-done { font-size: 1.5rem; }
.recordist.fit .line-kind {
  margin: 0 0 0.6rem; font-size: 0.75rem; letter-spacing: 0.04em; text-transform: none; opacity: 1;
  color: var(--faint, #64748b); font-weight: 600;
}
.recordist.fit .line-known { margin: 0.85rem 0 0; font-size: 1.05rem; opacity: 1; color: var(--muted, #94a3b8); }
.recordist.fit .stage.is-paused .line-target, .recordist.fit .stage.is-paused .line-known { color: var(--faint, #64748b); }
.pnote {
  margin: 0 0 0.9rem; padding: 0.5rem 0.75rem; border-radius: 10px;
  background: var(--surface-2, #334155); color: var(--ink, #f1f5f9); font-weight: 600; font-size: 0.875rem;
}
.recordist.fit .crossing { margin: 0 0 0.75rem; }
.recordist.fit .cue-before { margin-bottom: 0.75rem; }
.recordist.fit .cue-after { margin-top: 0.75rem; }
.recordist.fit .upnext { margin-top: 1rem; }
.recordist.fit .upnext-list li:nth-child(n+2) { display: none; }
.recordist.fit .stage > .note, .recordist.fit .stage > .raw-vs-processed { width: 100%; max-width: 900px; margin: 0 auto; padding: 0 1.25rem; }

.meta {
  flex: none; display: flex; align-items: center; gap: 0.75rem;
  width: 100%; max-width: 900px; margin: 0 auto; padding: 0.4rem 1.25rem 0.5rem;
}
.recordist.fit .meta .rc-progress-line { margin: 0; font-size: 0.8125rem; font-weight: 700; color: var(--ink, #f1f5f9); white-space: nowrap; }
.bar { flex: 1; height: 6px; border-radius: 99px; overflow: hidden; background: var(--line, #334155); }
.bar > i { display: block; height: 100%; border-radius: 99px; background: var(--accent-2, #34d399); transition: width 0.3s; }

.transport {
  flex: none; background: var(--surface, #1e293b); border-top: 1px solid var(--line, #334155);
  padding: 0.6rem 0.75rem calc(0.6rem + env(safe-area-inset-bottom, 0px));
}
.transport-in { max-width: 900px; margin: 0 auto; display: grid; grid-template-columns: 1fr 2fr; gap: 0.6rem; }
.transport-in.one { grid-template-columns: 1fr; }
.transport-in.live { grid-template-columns: 1fr 2fr; }
/* ‹ AND › SIDE BY SIDE (Aran, 2026-10-15): two equal arrows, one line each way. */
.ctl-arrows { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; }
.recordist.fit .transport .ctl-arrows .ctl-back,
.recordist.fit .transport .ctl-arrows .ctl-next { font-size: 2rem; font-weight: 700; line-height: 1; padding: 0; }
.ctl-jump {
  display: block; width: 100%; max-width: 900px; margin: 0.5rem auto 0; min-height: 44px;
  font: inherit; font-size: 0.95rem; font-weight: 700; border-radius: 12px; cursor: pointer;
  background: transparent; color: var(--accent-2, #34d399); border: 1px solid var(--accent-2, #34d399);
}
.ctl-jump:disabled { opacity: 0.5; cursor: default; }
:root[data-theme="light"] .ctl-jump { color: #047857; border-color: #047857; }
.ready-where { margin: 0.75rem 0 0; font-size: 0.9rem; color: var(--ink-2, #cbd5e1); }
.ready-where .setline-change { display: block; margin: 0.35rem auto 0; min-height: 40px; }
:root[data-theme="light"] .ready-where { color: #334155; }
/* WHERE THE CURSOR IS: "Line 37 of 100 · saved". */
.status .line-pos { font-size: 0.875rem; font-weight: 700; color: var(--ink, #f1f5f9); white-space: nowrap; }
.line-state { font-weight: 800; }
.line-state.ls-saved { color: #34d399; }
.line-state.ls-uploading { color: #f59e0b; }
.line-state.ls-refused { color: #f87171; }
.line-state.ls-not-yet { color: var(--ink-2, #cbd5e1); }
:root[data-theme="light"] .status .line-pos { color: #0f172a; }
:root[data-theme="light"] .line-state.ls-saved { color: #047857; }
:root[data-theme="light"] .line-state.ls-uploading { color: #b45309; }
:root[data-theme="light"] .line-state.ls-refused { color: #b91c1c; }
:root[data-theme="light"] .line-state.ls-not-yet { color: #475569; }
.recordist.fit .transport .btn-begin {
  margin: 0; min-height: 56px; padding: 0.75rem; text-transform: none; letter-spacing: 0;
  font-family: inherit; font-size: 1.125rem; border-radius: 14px;
}
.recordist.fit .transport .btn-ghost { margin: 0; min-height: 56px; border-radius: 14px; color: var(--ink, #f1f5f9); border-color: var(--line, #334155); }
.recordist.fit .transport .ctl-back,
.recordist.fit .transport .ctl-again,
.recordist.fit .transport .ctl-next { flex: none; min-height: 60px; border-radius: 14px; font-family: inherit; }
.recordist.fit .transport .ctl-back { font-size: 1.6rem; line-height: 1; padding: 0; }
.recordist.fit .transport .ctl-again { font-size: 1.125rem; background: var(--surface, #1e293b); color: var(--ink, #f1f5f9); border: 1px solid var(--line, #334155); }
.recordist.fit .transport .ctl-next { font-size: 1.25rem; text-transform: none; letter-spacing: 0; }
.setline { margin: 0.4rem 0 0; text-align: center; font-size: 0.8125rem; color: var(--muted, #94a3b8); }
.setline-change { background: none; border: 0; padding: 0.2rem 0.1rem; font: inherit; font-weight: 700; color: var(--accent-2, #34d399); cursor: pointer; }
.recordist.fit .kbd-hint { margin: 0.35rem 0 0; }

/* B's rail: desktop only, a column of small squares beside the line. */
.rail-wrap { display: none; }

/* C's done list: this session's takes, each with ▶ and Again, mic off. */
.recordist.fit .done-card { padding: 0.75rem 1.25rem 0; width: 100%; max-width: 900px; margin: 0 auto; overflow-y: auto; }
.done-card h2 { margin: 0.25rem 0; }
.done-card .rc-progress-line { margin: 0; }
.recordist.fit .done-sub { margin: 0.2rem 0 0.4rem; font-size: 0.875rem; color: var(--muted, #94a3b8); }
.done-list { margin-top: 0.4rem; }
.done-list ul { gap: 0 !important; }
.recordist.fit .done-list li { background: transparent; border-radius: 0; border-bottom: 1px solid var(--line, #334155); padding: 0.45rem 0; }
.again-btn { min-height: 36px; }

/* THE SHEET: everything that is not the line. A dropdown from the where-am-I row on a phone, a
   right-hand sidebar that pushes the stage over on a desktop (Aran, 2026-10-14, job #437). */
.recordist.fit { position: relative; }
.sheet-scrim { position: absolute; left: 0; right: 0; bottom: 0; top: var(--sheet-top, 44px); z-index: 190; background: rgba(2, 6, 23, 0.55); }
.sheet {
  position: absolute; left: 0; right: 0; top: var(--sheet-top, 44px); z-index: 200;
  max-height: 72%; display: flex; flex-direction: column;
  background: var(--canvas, #0f172a); color: var(--ink, #f1f5f9);
  border-bottom: 1px solid var(--line, #334155); border-radius: 0 0 16px 16px;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.45);
}
.sheet-head {
  flex: none; display: flex; align-items: center; gap: 0.75rem;
  padding: 0.5rem 0.75rem; background: var(--surface, #1e293b); border-bottom: 1px solid var(--line, #334155);
}
.sheet-title { flex: 1; margin: 0; font-weight: 700; font-size: 1rem; }
.sheet-close {
  flex: none; min-height: 40px; min-width: 40px; padding: 0 1rem; border-radius: 10px; cursor: pointer;
  font: inherit; font-weight: 700; color: var(--canvas, #0f172a); background: var(--accent-2, #34d399); border: 0;
}
.sheet-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 0.75rem 1rem 2rem; width: 100%; max-width: 900px; margin: 0 auto; }
.sheet-settings h3 { margin: 1rem 0 0.5rem; font-size: 1rem; }
/* THE BATCH LIST: a row per line, the words big enough to read at arm's length on a phone. */
.batch-lines { margin: 0.5rem 0 1rem; }
.bl-head { margin: 0.25rem 0 0.5rem; font-size: 0.95rem; font-weight: 700; color: var(--ink-2, #cbd5e1); }
.bl-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.35rem; }
.bl-row { display: flex; align-items: stretch; gap: 0.4rem; border: 1px solid var(--line, #334155); border-radius: 10px; background: var(--surface, #1e293b); }
.bl-row.now { border-color: #34d399; box-shadow: inset 4px 0 0 #34d399; background: rgba(52, 211, 153, 0.12); }
.bl-go { flex: 1; min-width: 0; display: flex; align-items: flex-start; gap: 0.55rem; padding: 0.55rem 0.6rem; text-align: left; font: inherit; color: inherit; background: none; border: 0; cursor: pointer; }
.bl-num { flex: none; min-width: 2ch; font-size: 0.85rem; font-variant-numeric: tabular-nums; color: var(--ink-2, #94a3b8); padding-top: 0.15rem; text-align: right; }
.bl-dot { flex: none; display: inline-block; width: 12px; height: 12px; border-radius: 50%; margin-top: 0.3rem; background: #334155; }
.bl-dot.done { background: #34d399; }
.bl-dot.up { background: #f59e0b; }
.bl-dot.failed { background: #f87171; }
.bl-words { min-width: 0; display: flex; flex-direction: column; gap: 0.1rem; }
.bl-text { font-size: 1.05rem; line-height: 1.3; overflow-wrap: anywhere; }
.bl-known { font-size: 0.8rem; line-height: 1.25; color: var(--ink-2, #94a3b8); overflow-wrap: anywhere; }
.bl-again { flex: none; align-self: center; min-height: 44px; padding: 0 0.75rem; margin-right: 0.35rem; border-radius: 10px; cursor: pointer; font: inherit; font-size: 0.85rem; font-weight: 700; background: transparent; color: inherit; border: 1px solid var(--line, #334155); }
:root[data-theme="light"] .bl-again { border-color: #94a3b8; color: #0f172a; }
.bl-play { flex: none; align-self: center; width: 44px; height: 44px; margin-right: 0.35rem; border-radius: 50%; border: 0; cursor: pointer; font-size: 1rem; background: #34d399; color: #0f172a; }
.bl-legend { display: flex; flex-wrap: wrap; gap: 0.3rem 0.9rem; list-style: none; margin: 0.5rem 0 0; padding: 0; font-size: 0.78rem; color: var(--ink-2, #cbd5e1); }
.bl-legend li { display: flex; align-items: center; gap: 0.35rem; }
.bl-legend .bl-dot { margin-top: 0; }
.grid-toggle { margin: 1rem 0 0.5rem; min-height: 40px; padding: 0 1rem; border-radius: 10px; font: inherit; cursor: pointer; color: inherit; background: none; border: 1px solid var(--line, #334155); }
.sheet .sheet-body { max-width: none; }

@media (min-width: 900px) {
  .sheet-scrim { top: 0; background: transparent; }
  .sheet {
    left: auto; right: 0; top: 0; bottom: 0; width: 420px; max-height: none; border-radius: 0;
    border-bottom: 0; border-left: 1px solid var(--line, #334155); box-shadow: -8px 0 24px rgba(0, 0, 0, 0.3);
  }
  /* Push, not cover: the line re-centres in what is left, so it stays readable. */
  .recordist.fit.sheet-open { padding-right: 420px; box-sizing: border-box; }
  /* THE RAIL IS ITS OWN FULL-HEIGHT COLUMN (job #286): every row of the page — the where-am-I row,
     the status, the waveform, the line, the transport — sits to its right, so the rows that appear
     when recording starts take no height from it and the squares never move on Start or Stop.
     ANCHORED TO THE BOTTOM, not centred: the app bar above the booth hides while the mic is live,
     so the column's top moves on Start and its bottom (the screen's bottom edge) does not. */
  .recordist.fit.has-rail { padding-left: var(--rail-w, 217px); box-sizing: border-box; }
  .rail-wrap {
    position: absolute; left: 0; top: 0; bottom: 0; width: var(--rail-w, 217px); box-sizing: border-box; z-index: 1;
    display: flex; flex-direction: column; justify-content: flex-end; gap: 0.75rem;
    padding: 1rem 1.25rem; overflow: hidden; border-right: 1px solid var(--line, #334155);
  }
  .rail-wrap.scroll { justify-content: flex-start; overflow-y: auto; }
  .rail {
    flex: none; display: grid; grid-template-columns: repeat(var(--rail-cols, 10), var(--rail-sq, 14px)); grid-auto-rows: var(--rail-sq, 14px); gap: var(--rail-gap, 4px);
    list-style: none; margin: 0; padding: 0;
  }
  .rail-legend { flex: none; display: flex; flex-direction: column; gap: 0.3rem; list-style: none; margin: 0; padding: 0; font-size: 0.78rem; color: var(--ink-2, #cbd5e1); max-width: 176px; }
  .rail-legend li { display: flex; align-items: center; gap: 0.4rem; }
  .rail-legend .rail-sq { flex: none; width: 12px; height: 12px; }
  /* Each state its own colour, the same weight of selector in dark and light, so a theme rule can
     never paint one state over another (light mode once painted done and failed grey). */
  .rail-sq { border-radius: 3px; background: #334155; cursor: pointer; }
  .rail-sq.done { background: #34d399; }
  .rail-sq.up { background: #f59e0b; }
  .rail-sq.failed { background: #f87171; }
  .rail-sq.now { box-shadow: 0 0 0 2px var(--ink, #f1f5f9); }
  .recordist.fit .line-target, .recordist.fit .ready-line { font-size: 3.1rem; max-width: 30ch; }
  .recordist.fit .upnext-list li:nth-child(-n+3) { display: list-item; }
  .mic .meter { height: 56px; }
  .mic-row { padding: 0.5rem 1.25rem 0; }
}
@media (max-width: 480px) {
  .recordist.fit .line-target, .recordist.fit .ready-line, .recordist.fit .edit-box { font-size: 2rem; }
  .mic-row { padding: 0.3rem 0.5rem 0; }
  .status { gap: 0.35rem; padding: 0.4rem 0.5rem; }
  .sp-row .btn-finish, .sp-row .ctl-pause { padding: 0 0.7rem; font-size: 0.95rem; }
  .where-more { padding: 0; width: 40px; min-height: 40px; }
  .wm-long { display: none; }
  .wm-short { display: inline; }
  /* Off the stage the words may take two lines: which batch matters more than a tidy row. */
  .where:not(.live) .where-words { white-space: normal; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; line-height: 1.3; }
}
/* A short phone screen (iPhone SE and the like): the line gives way first, never the transport. */
@media (max-height: 640px) {
  .recordist.fit .line-target, .recordist.fit .ready-line { font-size: 1.6rem; }
  .recordist.fit .transport .btn-begin, .recordist.fit .transport .ctl-back,
  .recordist.fit .transport .ctl-again, .recordist.fit .transport .ctl-next, .recordist.fit .transport .btn-ghost { min-height: 50px; }
}

:root[data-theme="light"] .where { background: #eef4fb; border-bottom-color: #c9d8ea; }
:root[data-theme="light"] .where-words { color: #1e293b; }
:root[data-theme="light"] .status, :root[data-theme="light"] .transport, :root[data-theme="light"] .sheet-head { background: #fff; }
:root[data-theme="light"] .sheet { background: #f8fafc; color: #0f172a; border-color: #c9d8ea; box-shadow: 0 12px 28px rgba(15, 23, 42, 0.22); }
:root[data-theme="light"] .sheet-scrim { background: rgba(15, 23, 42, 0.35); }
@media (min-width: 900px) { :root[data-theme="light"] .sheet-scrim { background: transparent; } }
:root[data-theme="light"] .mic { background: #e8f7f0; color: #065f46; }
:root[data-theme="light"] .mic.is-paused, :root[data-theme="light"] .mic.is-editing, :root[data-theme="light"] .mic.is-arming { background: #eef0f3; color: #475569; }
:root[data-theme="light"] .mic.is-playing { background: #fef6e0; color: #92400e; }
:root[data-theme="light"] .mic.is-loud { background: #fdecec; color: #b91c1c; }
:root[data-theme="light"] .pnote { background: #eef0f3; color: #334155; }
:root[data-theme="light"] .rail-sq { background: #cbd5e1; }
:root[data-theme="light"] .rail-sq.done { background: #047857; }
:root[data-theme="light"] .rail-sq.up { background: #d97706; }
:root[data-theme="light"] .rail-sq.failed { background: #dc2626; }
:root[data-theme="light"] .rail-legend { color: #334155; }
:root[data-theme="light"] .rail-sq.now { box-shadow: 0 0 0 2px #0f172a; }
:root[data-theme="light"] .bl-row { border-color: #dbe3ee; background: #fff; }
:root[data-theme="light"] .bl-row.now { background: #e6f4ee; border-color: #047857; box-shadow: inset 4px 0 0 #047857; }
:root[data-theme="light"] .bl-text { color: #0f172a; }
:root[data-theme="light"] .bl-known, :root[data-theme="light"] .bl-num, :root[data-theme="light"] .bl-legend, :root[data-theme="light"] .bl-head { color: #475569; }
:root[data-theme="light"] .bl-dot { background: #cbd5e1; }
:root[data-theme="light"] .bl-dot.done { background: #047857; }
:root[data-theme="light"] .bl-dot.up { background: #d97706; }
:root[data-theme="light"] .bl-dot.failed { background: #dc2626; }
:root[data-theme="light"] .bl-play { background: #047857; color: #fff; }
:root[data-theme="light"] .grid-toggle { color: #0f172a; border-color: #c9d8ea; background: #fff; }
:root[data-theme="light"] .sp-row .ctl-pause { background: #047857; }
:root[data-theme="light"] .sp-row .ctl-pause.paused { background: #a85508; }
:root[data-theme="light"] .sp-row .btn-finish { background: #b91c1c; }

/* WHITE ON EVERY GREEN BUTTON, light AND dark (Aran, 2026-10-14 job #411, extended 2026-10-15 job #700:
   dark text on bright green "did not read well"). Fixed emerald-700 #047857, not --accent-2, which is
   mint (#34d399) in dark mode. #fff on #047857 is 5.48:1, WCAG AA for any text size. */
.btn-begin, .ctl-next, .volume-btn.on, .sheet-close { background: #047857; color: #fff; }

/* ── ON A PHONE (Aran, 2026-10-15, job #834: Dan, Eleri and Catrin may record on phones) ──────────
   Measured in Chromium and WebKit at 375x667, 390x844, 360x800 and 844x390 by
   e2e/booth-mobile/audit.mjs. Layout only: no button changes what it does. */

/* EVERY TAP TARGET AT LEAST 44px (Apple's minimum, WCAG 2.5.5). These were 26–40px. */
.where-home { min-width: 44px; min-height: 44px; }
.where-more { min-height: 44px; }
.hidden-toggle, .setline-change { min-height: 44px; padding-left: 0.35rem; padding-right: 0.35rem; }
.ready-where .setline-change { min-height: 44px; }
.recordist.fit .stage-auto { min-height: 44px; padding-top: 0; padding-bottom: 0; }
.sheet-close, .grid-toggle, .rc-nav-item, .redo-btn { min-height: 44px; }
.rc-nav-item { line-height: 44px; }
.cmp-btn { min-height: 44px; }
.listen-actions :deep(.stored-take-btn) { min-height: 44px; }
@media (max-width: 480px) {
  .where-more { width: 44px; min-height: 44px; }
}

/* A LONG WORD WRAPS INSIDE THE SCREEN. A compound or place name wider than a phone
   (Llanfairpwllgwyngyll…) ran off the right edge of the line being read, with no way to see
   the end of it. Breaking inside a word only ever happens when the word cannot fit whole. */
.line-target, .ready-line, .line-known, .listen-text, .redo-text, .edit-box { overflow-wrap: anywhere; }

/* A LINE TALLER THAN THE SPACE LEFT FOR IT SCROLLS; IT NEVER OVERPRINTS. The column's items were
   free to shrink below their own text, so on a short phone (an SE with Safari's bars showing, or a
   refused-line bar above) a long line was drawn over the cue lines around it and under the bar.
   Each item now keeps its height and the column scrolls, from the top, as the rule above intends. */
.centre-line > * { flex-shrink: 0; }
.refused-go { min-height: 44px; padding: 0 0.35rem; margin: -0.6rem 0; } /* a 44px target in a bar that stays slim */

/* A SHORT SCREEN WHILE THE MIC IS LIVE (an iPhone SE in Safari shows ~548px). Every row above and
   below the line gives back what it can without a target dropping under 44px: the where-am-I row
   holds no button while live, the waveform strip is a little shorter (still drawn), and the
   transport's buttons come down to 44–48px. */
@media (max-height: 640px) {
  .where.live { min-height: 32px; padding-top: 0.15rem; padding-bottom: 0.15rem; }
  .recordist.fit .mic .meter { height: 30px; }
  .recordist.fit .mic-row { padding-top: 0.25rem; }
  .recordist.fit .sp-row { margin-bottom: 0.45rem; }
  .recordist.fit .sp-row .btn-finish, .recordist.fit .sp-row .ctl-pause { min-height: 44px; }
  .recordist.fit .transport .ctl-back, .recordist.fit .transport .ctl-again, .recordist.fit .transport .ctl-next { min-height: 48px; }
  .recordist.fit .ctl-jump { margin-top: 0.4rem; }
  .recordist.fit .transport { padding-top: 0.45rem; }
  .recordist.fit .cue-before { margin-bottom: 0.35rem; }
  .recordist.fit .line-kind { margin-bottom: 0.3rem; }
  .recordist.fit .refused-summary { margin-bottom: 0.2rem; }
  .recordist.fit .centre-line { padding-top: 0.4rem; }
}

/* A PHONE ON ITS SIDE (844x390 and the like). Stacked, the rows above the line and the transport
   below it used the whole 390px: the line being read was not on screen at all. Here the line has
   the left of the screen, and the right is a column holding — live — the count, the waveform and
   the auto-advance switch above Stop/Pause, Again ‹ › and Jump; before Start and on the done
   screen, just their buttons. Same buttons, same order. The keyboard hint goes: a phone has no
   keyboard to hint at. */
@media (orientation: landscape) and (max-height: 500px) {
  .recordist.fit {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(16rem, 38%);
    grid-template-rows: auto auto auto minmax(0, 1fr);
    grid-template-areas: "banner status" "where mic" "note adv" "body transport";
  }
  .recordist.fit > .safety-banner { grid-area: banner; }
  .recordist.fit > .where { grid-area: where; }
  .recordist.fit > .hidden-note { grid-area: note; }
  .recordist.fit > .status { grid-area: status; border-left: 1px solid var(--line, #334155); }
  .recordist.fit > .mic-row { grid-area: mic; border-left: 1px solid var(--line, #334155); }
  .recordist.fit > .stage-auto { grid-area: adv; border-left: 1px solid var(--line, #334155); }
  .recordist.fit > .fit-body { grid-area: body; min-height: 0; }
  .recordist.fit > .transport {
    grid-area: transport; min-height: 0; overflow-y: auto;
    display: flex; flex-direction: column; justify-content: center;
    border-top: 0; border-left: 1px solid var(--line, #334155);
    padding-right: calc(0.75rem + env(safe-area-inset-right, 0px));
  }
  /* Off the stage there is nothing above the buttons on the right: they get the whole height. */
  .recordist.fit:not(.live) > .transport { grid-row: 1 / -1; }
  .recordist.fit .transport .sp-row, .recordist.fit .transport .transport-in, .recordist.fit .transport .ctl-jump { width: 100%; }
  .recordist.fit .kbd-hint { display: none; }
  /* A wide phone on its side (932x430) is past the desktop width: no rail column there either. */
  .rail-wrap { display: none; }
  .recordist.fit.has-rail { padding-left: 0; }
  /* The left column is narrow enough that "Lines & settings" cut the where-am-I words: ☰, as on a phone held upright. */
  .where-more { padding: 0; width: 44px; }
  .wm-long { display: none; }
  .wm-short { display: inline; }
  /* …and even then a phrase batch's words ("Test Language · Course · Phrases · pass 1 · batch 2 of 3
     · …") were cut at "batc…" (job #203's audit at 844x390). Two lines, a little smaller, fit the
     44px row; the words are what tell him which batch he is in, so they are not cut. */
  .where-words {
    white-space: normal; text-overflow: clip; font-size: 0.8rem; line-height: 1.2;
    display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; line-clamp: 2;
  }
  /* The done screen's two buttons, one above the other in the side column. */
  .recordist.fit .transport-in:not(.live) { grid-template-columns: 1fr; }
  :root[data-theme="light"] .recordist.fit > .transport, :root[data-theme="light"] .recordist.fit > .status,
  :root[data-theme="light"] .recordist.fit > .mic-row, :root[data-theme="light"] .recordist.fit > .stage-auto { border-left-color: #c9d8ea; }
}

/* THE LINES LIST ON A PHONE: a recorded row's ▶ and Again sat beside the words and squeezed a long
   line into a column a third of the sheet wide. The words keep at least 14rem; when that and the
   buttons do not fit side by side, the buttons drop under the words. */
.bl-row { flex-wrap: wrap; }
.bl-go { flex: 1 1 14rem; }
.bl-row > .bl-play, .bl-row > .bl-again { margin-bottom: 0.35rem; margin-top: 0.35rem; }
.bl-go + .bl-play, .bl-go + .bl-again { margin-left: auto; }
</style>
