<template>
  <main class="hq-moved">
    <h1>SSi HQ has moved</h1>
    <p>The company overview now lives in the learning app.</p>
    <p><a :href="HQ_URL" data-test="hq-moved-link">Open SSi HQ</a></p>
  </main>
</template>

<script setup>
const HQ_URL = 'https://saysomethingin.app/hq'
</script>

<style scoped>
.hq-moved { max-width: 32rem; margin: 4rem auto; padding: 0 1rem; }
</style>
