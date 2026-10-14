import { ref } from 'vue'

/**
 * Is a booth take being recorded right now? Set by RecordistBooth from its active voice's phase,
 * read by AppNavbar, which takes the whole bar away while it is true (navbarMode, job #411).
 */
export const boothMicLive = ref(false)
