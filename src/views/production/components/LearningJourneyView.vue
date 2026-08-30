<template>
  <div class="learning-journey-view">
    <!-- Stats Header -->
    <div v-if="stats" class="stats-bar bg-surface border border-line rounded-lg p-4 mb-6">
      <div class="flex flex-wrap gap-6">
        <div class="stat-item">
          <span class="text-muted text-sm">Rounds</span>
          <span class="text-ink font-bold text-lg ml-2">{{ stats.roundsGenerated }}</span>
        </div>
        <div class="stat-item">
          <span class="text-muted text-sm">Total Items</span>
          <span class="text-ink font-bold text-lg ml-2">{{ stats.totalItems }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label-audio text-emerald-400 text-sm">With Audio</span>
          <span class="stat-val-audio text-emerald-300 font-bold text-lg ml-2">{{ stats.itemsWithAudio }}</span>
        </div>
        <div v-if="stats.itemsMissingAudio > 0" class="stat-item">
          <span class="stat-label-missing text-amber-400 text-sm">Missing Audio</span>
          <span class="stat-val-missing text-amber-300 font-bold text-lg ml-2">{{ stats.itemsMissingAudio }}</span>
        </div>
        <!-- What the live player cannot deliver from the intended script.
             Everything stays visible; this is the count of flagged rows. -->
        <div v-if="(stats.itemsPlayerCannotDeliver || 0) > 0" class="stat-item">
          <span class="stat-label-undeliverable text-amber-400 text-sm">Player can't deliver</span>
          <span
            class="stat-val-undeliverable text-amber-300 font-bold text-lg ml-2"
            :title="`${stats.itemsPlayerCannotDeliver} rows in this window are flagged: the live player skips them today. They are still shown.`"
          >{{ stats.itemsPlayerCannotDeliver }}</span>
          <span v-if="(stats.roundsPlayerDrops || 0) > 0" class="text-amber-400 text-sm ml-2">
            and {{ stats.roundsPlayerDrops }} round{{ stats.roundsPlayerDrops === 1 ? ' has' : 's have' }} nothing playable
          </span>
        </div>
        <!-- Learner view: how much content is hidden because audio is missing -->
        <div v-if="stats.learnerView" class="stat-item">
          <span class="stat-label-audio text-emerald-400 text-sm">Learner view</span>
          <span class="stat-val-audio text-emerald-300 text-sm ml-2">
            {{ (stats.phrasesDroppedForAudio || 0) }} phrases awaiting audio skipped — every round keeps its number
          </span>
        </div>
        <div class="stat-item ml-auto">
          <span class="text-muted text-sm">Generated in</span>
          <span class="text-ink text-lg ml-2">{{ stats.generationTimeMs }}ms</span>
        </div>
      </div>
    </div>

    <!-- Controls Row: Legend (Expand/Collapse moved to parent when hideControls) -->
    <div class="controls-row flex items-center justify-between mb-6">
      <!-- Item Type Legend -->
      <div class="legend flex flex-wrap gap-4 text-sm">
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full bg-purple-500"></span>
          <span class="text-ink">Intro</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full bg-emerald-500"></span>
          <span class="text-ink">LEGO</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full bg-blue-500"></span>
          <span class="text-ink">BUILD</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full bg-amber-500"></span>
          <span class="text-ink">REVIEW</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full bg-cyan-500"></span>
          <span class="text-ink">CONSOLIDATE</span>
        </div>
      </div>

      <!-- Expand/Collapse Buttons (only shown when controls not hidden) -->
      <div v-if="!hideControls" class="expand-collapse-btns flex gap-2">
        <button
          @click="collapseAll"
          class="px-3 py-1.5 text-sm text-ink hover:text-ink bg-surface-2 hover:bg-surface-3 rounded transition-colors"
        >
          Collapse All
        </button>
        <button
          @click="expandAll"
          class="px-3 py-1.5 text-sm text-ink hover:text-ink bg-surface-2 hover:bg-surface-3 rounded transition-colors"
        >
          Expand All
        </button>
      </div>
    </div>

    <!-- Rounds List -->
    <div class="rounds-list space-y-4">
      <div
        v-for="round in rounds"
        :key="round.roundNumber"
        :id="`journey-round-${round.roundNumber}`"
        class="round-card bg-surface border border-line rounded-lg overflow-hidden transition-shadow"
        :class="{ 'ring-2 ring-emerald-400': highlightedRound === round.roundNumber }"
      >
        <!-- Round Header -->
        <div
          class="round-header px-4 py-3 bg-surface-2 flex items-center justify-between cursor-pointer"
          @click="toggleRound(round.roundNumber)"
        >
          <div class="flex items-center gap-4">
            <!-- Play Round Button -->
            <button
              v-if="hasPlayableItems(round)"
              class="play-round-btn w-8 h-8 flex items-center justify-center rounded-full transition-colors"
              :class="isRoundPlaying(round.roundNumber)
                ? 'bg-emerald-500 text-white'
                : 'bg-surface-3 bg-opacity-50 text-white hover:bg-emerald-500 hover:text-white'"
              :title="`Play Round ${round.roundNumber}`"
              @click.stop="playRound(round)"
            >
              <svg v-if="isRoundPlaying(round.roundNumber) && player.isPlaying.value" class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
              </svg>
              <svg v-else class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </button>

            <div
              class="round-number bg-surface-3 text-ink px-3 py-1 rounded-full text-sm font-mono"
              :title="roundNumberTitle(round)"
            >
              R{{ round.roundNumber }}
            </div>
            <div class="lego-info">
              <span class="lego-id-text text-emerald-400 font-mono text-sm">{{ round.legoId }}</span>
            </div>

            <!-- Player-delivery flag: only when the round has NOTHING the
                 player can play. An audio gap costs the cycle, not the round —
                 the round keeps its number and plays what it has. -->
            <span
              v-if="round.playerDelivers === false"
              class="round-undeliverable-badge text-xs px-2 py-0.5 rounded border border-amber-700 bg-amber-900/30 text-amber-300 whitespace-nowrap"
              :title="roundFlagTitle(round)"
            >⚠ nothing playable in this round yet</span>
            <span
              v-else-if="(round.undeliverableItemCount || 0) > 0"
              class="round-partial-badge text-xs px-2 py-0.5 rounded border border-line text-muted whitespace-nowrap"
              :title="roundPartialTitle(round)"
            >{{ round.undeliverableItemCount }} cycle{{ round.undeliverableItemCount === 1 ? '' : 's' }} skipped for audio</span>
            <!-- LEGO Text: known = target -->
            <div class="lego-text text-ink text-sm">
              <span class="text-muted">{{ getLegoKnownText(round) }}</span>
              <span class="text-faint mx-2">=</span>
              <span class="text-ink">{{ getLegoTargetText(round) }}</span>
            </div>
          </div>

          <div class="flex items-center gap-4">
            <!-- Spaced Rep Indicators -->
            <div v-if="round.spacedRepReviews.length > 0" class="spaced-rep-badges flex gap-1">
              <span
                v-for="reviewIdx in round.spacedRepReviews.slice(0, 5)"
                :key="reviewIdx"
                class="px-2 py-0.5 bg-amber-600 text-white text-xs rounded font-mono"
                :title="`Reviewing R${reviewIdx}`"
              >
                R{{ reviewIdx }}
              </span>
              <span
                v-if="round.spacedRepReviews.length > 5"
                class="px-2 py-0.5 bg-surface-3 text-muted text-xs rounded"
              >
                +{{ round.spacedRepReviews.length - 5 }}
              </span>
            </div>

            <div class="item-count text-muted text-sm">
              {{ round.itemCount }} items
            </div>

            <!-- Approval-gate standing for this round. Machines may flag
                 audio; only humans may pass it, so this badge only ever goes
                 green off the back of a recorded human play-through. -->
            <span
              v-if="qaStatus.get(round.roundNumber)"
              class="qa-badge text-xs px-2 py-0.5 rounded border"
              :class="qaBadgeClass(qaStatus.get(round.roundNumber))"
              :title="qaBadgeTitle(qaStatus.get(round.roundNumber))"
            >{{ qaBadgeLabel(qaStatus.get(round.roundNumber)) }}</span>

            <!-- Open this round in the real learning app — leaves Popty -->
            <button
              class="open-round-btn w-6 h-6 flex items-center justify-center rounded text-muted hover:text-ink hover:bg-surface-3 transition-colors text-base leading-none"
              title="Open this round in the learning app"
              @click.stop="openRoundInLearningApp(round)"
            >&nearr;</button>

            <svg
              class="w-5 h-5 text-muted transition-transform"
              :class="{ 'rotate-180': expandedRounds.has(round.roundNumber) }"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        <!-- Round Items (Collapsible) -->
        <Transition name="slide">
          <div v-if="expandedRounds.has(round.roundNumber)" class="round-items p-4 space-y-2">
            <template v-for="(item, idx) in round.items" :key="`${round.roundNumber}-${idx}`">
            <!-- SPACED-REVIEW SLOT (Tom, 2026-08-30: "the spaced rep part of the
                 script should JUST show the LEGO ID and its basket of USE
                 phrases as a clickable expand"). What is determined about this
                 slot is the LEGO and the basket; WHICH phrase a learner draws is
                 a per-learner draw, so no phrase is shown here as if it were the
                 script. Tap to expand — nothing else, no other control. -->
            <div v-if="item.reviewItemKind === 'basket'" class="basket-slot">
              <div
                class="item-row flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer hover:bg-surface-2"
                :class="item.playerCanDeliver === false ? 'border-l-2 border-amber-600' : ''"
                @click="toggleBasket(round.roundNumber, idx)"
              >
                <div class="w-7 h-7 flex-shrink-0 flex items-center justify-center text-muted">
                  <svg
                    class="w-4 h-4 transition-transform"
                    :class="{ 'rotate-180': expandedBaskets.has(`${round.roundNumber}-${idx}`) }"
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                <div class="type-badge px-2 py-1 rounded text-xs font-medium uppercase min-w-20 text-center bg-amber-600 text-white">
                  REVIEW
                </div>
                <div
                  class="review-badge px-2 py-1 bg-amber-600 text-white text-xs rounded font-mono font-bold"
                  :title="`Reviewing Round ${item.reviewOf}`"
                >
                  R{{ item.reviewOf }}
                </div>
                <div class="lego-badge px-2 py-1 bg-surface-3 text-ink text-sm rounded font-mono">
                  {{ item.legoId }}
                </div>
                <div class="flex-1 min-w-0 text-sm text-muted truncate">
                  {{ item.known_text }} → {{ item.target_text }}
                </div>
                <div class="text-xs text-faint whitespace-nowrap">
                  {{ item.drawCount === 1 ? '1 draw' : `${item.drawCount} draws` }}
                  from {{ item.basketSize }} USE {{ item.basketSize === 1 ? 'phrase' : 'phrases' }}
                </div>
                <span
                  v-if="item.basketMissingAudio"
                  class="text-amber-400 text-xs whitespace-nowrap"
                  :title="`${item.basketMissingAudio} phrase(s) in this basket have no audio`"
                >
                  {{ item.basketMissingAudio }} silent
                </span>
              </div>
              <!-- The basket itself: the whole candidate set a draw lands in. -->
              <div
                v-if="expandedBaskets.has(`${round.roundNumber}-${idx}`)"
                class="basket-phrases ml-10 mt-1 mb-2 border-l border-surface-3 pl-3 space-y-1"
              >
                <div
                  v-for="(p, pi) in item.basket"
                  :key="`${round.roundNumber}-${idx}-b${pi}`"
                  class="flex items-center gap-3 text-sm py-1"
                >
                  <span class="text-faint font-mono text-xs w-6 text-right">{{ pi + 1 }}</span>
                  <span class="text-muted flex-1 min-w-0 truncate">{{ p.known_text }}</span>
                  <span class="text-ink flex-1 min-w-0 truncate" :dir="dirFor(p.target_text)">{{ p.target_text }}</span>
                  <span v-if="!p.hasAudio" class="text-amber-400 text-xs whitespace-nowrap">no audio</span>
                </div>
              </div>
            </div>
            <div
              v-else
              :ref="el => setItemRef(round.roundNumber, idx, el)"
              class="item-row flex items-center gap-3 p-3 rounded-lg transition-all"
              :class="[
                getItemBgClass(item),
                isItemPlaying(round.roundNumber, idx) ? 'ring-2 ring-emerald-400 bg-emerald-900 bg-opacity-20' : 'hover:bg-surface-2',
                item.playerCanDeliver === false ? 'border-l-2 border-amber-600' : ''
              ]"
            >
              <!-- Play Item Button -->
              <button
                v-if="item.hasAudio"
                class="play-item-btn w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full transition-colors"
                :class="isItemPlaying(round.roundNumber, idx)
                  ? 'bg-emerald-500 text-white'
                  : 'bg-surface-3 text-muted hover:bg-emerald-500 hover:text-white'"
                :title="isItemPlaying(round.roundNumber, idx) ? 'Playing...' : 'Play from here'"
                @click="playFromItem(round, idx)"
              >
                <svg v-if="isItemPlaying(round.roundNumber, idx) && player.isPlaying.value" class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                </svg>
                <svg v-else class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </button>
              <!-- No-audio placeholder to keep alignment -->
              <div v-else class="w-7 h-7 flex-shrink-0"></div>

              <!-- Item Type Badge -->
              <div
                class="type-badge px-2 py-1 rounded text-xs font-medium uppercase min-w-20 text-center"
                :class="getTypeBadgeClass(item.type)"
              >
                {{ formatItemType(item.type, item.phrasePosition, item.consolidateIndex) }}
              </div>

              <!-- Review Badge - shows which round is being reviewed -->
              <div
                v-if="item.type === 'review'"
                class="review-badge px-2 py-1 bg-amber-600 text-white text-xs rounded font-mono font-bold"
                :title="`Reviewing Round ${item.reviewOf}`"
              >
                R{{ item.reviewOf }}
              </div>

              <!-- Content: known -> target, OR the literal gloss alignment.
                   This is a FLIP, not an expansion (Tom, 2026-08-12: "I don't
                   want to make the row deeper"). Both states occupy the same
                   fixed height, so opening an alignment never moves the rows
                   below it. -->
              <div class="item-content flex-1 min-w-0">
                <!-- The alignment. Each TARGET word is a fixed column in the
                     target's own order, with the literal gloss chunk sitting
                     directly underneath the column(s) it covers. The known side
                     reads wrong when the orders differ, and that is the point
                     (Tom: "cosa azul = blue thing maps literally to thing
                     blue"). Nothing here is ever reordered. -->
                <div
                  v-if="isMappingOpen(round.roundNumber, idx)"
                  class="mapping-grid"
                  @click.stop
                >
                  <template v-for="chunk in glossChunks(round.roundNumber, idx, item)" :key="`c${chunk.index}`">
                    <div class="mapping-col">
                      <!-- Target line: one cell per target word, always, in the
                           target's own order. Between two words of the SAME
                           chunk sits a split control — tap it to cut the chunk
                           exactly there. -->
                      <div class="mapping-target-line">
                        <template v-for="(w, wi) in chunk.words" :key="`w${w.col}`">
                          <button
                            v-if="wi > 0 && canEditMapping"
                            type="button"
                            class="mapping-split"
                            title="Split the gloss here"
                            @click="splitChunk(round.roundNumber, idx, item, chunk.index, wi)"
                          >&#8942;</button>
                          <span v-else-if="wi > 0" class="mapping-split-static">&#8942;</span>
                          <span class="mapping-word">{{ w.text }}</span>
                        </template>
                      </div>
                      <!-- Gloss line: the chunk's known words, centred under all
                           the target words it covers. A chunk spanning two
                           target words visibly spans both — that is many-to-one,
                           read at a glance.

                           Each known word is its own TILE. Tap one to pick it
                           up and every place it could go opens as a landing
                           slot — under any column, in any order (Tom,
                           2026-08-14: "we need to be able to move any known tile
                           to match any target tile and change the order of the
                           known words as well"). Drag does the same for a mouse;
                           nothing needs it. The target line above has no tiles,
                           no slots and no drag: it never moves. -->
                      <div
                        class="mapping-gloss"
                        :class="{ 'mapping-gloss-empty': !chunk.known }"
                        :title="chunkTitle(chunk)"
                      >
                        <template v-if="canEditMapping">
                          <span
                            v-if="isPlacing(round.roundNumber, idx)"
                            class="mapping-slot"
                            title="Put the tile here"
                            @click.stop="dropTile(round.roundNumber, idx, item, chunk.index, 0)"
                            @dragover.prevent
                            @drop="dropDragged($event, round.roundNumber, idx, item, chunk.index, 0)"
                          ></span>
                          <template v-for="t in chunk.tiles" :key="`t${chunk.index}-${t.at}`">
                            <button
                              type="button"
                              class="mapping-tile"
                              :class="{ 'mapping-tile-picked': isPicked(round.roundNumber, idx, chunk.index, t.at) }"
                              :title="isPicked(round.roundNumber, idx, chunk.index, t.at)
                                ? 'Tap where it should go, or tap it again to put it back'
                                : `Move &quot;${t.text}&quot;`"
                              draggable="true"
                              @click.stop="pickTile(round.roundNumber, idx, chunk.index, t.at)"
                              @dragstart="dragTile($event, round.roundNumber, idx, chunk.index, t.at)"
                            >{{ t.text }}</button>
                            <span
                              v-if="isPlacing(round.roundNumber, idx)"
                              class="mapping-slot"
                              title="Put the tile here"
                              @click.stop="dropTile(round.roundNumber, idx, item, chunk.index, t.at + 1)"
                              @dragover.prevent
                              @drop="dropDragged($event, round.roundNumber, idx, item, chunk.index, t.at + 1)"
                            ></span>
                          </template>
                          <!-- A column with no gloss on it is legal and stays
                               visible, so a tile can be brought to it. -->
                          <span
                            v-if="!chunk.tiles.length && !isPlacing(round.roundNumber, idx)"
                            class="mapping-gloss-dot"
                          >&middot;</span>
                        </template>
                        <template v-else>{{ chunk.known || '·' }}</template>
                      </div>
                    </div>
                    <!-- The divider AFTER this chunk: merge it with the next.
                         The two arrows that used to sit here moved one gloss
                         word across this one break; a tile can now be taken to
                         any column at all, so they said less than a tap does.
                         Always visible, never hover-gated — this has to work on
                         a tap. -->
                    <div v-if="chunk.hasDividerAfter" class="mapping-divider">
                      <button
                        v-if="canEditMapping"
                        type="button" class="mapping-merge"
                        title="Merge these two chunks"
                        @click="mergeChunk(round.roundNumber, idx, item, chunk.index)"
                      >&#9679;</button>
                    </div>
                  </template>
                  <!-- The way out. Only on a row a human has actually cut, and
                       only for someone who may edit — a row already showing the
                       original has nothing to go back to. It lives at the end of
                       the chunk row, inside the strip: the closed row gains
                       nothing at all, and the strip's height is fixed, so this
                       costs no pixels either way (Tom: "I don't want to make the
                       row deeper"). One tap, no confirm — it loses a few taps of
                       work and is instantly redoable. -->
                  <button
                    v-if="canEditMapping && isHandSegmented(round.roundNumber, idx, item)"
                    type="button"
                    class="mapping-revert"
                    title="Put this row's mapping back to the original"
                    @click="revertMapping(round.roundNumber, idx, item)"
                  >back to the original</button>
                </div>
                <!-- Normal one-line row -->
                <div v-else class="flex gap-4 items-center mapping-oneline">
                  <span class="text-muted truncate flex-1">{{ item.known_text }}</span>
                  <span class="text-faint">&rarr;</span>
                  <span
                    class="text-ink truncate flex-1 text-left"
                    :dir="dirFor(item.target_text)"
                    style="unicode-bidi: isolate"
                  >{{ item.target_text }}</span>
                </div>
              </div>

              <!-- Save feedback for a re-segmentation. Plain sentences only — the
                   reader is a course editor, not an engineer. -->
              <span
                v-if="mappingStatus(round.roundNumber, idx)"
                class="mapping-status flex-shrink-0 text-xs px-2 py-0.5 rounded whitespace-nowrap"
                :class="mappingStatus(round.roundNumber, idx)!.ok
                  ? 'text-emerald-300 bg-emerald-900/30'
                  : 'text-amber-200 bg-amber-900/40'"
              >{{ mappingStatus(round.roundNumber, idx)!.message }}</span>

              <!-- Player-delivery flag, only where nothing else on the row says
                   it. Missing phrase audio already shows as a dropped play
                   button and an amber triangle, so a chip repeating it would be
                   noise; an intro whose narration is missing looks healthy on
                   the row, so it needs saying. -->
              <span
                v-if="item.playerDropReason === 'intro-audio'"
                class="item-undeliverable-badge flex-shrink-0 text-xs px-2 py-0.5 rounded border border-amber-700 bg-amber-900/30 text-amber-300 whitespace-nowrap"
                :title="itemFlagTitle(item)"
              >⚠ {{ itemFlagLabel(item) }}</span>

              <!-- Edit & Flag Buttons -->
              <div class="edit-flags flex items-center gap-1 flex-shrink-0">
                <!-- Check mapping — M-LEGO INTRO rows only (Tom, 2026-08-13:
                     "it's only the INTROS that need mapping - no regular phrases
                     need the mapping", and "A-LEGOs can't be mappable by
                     definition"). The intro's mapping is what the learner's tile
                     assembler renders; a phrase row's is read by nobody, so the
                     glyph there was work with no destination. The generator
                     attaches `mapping` to M-LEGO intros alone, and this guard
                     says the intro half at the point of use as well. -->
                <button
                  v-if="item.mapping && item.type === 'intro'"
                  class="mapping-btn w-6 h-6 flex items-center justify-center rounded transition-colors"
                  :class="isMappingOpen(round.roundNumber, idx)
                    ? 'bg-sky-500 text-white'
                    : 'text-faint hover:text-ink hover:bg-surface-3'"
                  title="Check mapping"
                  @click.stop="toggleMapping(round.roundNumber, idx)"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h6M14 6h6M4 18h6m4 0h6M10 6l4 12M14 6l-4 12" />
                  </svg>
                </button>
                <!-- Pencil edit button — LEGO text (debut) is NOT editable; only phrases -->
                <button
                  v-if="item.type !== 'debut'"
                  class="w-6 h-6 flex items-center justify-center rounded text-faint hover:text-ink hover:bg-surface-3 transition-colors"
                  title="Edit text"
                  @click.stop="emit('item-edit', item)"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <!-- Presentation (intro narration) edit + regen -->
                <button
                  v-if="item.type === 'intro'"
                  class="w-6 h-6 flex items-center justify-center rounded text-purple-400 hover:text-white hover:bg-purple-500 hover:bg-opacity-30 transition-colors"
                  title="Edit intro narration & regenerate audio"
                  @click.stop="emit('presentation-edit', item)"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-14 0m7 7v3m0-3a4 4 0 01-4-4V7a4 4 0 118 0v7a4 4 0 01-4 4z" />
                  </svg>
                </button>
                <!-- LEGO (debut) AUDIO regen — text stays locked, punctuation goes to the TTS job only -->
                <button
                  v-if="item.type === 'debut'"
                  class="w-6 h-6 flex items-center justify-center rounded text-purple-400 hover:text-white hover:bg-purple-500 hover:bg-opacity-30 transition-colors"
                  title="Regenerate LEGO audio (text is locked)"
                  @click.stop="emit('lego-audio-edit', item)"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-14 0m7 7v3m0-3a4 4 0 01-4-4V7a4 4 0 118 0v7a4 4 0 01-4 4z" />
                  </svg>
                </button>
                <!-- Voice 1 (target1) — play -->
                <button
                  v-if="item.target1_audio_uuid"
                  class="h-5 px-1.5 flex items-center gap-0.5 rounded text-xs font-semibold transition-colors"
                  :class="playingTrackUuid === item.target1_audio_uuid ? 'bg-emerald-500 text-white' : 'text-muted hover:text-ink hover:bg-surface-3'"
                  title="Play Voice 1"
                  @click.stop="playTrack(item.target1_audio_uuid!)"
                >
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 7a3 3 0 11-6 0 3 3 0 016 0zM6 20a6 6 0 0112 0"/></svg>
                  1
                </button>
                <!-- Voice 2 (target2) — play -->
                <button
                  v-if="item.target2_audio_uuid"
                  class="h-5 px-1.5 flex items-center gap-0.5 rounded text-xs font-semibold transition-colors"
                  :class="playingTrackUuid === item.target2_audio_uuid ? 'bg-emerald-500 text-white' : 'text-muted hover:text-ink hover:bg-surface-3'"
                  title="Play Voice 2"
                  @click.stop="playTrack(item.target2_audio_uuid!)"
                >
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 7a3 3 0 11-6 0 3 3 0 016 0zM6 20a6 6 0 0112 0"/></svg>
                  2
                </button>
                <!-- Trash/flag phrase for deletion -->
                <button
                  v-if="item.phrase_id"
                  class="w-6 h-6 flex items-center justify-center rounded text-xs transition-colors"
                  :class="flaggedPhraseIds.has(item.phrase_id!) ? 'bg-red-500 text-white' : 'text-red-400 hover:bg-red-500 hover:bg-opacity-20'"
                  :title="flaggedPhraseIds.has(item.phrase_id!) ? 'Unflag phrase' : 'Flag phrase for deletion'"
                  @click.stop="emit('phrase-flag', item)"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                </button>
                <!-- Open this cycle in the real learning app — leaves Popty -->
                <button
                  class="open-cycle-btn w-6 h-6 flex items-center justify-center rounded text-muted hover:text-ink hover:bg-surface-3 transition-colors text-base leading-none"
                  title="Open the learning app from here"
                  @click.stop="openRoundInLearningApp(round, idx + 1)"
                >&nearr;</button>
              </div>

              <!-- Phase indicator when this item is playing -->
              <div v-if="isItemPlaying(round.roundNumber, idx)" class="phase-indicator flex gap-1">
                <span
                  v-for="phase in ['prompt', 'pause', 'voice1', 'voice2']"
                  :key="phase"
                  class="w-2 h-2 rounded-full transition-colors"
                  :class="player.currentPhase.value === phase ? 'bg-emerald-400' : 'bg-surface-3'"
                  :title="phase"
                ></span>
              </div>

              <!-- Audio Status (only show when NOT playing this item).
                   Green means the LIVE PLAYER can deliver the row, not merely
                   that Popty's preview has something to play — a row whose
                   second target voice is missing previews fine here and is
                   dropped by the player, so playerCanDeliver decides. -->
              <div v-else class="audio-status flex gap-2">
                <span
                  v-if="item.playerCanDeliver !== undefined ? item.playerCanDeliver : item.hasAudio"
                  class="audio-ok-icon text-emerald-400"
                  title="Audio available — the player delivers this row"
                >
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                  </svg>
                </span>
                <span
                  v-else
                  class="audio-missing-icon text-amber-400"
                  :title="item.playerCanDeliver === false ? itemFlagTitle(item) : 'Audio missing'"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                  </svg>
                </span>
              </div>

              <!-- LEGO Badge (for review items showing which LEGO) -->
              <div
                v-if="item.type === 'review' && item.legoId !== round.legoId"
                class="lego-badge px-2 py-1 bg-surface-3 text-ink text-xs rounded font-mono"
              >
                {{ item.legoId }}
              </div>
            </div>
            </template>
          </div>
        </Transition>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="rounds.length === 0 && !isLoading" class="empty-state text-center py-12">
      <svg class="w-16 h-16 mx-auto text-faint mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
      </svg>
      <h3 class="text-lg font-medium text-muted">No Learning Journey Data</h3>
      <p class="text-faint mt-2">This course may not have any LEGOs or practice phrases yet.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useScriptPlayer } from '@/composables/useScriptPlayer'
import { getApiUrl } from '@/services/api'
import { useAuth } from '@/composables/useAuth.js'
import { dirFor } from '@/utils/textDirection.js'
import { buildLearningAppUrl } from '@/utils/learningAppUrl'
import { qaGate } from '@/services/qaGate'
// The one rule for what a tap does lives in src/utils/glossPlacement.ts,
// pure and unit tested — it is the only thing that rewrites a segmentation.
import { moveGlossWord, type GlossSegment } from '@/utils/glossPlacement'

// Mirrors the learner session's cycle types: the generator emits ONLY
// intro/debut/build/review/consolidate. Component priming, listening clusters
// and pod laps are never played in the learner's main flow (Listening MODE
// and the per-learner pod scheduler own those) so Script View no longer
// projects them — see docs/voice-engine/script-divergence-report.md.
// The known↔target word mapping a row can show. Two stores feed it and they
// are NOT the same thing: a phrase row's stored per-chunk decomposition (what
// the player renders under the target text, and therefore what a wrong gloss
// reaches a learner through), or an M-LEGO's own component tiling.
// One chunk of the literal known-language gloss: the text, and how many
// consecutive TARGET-word columns it sits under. Spans always sum to the number
// of target words, so the grid can never claim more or fewer columns than the
// target actually has.
interface ItemMapping {
  source: 'phrase' | 'lego'
  // The target's own words, in the target's own order. These are the columns
  // and they are never edited or reordered.
  words: string[]
  segments: GlossSegment[]
  // false = derived from the LEGO-chunked breakdown, no human has cut it yet.
  segmented: boolean
}

interface ScriptItem {
  roundNumber: number
  legoId: string
  legoIndex: number
  seedId: string
  type: 'intro' | 'debut' | 'build' | 'review' | 'consolidate'
  phrase_id?: string
  known_text: string
  target_text: string
  hasAudio: boolean
  reviewOf?: number
  // A spaced-review row is a SLOT, not a sentence: 'basket' rows name the LEGO
  // and carry its whole USE basket, because which phrase a learner draws is a
  // per-learner draw. 'seed' rows are the full parent seed sentence and ARE
  // determined. (learning-script-generator.cjs, Tom's ruling 2026-08-30.)
  reviewItemKind?: 'seed' | 'basket'
  drawCount?: number
  basketSize?: number
  basketMissingAudio?: number
  basket?: Array<{
    phrase_id?: string
    known_text: string
    target_text: string
    hasAudio: boolean
  }>
  isFirstRevisit?: boolean
  fibonacciPosition?: number
  phrasePosition?: number
  consolidateIndex?: number
  known_audio_uuid?: string
  target1_audio_uuid?: string
  target2_audio_uuid?: string
  known_duration_ms?: number
  target1_duration_ms?: number
  target2_duration_ms?: number
  // Player-delivery annotation (learning-script-generator annotatePlayerDelivery).
  // The row is ALWAYS shown; these only say whether the live player can play it.
  playerCanDeliver?: boolean
  playerDropReason?: 'intro-audio' | 'debut-audio' | 'phrase-audio' | 'seed-audio'
  missingAudioRoles?: string[]
  // Present on M-LEGO INTRO rows only (Tom, 2026-08-13). An A-LEGO is a single
  // word on at least one side, so it cannot be split and never carries one.
  mapping?: ItemMapping | null
}

interface RoundData {
  roundNumber: number
  legoId: string
  legoIndex: number
  seedId: string
  legoType: string
  isNew: boolean
  items: ScriptItem[]
  spacedRepReviews: number[]
  itemCount: number
  playerDelivers?: boolean
  playerDropReason?: string
  missingAudioRoles?: string[]
  playerRoundNumber?: number | null
  undeliverableItemCount?: number
}

interface Stats {
  roundsGenerated: number
  totalItems: number
  itemsWithAudio: number
  itemsMissingAudio: number
  itemsPlayerCannotDeliver?: number
  roundsPlayerDrops?: number
  generationTimeMs: number
  graduatedSeeds?: number
  // Audio-gap toggle ("As the learner hears it") — set by the generator
  learnerView?: boolean
  phrasesDroppedForAudio?: number
}

const props = defineProps<{
  rounds: RoundData[]
  allItems: ScriptItem[]
  stats: Stats | null
  courseCode: string
  isLoading?: boolean
  hideControls?: boolean
  flaggedPhraseIds?: Set<string>
  // Whether THIS user may re-pair a mapping. A reader still sees the mapping;
  // only the editing gesture is withheld. Server-side is the real gate — this
  // just stops the UI offering something that would be refused.
  canEditMapping?: boolean
}>()

const emit = defineEmits<{
  'playback-state': [state: {
    isPlaying: boolean
    isPaused: boolean
    currentItem: any
    currentPhase: string | null
    currentIndex: number
    progress: number
    totalItems: number
  }]
  'item-edit': [item: ScriptItem]
  'presentation-edit': [item: ScriptItem]
  'lego-audio-edit': [item: ScriptItem]
  'phrase-flag': [item: ScriptItem]
}>()

// Default empty sets for optional props
const emptySet = new Set<string>()
const flaggedPhraseIds = computed(() => props.flaggedPhraseIds || emptySet)

// ── Gloss alignment: read it on the row, re-cut it there ──────────────────
// Deborah, reading Basque on 2026-08-12, saw the gloss on the wrong word and
// asked whether she could fix it herself. This is that.
//
// "Check mapping" flips the row's single line into an aligned grid: each TARGET
// word is a fixed column in the target's own order, and the literal gloss sits
// directly underneath the column(s) it covers. When the two languages order
// things differently the known side reads wrong, and that is deliberate —
// Tom, 2026-08-12: "word order of target must be preserved and known language
// will look wrong when the orders differ (cosa azul = blue thing maps literally
// to thing blue)." Nothing on either line is ever reordered.
//
// MOST rows need none of this. The alignment is DERIVED from the row's own
// components and 82% of them open already correct (Tom, 2026-08-14: "the
// DEFAULT mapping is auto-generated from the existing LEGO components - no
// human effort to create the initial alignment"). An editor who agrees with
// what they see taps nothing and saves nothing. Everything below is the REPAIR
// path, for the rows the derivation gets wrong.
//
// Repair is FREE PLACEMENT of the known tiles (Tom, 2026-08-14): "I need to be
// able to position any item in the known language underneath any item in the
// target language … we need to be able to move any known tile to match any
// target tile and change the order of the known words as well — but never the
// target words of course." So every gloss WORD is its own tile and can be put
// under any column, in any order, regardless of where it started:
//   tap a known tile          -> pick it up; every place it could go lights up
//   tap one of those places   -> it lands there, and the row saves
//   tap the tile again        -> put it back down, nothing happens
// Drag does the same thing for anyone on a mouse, but nothing needs a drag:
// Deborah works on a tablet and every control is always visible, never revealed
// on hover.
//
// The old segmentation gestures stay, because they change the COLUMN SPANS
// which free placement does not:
//   tap a gap inside a chunk  -> split it there
//   tap the divider dot       -> merge with the next chunk
// A chunk may cover several columns (many-to-one) or be empty beside a wide
// neighbour (one-to-many); neither needs a special case, both fall out of where
// the breaks are (Tom: "sometimes total word counts do not match and that is
// OK"). Every gesture saves immediately and can only MOVE the words already on
// the row — never add, drop or edit one, and never touch the known or target
// text, so nothing here can stale a clip, owe an audio pass, or reach a
// re-translate or a TTS render.
//
// The target row is never any of this: no tile in it is pickable, droppable or
// draggable, and no gesture reorders it.

const rowKey = (roundNumber: number, idx: number) => `${roundNumber}-${idx}`

// Same authed-fetch shape ScriptViewer uses for its phrase edits.
const { getAccessToken } = useAuth()
const mappingFetch = async (path: string, init: RequestInit = {}) => {
  const token = await getAccessToken()
  const headers: Record<string, string> = {
    'ngrok-skip-browser-warning': 'true',
    'Content-Type': 'application/json',
    ...((init.headers as Record<string, string>) || {}),
  }
  if (token) headers.Authorization = `Bearer ${token}`
  return fetch(`${localStorage.getItem('api_base_url') || getApiUrl()}${path}`, { ...init, headers })
}

const openMappings = ref<Set<string>>(new Set())
// Per-row save feedback, in plain sentences.
const mappingStatuses = ref<Map<string, { ok: boolean; message: string }>>(new Map())
// Segmentations applied since the page loaded, so a row shows the new cut
// immediately without refetching the whole journey.
const mappingOverrides = ref<Map<string, GlossSegment[]>>(new Map())
// Whether a row carries a HUMAN cut, as changed since the page loaded. Separate
// from the cut itself because a revert changes this without the row going
// blank: it keeps a gloss, just the generator's one rather than a person's.
const mappingSegmented = ref<Map<string, boolean>>(new Map())

const isMappingOpen = (roundNumber: number, idx: number) =>
  openMappings.value.has(rowKey(roundNumber, idx))

const toggleMapping = (roundNumber: number, idx: number) => {
  const key = rowKey(roundNumber, idx)
  const next = new Set(openMappings.value)
  if (next.has(key)) { next.delete(key); mappingStatuses.value.delete(key) }
  else next.add(key)
  openMappings.value = next
}

const mappingStatus = (roundNumber: number, idx: number) =>
  mappingStatuses.value.get(rowKey(roundNumber, idx)) || null

const glossWords = (s: string) => (s || '').trim().split(/\s+/).filter(Boolean)

// The segmentation currently on the row: whatever this session last saved,
// otherwise what the server served.
const currentSegments = (roundNumber: number, idx: number, item: ScriptItem): GlossSegment[] =>
  mappingOverrides.value.get(rowKey(roundNumber, idx))
    || item.mapping?.segments
    || []

// Has a person cut this row, as things stand right now? Only such a row has an
// original to go back to.
const isHandSegmented = (roundNumber: number, idx: number, item: ScriptItem): boolean => {
  const changed = mappingSegmented.value.get(rowKey(roundNumber, idx))
  return changed === undefined ? !!item.mapping?.segmented : changed
}

// Lay the segmentation out as columns for rendering: each chunk carries the
// target words it sits under, and whether a break can be added inside it.
const glossChunks = (roundNumber: number, idx: number, item: ScriptItem) => {
  const words = item.mapping?.words || []
  const segments = currentSegments(roundNumber, idx, item)
  const out: Array<{
    index: number
    known: string
    words: Array<{ col: number; text: string }>
    hasDividerAfter: boolean
  }> = []
  let col = 0
  segments.forEach((seg, index) => {
    const cols = []
    for (let i = 0; i < seg.span; i++, col++) cols.push({ col, text: words[col] ?? '' })
    out.push({
      index,
      known: seg.known,
      // Each gloss word is its own tile, so it can be picked up and put
      // anywhere. `at` is where it sits inside this chunk right now.
      tiles: glossWords(seg.known).map((text, at) => ({ text, at })),
      words: cols,
      hasDividerAfter: index < segments.length - 1,
    })
  })
  return out
}

const chunkTitle = (chunk: { known: string; words: Array<{ text: string }> }) => {
  const target = chunk.words.map(w => w.text).join(' ')
  return chunk.known ? `${target} = ${chunk.known}` : `${target} — no gloss sits here`
}

// ── Free placement: any known tile, under any target column, in any order ────

// The tile currently in the editor's hand, if any. One at a time, page-wide:
// picking a tile on another row puts this one down, which is what a person
// expects and what stops two rows both looking half-edited.
const pickedTile = ref<{ key: string; seg: number; at: number } | null>(null)

const isPicked = (roundNumber: number, idx: number, seg: number, at: number) => {
  const p = pickedTile.value
  return !!p && p.key === rowKey(roundNumber, idx) && p.seg === seg && p.at === at
}
// Is this row the one holding a tile? Only that row shows its landing places.
const isPlacing = (roundNumber: number, idx: number) =>
  !!pickedTile.value && pickedTile.value.key === rowKey(roundNumber, idx)

const pickTile = (roundNumber: number, idx: number, seg: number, at: number) => {
  if (!props.canEditMapping) return
  if (isPicked(roundNumber, idx, seg, at)) { pickedTile.value = null; return }
  pickedTile.value = { key: rowKey(roundNumber, idx), seg, at }
}

const dropTile = async (
  roundNumber: number, idx: number, item: ScriptItem, seg: number, at: number,
) => {
  const p = pickedTile.value
  if (!props.canEditMapping || !p || p.key !== rowKey(roundNumber, idx)) return
  pickedTile.value = null
  const next = moveGlossWord(currentSegments(roundNumber, idx, item), p, { seg, at })
  if (next) await saveSegments(roundNumber, idx, item, next)
}

// Drag is the SAME move, for anyone on a mouse. Nothing depends on it: the tap
// path above is complete on its own, because this has to work on a tablet.
const dragTile = (ev: DragEvent, roundNumber: number, idx: number, seg: number, at: number) => {
  if (!props.canEditMapping) return
  pickedTile.value = { key: rowKey(roundNumber, idx), seg, at }
  if (ev.dataTransfer) ev.dataTransfer.effectAllowed = 'move'
}
const dropDragged = async (
  ev: DragEvent, roundNumber: number, idx: number, item: ScriptItem, seg: number, at: number,
) => {
  ev.preventDefault()
  await dropTile(roundNumber, idx, item, seg, at)
}

// ── The segmentation gestures. Each produces a whole new segmentation and
//    saves it. These change the column SPANS, which free placement does not. ──

// Split a chunk at the boundary the editor tapped: `at` is how many of the
// chunk's target words fall on the left. The gloss is cut at the proportionally
// matching word boundary — a starting position the editor then nudges, never a
// claim about which half means what.
const splitChunk = async (
  roundNumber: number, idx: number, item: ScriptItem, index: number, at: number,
) => {
  if (!props.canEditMapping) return
  const segments = currentSegments(roundNumber, idx, item)
  const seg = segments[index]
  if (!seg || seg.span < 2) return

  const leftSpan = Math.min(Math.max(at, 1), seg.span - 1)
  const gw = glossWords(seg.known)
  const cut = Math.round((gw.length * leftSpan) / seg.span)
  const next = segments.slice()
  next.splice(index, 1,
    { span: leftSpan, known: gw.slice(0, cut).join(' ') },
    { span: seg.span - leftSpan, known: gw.slice(cut).join(' ') })
  await saveSegments(roundNumber, idx, item, next)
}

const mergeChunk = async (
  roundNumber: number, idx: number, item: ScriptItem, index: number,
) => {
  if (!props.canEditMapping) return
  const segments = currentSegments(roundNumber, idx, item)
  const a = segments[index]
  const b = segments[index + 1]
  if (!a || !b) return
  const next = segments.slice()
  next.splice(index, 2, {
    span: a.span + b.span,
    known: [a.known, b.known].map(t => t.trim()).filter(Boolean).join(' '),
  })
  await saveSegments(roundNumber, idx, item, next)
}

// Put the row back to the state it was in before any human touched it. The row
// keeps a gloss — it goes back to the one the generator derives — so this is not
// a delete, and it is instantly redoable by cutting again. `null` on the wire is
// the server's spelling of "no human segmentation here"; it stores NULL and
// answers with the derived cut so the row can show the truth at once.
const revertMapping = async (roundNumber: number, idx: number, item: ScriptItem) => {
  if (!props.canEditMapping) return
  if (!isHandSegmented(roundNumber, idx, item)) return
  await saveSegments(roundNumber, idx, item, null)
}

// `segments === null` means revert; anything else is a re-segmentation.
const saveSegments = async (
  roundNumber: number, idx: number, item: ScriptItem, segments: GlossSegment[] | null,
) => {
  const key = rowKey(roundNumber, idx)
  const source = item.mapping?.source
  const rowId = source === 'phrase' ? item.phrase_id : item.legoId
  if (!source || !rowId) {
    mappingStatuses.value.set(key, { ok: false, message: 'This row cannot be changed here.' })
    return
  }

  mappingStatuses.value.set(key, { ok: true, message: 'Saving…' })
  // Optimistic: the new cut shows at once, and is rolled back if the save fails.
  // A revert shows nothing early on purpose — only the server knows what the
  // derived gloss reads as, and guessing it would flash a cut that is not real.
  const previous = mappingOverrides.value.get(key)
  if (segments) mappingOverrides.value = new Map(mappingOverrides.value).set(key, segments)

  try {
    const resp = await mappingFetch(
      `/api/production/${props.courseCode}/mapping/${encodeURIComponent(rowId)}`,
      { method: 'POST', body: JSON.stringify({ source, segments }) },
    )
    // An unrouted /api path on this estate answers 200 with the SPA's HTML, so
    // res.ok is not proof of a write — only a JSON body echoing the saved
    // segments is. Anything else is treated as a failure.
    const ct = resp.headers.get('content-type') || ''
    const body = ct.includes('application/json') ? await resp.json().catch(() => null) : null
    if (!resp.ok || !body?.success || !Array.isArray(body.segments)) {
      throw new Error(body?.error || 'The mapping could not be saved.')
    }
    // The body carries what the row now READS as — after a revert that is the
    // generator's derivation, not the stale cut the page was served at load, so
    // it is what the override must hold rather than being cleared.
    mappingOverrides.value = new Map(mappingOverrides.value).set(key, body.segments)
    // A backend that predates the revert path says nothing about `segmented`;
    // fall back to what the request itself implies rather than to false.
    mappingSegmented.value = new Map(mappingSegmented.value)
      .set(key, typeof body.segmented === 'boolean' ? body.segmented : !!segments)
    mappingStatuses.value = new Map(mappingStatuses.value)
      .set(key, { ok: true, message: segments ? 'Saved' : 'Back to the original' })
  } catch (err: any) {
    const rolled = new Map(mappingOverrides.value)
    if (previous) rolled.set(key, previous); else rolled.delete(key)
    mappingOverrides.value = rolled
    mappingStatuses.value = new Map(mappingStatuses.value)
      .set(key, { ok: false, message: err?.message || 'The mapping could not be saved.' })
  }
}

// ── Player-delivery annotation ────────────────────────────────────────────
// The Script Viewer always shows the FULL intended course. These helpers turn
// the generator's per-row / per-round annotation into a plain-English flag, so
// a reviewer can see at a glance what the live player cannot deliver today.
// Display only — nothing here filters, gates or publishes anything.
const ROLE_LABELS: Record<string, string> = {
  known: 'prompt',
  target1: 'voice 1',
  target2: 'voice 2',
}
const rolesPhrase = (roles?: string[]) =>
  (roles || []).map(r => ROLE_LABELS[r] || r).join(' + ')

const itemFlagLabel = (item: ScriptItem): string =>
  item.playerDropReason === 'intro-audio' ? 'intro skipped' : 'audio missing'

const itemFlagTitle = (item: ScriptItem): string => {
  switch (item.playerDropReason) {
    case 'intro-audio':
      return `No ${rolesPhrase(item.missingAudioRoles)} audio for this intro — the player skips the intro cycle only; the rest of the round plays.`
    case 'debut-audio':
      return `No ${rolesPhrase(item.missingAudioRoles)} audio for this LEGO — the player skips the debut cycle only; the rest of the round plays.`
    case 'seed-audio':
      return 'The player needs voice 1 on this seed sentence; without it it substitutes a use phrase, so this row never plays.'
    case 'phrase-audio':
    default:
      return `No ${rolesPhrase(item.missingAudioRoles)} audio for this phrase — the player skips this row.`
  }
}

// Only fires when the round has nothing playable at all — a missing clip costs
// its own cycle, never the round (learner app, 2026-08-06).
const roundFlagTitle = (round: RoundData): string =>
  'Every cycle in this round is still awaiting audio, so the live player has nothing to play here. '
  + 'The round is still shown because it is part of the intended course, and its number is unaffected.'

const roundPartialTitle = (round: RoundData): string =>
  `The player plays this round as R${round.roundNumber} and skips ${round.undeliverableItemCount} cycle`
  + `${round.undeliverableItemCount === 1 ? '' : 's'} that are awaiting audio.`

// Round numbers no longer move: an audio gap costs the cycle, not the number.
const roundNumberTitle = (round: RoundData): string => {
  if (round.playerDelivers === false) return 'Nothing in this round is playable yet — the player skips straight past it'
  return `Round ${round.roundNumber}`
}

// ── Approval-gate standing per round ──────────────────────────────────────
// Read-only and non-blocking: Script View is a proofing tool and must not
// depend on the gate being reachable. If the fetch fails, no badges render
// and nothing else changes. Sign-off itself lives on the QA Gate page — this
// only shows what a human has already recorded.
const qaStatus = ref(new Map<number, string>())

const qaBadgeLabel = (s: string) => ({
  passed: 'signed off', flagged: 'flagged', stale: 'stale',
}[s] || '')
const qaBadgeTitle = (s: string) => ({
  passed: 'A human played this round through in the real app and passed it',
  flagged: 'A human flagged this round',
  stale: 'Signed off, but the audio or content has changed since',
}[s] || '')
const qaBadgeClass = (s: string) => ({
  passed: 'border-emerald-700 bg-emerald-900/30 text-emerald-300',
  flagged: 'border-red-700 bg-red-900/30 text-red-300',
  stale: 'border-amber-700 bg-amber-900/30 text-amber-300',
}[s] || 'hidden')

async function loadQaStatus() {
  try {
    const { rounds } = await qaGate.rounds(props.courseCode, { from: 1, limit: 500 })
    const map = new Map<number, string>()
    for (const r of rounds || []) {
      if (r.status && r.status !== 'not_signed_off') map.set(r.round_index, r.status)
    }
    qaStatus.value = map
  } catch {
    qaStatus.value = new Map()
  }
}
onMounted(loadQaStatus)
watch(() => props.courseCode, loadQaStatus)

// Escape closes any open alignment. Every edit gesture is a single tap that
// saves on its own, so there is no half-made state left to abandon.
onMounted(() => {
  const onEsc = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && openMappings.value.size) openMappings.value = new Set()
  }
  window.addEventListener('keydown', onEsc)
  onUnmounted(() => window.removeEventListener('keydown', onEsc))
})

// Quick audition of a single voice track (F = target1, M = target2).
const playingTrackUuid = ref<string | null>(null)
let trackAudioEl: HTMLAudioElement | null = null
async function playTrack(uuid: string) {
  if (!uuid) return
  // Toggle off if the same track is already playing.
  if (trackAudioEl && playingTrackUuid.value === uuid) {
    trackAudioEl.pause();
    playingTrackUuid.value = null;
    return;
  }
  try {
    let url = `${apiBaseUrl}/api/production/${props.courseCode}/audio/${uuid}/url`
    const s3Key = introS3KeyMap.value.get(uuid)
    if (s3Key) url += `?s3Key=${encodeURIComponent(s3Key)}`
    const resp = await fetch(url, { headers: { 'ngrok-skip-browser-warning': 'true' } })
    if (!resp.ok) return
    const data = await resp.json()
    if (!data.url) return
    if (trackAudioEl) trackAudioEl.pause()
    trackAudioEl = new Audio(data.url)
    playingTrackUuid.value = uuid
    trackAudioEl.onended = () => { playingTrackUuid.value = null }
    await trackAudioEl.play()
  } catch {
    playingTrackUuid.value = null
  }
}

// ============================================================================
// PLAYER SETUP
// ============================================================================

// Resolve audio UUIDs to signed URLs via the production API
const apiBaseUrl = localStorage.getItem('api_base_url') || getApiUrl()

// Build a map of UUID -> s3_key from intro items (presentation_audio has both)
// This lets the resolver pass the s3_key directly, bypassing the course_audio lookup
const introS3KeyMap = computed(() => {
  const map = new Map<string, string>()
  for (const item of props.allItems) {
    const pa = (item as any).presentation_audio
    if (pa?.id && pa?.s3_key) {
      map.set(pa.id, pa.s3_key)
    }
  }
  return map
})

const player = useScriptPlayer({
  audioUrlResolver: async (uuid: string) => {
    let url = `${apiBaseUrl}/api/production/${props.courseCode}/audio/${uuid}/url`
    const s3Key = introS3KeyMap.value.get(uuid)
    if (s3Key) {
      url += `?s3Key=${encodeURIComponent(s3Key)}`
    }
    const resp = await fetch(url, { headers: { 'ngrok-skip-browser-warning': 'true' } })
    if (!resp.ok) return null
    const data = await resp.json()
    return data.url
  }
})

// Build player-compatible items from allItems
// Intro cycle: presentation audio (PROMPT) → pause → LEGO target1 → LEGO target2
const playerItems = computed(() => {
  return props.allItems.map(item => {
    if (item.type === 'intro') {
      const presId = (item as any).presentation_audio?.id || null
      return {
        sourceId: presId,
        target1Id: item.target1_audio_uuid || null,
        target2Id: item.target2_audio_uuid || null,
        known_text: item.known_text,
        target_text: item.target_text,
        type: item.type,
        roundNumber: item.roundNumber,
        legoId: item.legoId,
      }
    }
    return {
      sourceId: item.known_audio_uuid || null,
      target1Id: item.target1_audio_uuid || null,
      target2Id: item.target2_audio_uuid || null,
      known_text: item.known_text,
      target_text: item.target_text,
      type: item.type,
      roundNumber: item.roundNumber,
      legoId: item.legoId,
    }
  })
})

// Build a lookup: for each round+itemIdx, what's the global index in allItems?
// Uses a per-round counter instead of indexOf (allItems are separate object references)
const globalIndexMap = computed(() => {
  const map = new Map<string, number>()
  const roundCounters = new Map<number, number>()

  props.allItems.forEach((item, globalIdx) => {
    const roundNum = item.roundNumber
    const localIdx = roundCounters.get(roundNum) || 0
    map.set(`${roundNum}-${localIdx}`, globalIdx)
    roundCounters.set(roundNum, localIdx + 1)
  })
  return map
})

// Reverse lookup: global index -> round number + local index
const currentPlayingLocation = computed(() => {
  if (!player.isPlaying.value && !player.isPaused.value) return null
  const idx = player.currentIndex.value
  if (idx < 0 || idx >= props.allItems.length) return null
  const item = props.allItems[idx]
  if (!item) return null

  // Count how many allItems with the same roundNumber come before this one
  let localIdx = 0
  for (let i = 0; i < idx; i++) {
    if (props.allItems[i].roundNumber === item.roundNumber) localIdx++
  }
  return { roundNumber: item.roundNumber, localIdx }
})

// ============================================================================
// PLAYBACK ACTIONS
// ============================================================================

const playFromItem = (round: RoundData, localIdx: number) => {
  const key = `${round.roundNumber}-${localIdx}`
  const globalIdx = globalIndexMap.value.get(key)
  if (globalIdx === undefined) return

  // If already playing this item, toggle pause
  if (isItemPlaying(round.roundNumber, localIdx)) {
    if (player.isPlaying.value) {
      player.pause()
    } else {
      player.play()
    }
    return
  }

  player.playFrom(playerItems.value, globalIdx)
}

const playRound = (round: RoundData) => {
  // If this round is already playing, toggle pause
  if (isRoundPlaying(round.roundNumber)) {
    if (player.isPlaying.value) {
      player.pause()
    } else {
      player.play()
    }
    return
  }

  // Find global index of first item in this round
  const key = `${round.roundNumber}-0`
  const globalIdx = globalIndexMap.value.get(key)
  if (globalIdx === undefined) return
  player.playFrom(playerItems.value, globalIdx)
}

const isItemPlaying = (roundNumber: number, localIdx: number): boolean => {
  const loc = currentPlayingLocation.value
  if (!loc) return false
  return loc.roundNumber === roundNumber && loc.localIdx === localIdx
}

const isRoundPlaying = (roundNumber: number): boolean => {
  const loc = currentPlayingLocation.value
  if (!loc) return false
  return loc.roundNumber === roundNumber
}

const hasPlayableItems = (round: RoundData): boolean => {
  return round.items.some(item => item.hasAudio)
}

// ============================================================================
// AUTO-EXPAND & AUTO-SCROLL
// ============================================================================

// Store refs to item DOM elements
const itemRefs = new Map<string, HTMLElement>()

const setItemRef = (roundNumber: number, idx: number, el: any) => {
  if (el) {
    itemRefs.set(`${roundNumber}-${idx}`, el as HTMLElement)
  }
}

// Watch for playing item changes to auto-expand round and scroll into view
watch(currentPlayingLocation, async (loc) => {
  if (!loc) return

  // Auto-expand the round containing the current item
  if (!expandedRounds.value.has(loc.roundNumber)) {
    expandedRounds.value.add(loc.roundNumber)
  }

  // Wait for DOM update after expand
  await nextTick()

  // Scroll the item into view
  const el = itemRefs.get(`${loc.roundNumber}-${loc.localIdx}`)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }
})

// Emit playback state to parent whenever it changes
watch(
  [player.isPlaying, player.isPaused, player.currentIndex, player.currentPhase, player.progress],
  () => {
    emit('playback-state', {
      isPlaying: player.isPlaying.value,
      isPaused: player.isPaused.value,
      currentItem: player.currentItem.value,
      currentPhase: player.currentPhase.value,
      currentIndex: player.currentIndex.value,
      progress: player.progress.value,
      totalItems: player.totalItems.value,
    })
  }
)

// ============================================================================
// ROUND EXPAND/COLLAPSE
// ============================================================================

// Track which rounds are expanded
const expandedRounds = ref<Set<number>>(new Set())
// Which spaced-review slots have their basket open. Keyed round-localIdx; tap
// to expand is the only gesture on that row.
const expandedBaskets = ref<Set<string>>(new Set())
const toggleBasket = (roundNumber: number, idx: number) => {
  const key = `${roundNumber}-${idx}`
  const next = new Set(expandedBaskets.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  expandedBaskets.value = next
}

// Auto-expand first round
watch(() => props.rounds, (newRounds) => {
  if (newRounds.length > 0 && expandedRounds.value.size === 0) {
    expandedRounds.value.add(newRounds[0].roundNumber)
  }
}, { immediate: true })

const toggleRound = (roundNumber: number) => {
  if (expandedRounds.value.has(roundNumber)) {
    expandedRounds.value.delete(roundNumber)
  } else {
    expandedRounds.value.add(roundNumber)
  }
}

// Leaves Popty for the real learning app, anchored on this round's LEGO.
// The preview player here is a proofing instrument; real playback fidelity
// lives in the learning app.
// `cycleText` is what actually anchors a per-cycle launch: this view's round
// list and the player's disagree on both membership and order, so the ordinal
// alone opens the wrong row. See learningAppUrl.ts.
const openRoundInLearningApp = (round: RoundData, cycle?: number) => {
  const cycleText = typeof cycle === 'number' ? round.items?.[cycle - 1]?.known_text : undefined
  const url = buildLearningAppUrl({
    courseCode: props.courseCode,
    round: round.roundNumber,
    legoId: round.legoId,
    cycle,
    cycleText
  })
  window.open(url, '_blank')
}

const expandAll = () => {
  props.rounds.forEach(round => {
    expandedRounds.value.add(round.roundNumber)
  })
}

const collapseAll = () => {
  expandedRounds.value.clear()
}

// Jump-to-round: expand + scroll + briefly highlight the target round card.
const highlightedRound = ref<number | null>(null)
let highlightTimer: ReturnType<typeof setTimeout> | null = null

const scrollToRound = async (roundNumber: number) => {
  expandedRounds.value.add(roundNumber)
  await nextTick()
  const el = document.getElementById(`journey-round-${roundNumber}`)
  if (!el) return false
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  if (highlightTimer) clearTimeout(highlightTimer)
  highlightedRound.value = roundNumber
  highlightTimer = setTimeout(() => { highlightedRound.value = null }, 2000)
  return true
}

// Expose methods + player for parent component
defineExpose({
  expandAll,
  collapseAll,
  scrollToRound,
  player
})

// ============================================================================
// HELPERS
// ============================================================================

// Get LEGO text from the debut or intro item in the round
const getLegoKnownText = (round: RoundData): string => {
  const debutItem = round.items.find(item => item.type === 'debut' || item.type === 'intro')
  return debutItem?.known_text || ''
}

const getLegoTargetText = (round: RoundData): string => {
  const debutItem = round.items.find(item => item.type === 'debut' || item.type === 'intro')
  return debutItem?.target_text || ''
}

const formatItemType = (type: string, phrasePosition?: number, consolidateIndex?: number): string => {
  switch (type) {
    case 'intro': return 'Intro'
    case 'debut': return 'LEGO'
    case 'build': return phrasePosition ? `BUILD-${phrasePosition}` : 'BUILD'
    case 'review': return 'REVIEW'
    case 'consolidate': return consolidateIndex ? `CONSOLIDATE-${consolidateIndex}` : 'CONSOLIDATE'
    default: return type
  }
}

const getTypeBadgeClass = (type: string): string => {
  switch (type) {
    // Solid badge + white text reads in BOTH themes (the tint+light-text pattern washed out on
    // white). White stays white here regardless of theme — high contrast on a saturated -600.
    case 'intro': return 'bg-purple-600 text-white'
    case 'debut': return 'bg-emerald-600 text-white'
    case 'build': return 'bg-blue-600 text-white'
    case 'review': return 'bg-amber-600 text-white'
    case 'consolidate': return 'bg-cyan-600 text-white'
    default: return 'bg-surface-3 text-muted'
  }
}

const getItemBgClass = (item: ScriptItem): string => {
  if (item.type === 'intro') return 'bg-surface'
  if (!item.hasAudio && item.type !== 'intro') return 'bg-amber-900 bg-opacity-10'
  return ''
}
</script>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}

.slide-enter-from,
.slide-leave-to {
  max-height: 0;
  opacity: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.slide-enter-to,
.slide-leave-from {
  max-height: 2000px;
  opacity: 1;
}

/* Light-mode legibility: the raw Tailwind emerald/amber-300/400 text and icons
   fall to ~1.3–1.5:1 on the light surfaces. Re-tint to the darkened accent
   tokens (same hue family) so they pass WCAG AA. Dark mode is untouched. */
:root[data-theme="light"] .stat-label-audio,
:root[data-theme="light"] .stat-val-audio,
:root[data-theme="light"] .lego-id-text,
:root[data-theme="light"] .audio-ok-icon {
  color: var(--accent-2); /* #047857 emerald family, 4.9:1 on surface, 4.5:1 on surface-2 */
}

:root[data-theme="light"] .stat-label-missing,
:root[data-theme="light"] .stat-val-missing,
:root[data-theme="light"] .audio-missing-icon {
  color: var(--accent); /* #a85508 amber/orange family, 5.4:1 on surface */
}

/* ── Gloss alignment ──────────────────────────────────────────────────────
   Each TARGET word is a column, in the target's own order, with the literal
   gloss chunk directly underneath the column(s) it covers. When the languages
   order things differently the known side reads wrong — that is the point
   (Tom, 2026-08-12), so nothing here is ever reordered to read naturally.

   The whole grid must occupy EXACTLY the height of the single line it replaces
   ("I don't want to make the row deeper"). Both states are pinned to 1.5rem;
   two 0.75rem lines fit inside that, and a long phrase scrolls sideways rather
   than wrapping, because a wrap would grow the row. */
.mapping-oneline {
  height: 1.5rem;
}

.mapping-grid {
  height: 1.5rem;
  display: flex;
  align-items: stretch;
  flex-wrap: nowrap;
  overflow-x: auto;
  scrollbar-width: none;
}
.mapping-grid::-webkit-scrollbar { display: none; }

/* One chunk: its target words on top, its single gloss underneath them. The
   column is as wide as the wider of the two, which is what makes the gloss sit
   under exactly the words it belongs to. */
.mapping-col {
  position: relative;
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0 0.3rem;
  border-radius: 0.1875rem;
  background: color-mix(in srgb, currentColor 6%, transparent);
  margin-right: 0.25rem;
}
.mapping-col:last-child { margin-right: 0; }

.mapping-target-line {
  display: flex;
  gap: 0.3rem;
  height: 0.75rem;
  line-height: 0.75rem;
  white-space: nowrap;
}
.mapping-word {
  font-size: 0.6875rem;
  line-height: 0.75rem;
  font-weight: 600;
}

/* The gloss sits centred under its whole column — a chunk covering two target
   words visibly spans both, which is how many-to-one reads at a glance. */
.mapping-gloss {
  height: 0.75rem;
  line-height: 0.75rem;
  font-size: 0.625rem;
  text-align: center;
  white-space: nowrap;
  opacity: 0.75;
}
/* A target word with no gloss under it stays visible as a dot rather than
   silently looking like part of its neighbour. */
.mapping-gloss-empty { opacity: 0.3; }
.mapping-gloss-dot { opacity: 0.6; }

/* One known word = one tile, and a tile goes anywhere (Tom, 2026-08-14). The
   gloss line keeps its 0.75rem height exactly: a tile is inline text with a
   little padding, never a box that grows the row. */
.mapping-tile {
  display: inline-block;
  font-size: 0.625rem;
  line-height: 0.75rem;
  padding: 0 0.125rem;
  border-radius: 0.125rem;
  cursor: grab;
  transition: background 0.12s ease, box-shadow 0.12s ease;
}
.mapping-tile:hover,
.mapping-tile:focus-visible { background: color-mix(in srgb, currentColor 16%, transparent); }
/* The tile in hand. Tint alone never carries a state here (a69b7921) — it
   outlines too, so it reads without relying on colour. */
.mapping-tile-picked {
  background: color-mix(in srgb, currentColor 22%, transparent);
  box-shadow: inset 0 0 0 1px currentColor;
  cursor: grabbing;
}

/* Where a picked tile can land: one slot before every tile and one after the
   last, in EVERY chunk including the empty ones. They exist only while a tile
   is in hand, so the resting row is exactly as it was — and they add width,
   never height, because the grid scrolls sideways and must not grow. */
.mapping-slot {
  display: inline-block;
  width: 0.5rem;
  height: 0.75rem;
  vertical-align: top;
  cursor: pointer;
  border-left: 2px solid color-mix(in srgb, currentColor 35%, transparent);
  margin: 0 0.0625rem;
  transition: border-color 0.12s ease;
}
.mapping-slot:hover { border-left-color: currentColor; }

/* The split control, between two target words of the SAME chunk. Always
   visible, never hover-gated — the whole thing has to work on a tap. */
.mapping-split,
.mapping-split-static {
  font-size: 0.5625rem;
  line-height: 0.75rem;
  opacity: 0.35;
  cursor: pointer;
  transition: opacity 0.12s ease;
}
.mapping-split-static { cursor: default; }
.mapping-split:hover,
.mapping-split:focus-visible { opacity: 1; }

/* The divider between two chunks: merge them. */
.mapping-divider {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 0.0625rem;
  padding: 0 0.125rem;
  margin-right: 0.25rem;
  border-left: 1px solid color-mix(in srgb, currentColor 30%, transparent);
}
.mapping-merge {
  font-size: 0.5625rem;
  line-height: 1;
  padding: 0 0.0625rem;
  opacity: 0.45;
  cursor: pointer;
  transition: opacity 0.12s ease;
}
.mapping-merge:hover,
.mapping-merge:focus-visible { opacity: 1; }
.mapping-merge { font-size: 0.4375rem; }

/* The way back, at the end of the chunk row. It sits INSIDE the strip, whose
   height is fixed at 1.5rem, so it can cost no row height in either state; it
   is written for a course editor reading it cold, never in repo vocabulary. */
.mapping-revert {
  flex: 0 0 auto;
  align-self: center;
  margin-left: 0.5rem;
  padding: 0 0.3rem;
  font-size: 0.5625rem;
  line-height: 0.875rem;
  white-space: nowrap;
  opacity: 0.45;
  cursor: pointer;
  border-radius: 0.1875rem;
  border: 1px solid color-mix(in srgb, currentColor 30%, transparent);
  transition: opacity 0.12s ease;
}
.mapping-revert:hover,
.mapping-revert:focus-visible { opacity: 1; }
</style>
