<template>
  <div class="p-8">
    <!-- Simple usage example -->
    <SeedVisualizer
      translation-uuid="e5e82f717bc05ee954a80ad21f216c44"
      course-code="mkd_for_eng_574seeds"
      :editable="true"
      @boundaries-changed="onBoundariesChanged"
    />
  </div>
</template>

<script setup>
import SeedVisualizer from './components/SeedVisualizer.vue'

function onBoundariesChanged(event) {
  console.log('Translation:', event.translationUuid)
  console.log('New boundaries:', event.boundaries)
  // Example: [1, 2, 4] means boundaries after words 1, 2, and 4
}
</script>
