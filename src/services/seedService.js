/**
 * Service for loading SEED and LEGO data from the VFS
 */
import axios from 'axios'

export const seedService = {
  /**
   * Load a translation by UUID
   */
  async loadTranslation(courseCode, translationUuid) {
    const path = `/vfs/courses/${courseCode}/amino_acids/translations/${translationUuid}.json`
    const response = await axios.get(path)
    return response.data
  },

  /**
   * Load all LEGOs for a specific translation
   * This uses a pre-generated index for fast lookups
   */
  async loadLegosForTranslation(courseCode, translationUuid) {
    try {
      // Try to load from the pre-generated index
      const indexPath = `/vfs/courses/${courseCode}/amino_acids/legos_index.json`

      try {
        const indexResponse = await axios.get(indexPath)
        const indexData = indexResponse.data

        // Get LEGOs for this specific translation
        const legos = indexData.by_translation[translationUuid] || []
        console.log(`Loaded ${legos.length} LEGOs for translation ${translationUuid}`)
        return legos
      } catch (indexError) {
        console.warn('LEGO index not available, trying API fallback')

        // Fallback: Try API endpoint
        try {
          const response = await axios.get('/api/course/legos', {
            params: { courseCode, translationUuid }
          })
          return response.data.legos || []
        } catch (apiError) {
          console.error('API endpoint not available')
          return []
        }
      }
    } catch (err) {
      console.error('Failed to load LEGOs:', err)
      return []
    }
  },

  /**
   * Load LEGO data from individual files given their UUIDs
   */
  async loadLegosByUuids(courseCode, uuids) {
    const promises = uuids.map(uuid => {
      const path = `/vfs/courses/${courseCode}/amino_acids/legos/${uuid}.json`
      return axios.get(path).then(res => res.data).catch(err => {
        console.error(`Failed to load LEGO ${uuid}:`, err)
        return null
      })
    })

    const results = await Promise.all(promises)
    return results.filter(lego => lego !== null)
  },

  /**
   * Sort LEGOs by provenance order (S1L1, S1L2, etc.)
   */
  sortLegosByProvenance(legos) {
    return [...legos].sort((a, b) => {
      const aMatch = a.provenance.match(/S(\d+)L(\d+)/)
      const bMatch = b.provenance.match(/S(\d+)L(\d+)/)

      if (!aMatch || !bMatch) return 0

      const aSeed = parseInt(aMatch[1])
      const bSeed = parseInt(bMatch[1])
      const aLego = parseInt(aMatch[2])
      const bLego = parseInt(bMatch[2])

      if (aSeed !== bSeed) return aSeed - bSeed
      return aLego - bLego
    })
  },

  /**
   * Extract LEGO boundaries from a sorted list of LEGOs
   */
  extractBoundaries(legos, totalWords) {
    if (legos.length === 0) return []

    // Get unique end indices from LEGOs, sorted
    const endIndices = [...new Set(
      legos.map(lego => lego.metadata.end_index)
    )].sort((a, b) => a - b)

    // Remove the last index if it's the end of the sentence
    return endIndices.filter(idx => idx < totalWords - 1)
  }
}

export default seedService
