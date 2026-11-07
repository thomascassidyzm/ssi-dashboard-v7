<template>
  <!-- /pods — the fleet-wide pods page (job #628). Everything is in PodBrowser: one search over every
       pod, scene and language, and the learning app's own pod display framed beside it. A course's
       own page (/production/:courseCode/pods) carries the same browser, held to that course. -->
  <div class="min-h-screen bg-canvas text-ink p-4 sm:p-6">
    <div class="mx-auto max-w-7xl">
      <h1 class="text-2xl font-bold text-accent-2 mb-1">Pods</h1>
      <p class="text-muted text-sm mb-4">
        Every pod, scene and language. Pick a line and the app plays it beside the list, exactly as a
        learner hears it. Editing stays on each pod's own page and in the Script Lab.
      </p>
      <PodBrowser />
    </div>
  </div>
</template>

<script setup>
import PodBrowser from '@/components/pods/PodBrowser.vue'
</script>
