# Course Cache Usage Guide

## Overview

The course cache uses IndexedDB to store course data locally in the browser, reducing API calls and improving performance. Cache entries expire after 24 hours.

## How It Works

The cache is automatically integrated into `api.js`. When you call `api.course.get(courseCode)`:

1. **Cache Check**: First checks if valid cached data exists
2. **Fetch on Miss**: If not cached or expired, fetches from API/static files
3. **Auto-Cache**: Stores fetched data in cache automatically
4. **Auto-Clear**: Clears cache when course data is modified

## Automatic Integration

You don't need to do anything special! The cache works transparently:

```javascript
import api from '@/services/api'

// This automatically uses cache if available
const courseData = await api.course.get('spa_for_eng')
```

## Cache Utilities

For advanced use cases, you can directly use cache utilities:

```javascript
import {
  clearCourseCache,
  clearAllCache,
  getCacheStats,
  cleanupExpiredCache
} from '@/services/api'

// Clear cache for a specific course
await clearCourseCache('spa_for_eng')

// Clear all cached courses
await clearAllCache()

// Get cache statistics
const stats = await getCacheStats()
console.log(`Cached courses: ${stats.total}`)
console.log(`Valid: ${stats.valid}, Expired: ${stats.expired}`)

// Clean up expired entries
const removed = await cleanupExpiredCache()
console.log(`Removed ${removed} expired entries`)
```

## Cache Invalidation

The cache is automatically cleared when you:
- Update a translation
- Compile a course
- Accept/reject a LEGO extraction attempt
- Regenerate seeds (single or bulk)
- Bulk accept seeds
- Remove a seed

## Cache Structure

Each cached course contains:

```javascript
{
  courseCode: string,        // e.g., "spa_for_eng"
  version: string,           // e.g., "1.0"
  seedPairs: object,         // Raw seed pairs data
  legoPairs: object,         // Raw LEGO pairs data
  legoBaskets: array,        // LEGO baskets (if available)
  cachedAt: timestamp,       // When cached
  expiresAt: timestamp       // When it expires (cachedAt + 24h)
}
```

## Version Checking

The cache automatically validates versions. If a course is updated on the server with a new version, the cache will be invalidated on the next fetch.

## Browser Support

IndexedDB is supported in all modern browsers:
- Chrome/Edge 24+
- Firefox 16+
- Safari 10+
- Opera 15+

## Cache Size

IndexedDB has generous storage limits (typically 50% of available disk space), so you don't need to worry about running out of space for course data.

## Debugging

Check cache status in browser DevTools:
1. Open DevTools → Application tab
2. Navigate to IndexedDB → ssi-course-cache
3. View the 'courses' store to see all cached entries

Or use the programmatic API:

```javascript
import { getCacheStats } from '@/services/api'

// Get detailed cache information
const stats = await getCacheStats()
console.table(stats.courses)
```

## Performance Benefits

- **First Load**: Fetches from API/static files (normal speed)
- **Subsequent Loads**: Instant from cache (no network request)
- **Cache Hit**: ~1ms (vs ~500ms for API or ~200ms for static files)

## Example: Manual Cache Management Component

```vue
<template>
  <div>
    <button @click="clearCache">Clear Course Cache</button>
    <button @click="showStats">Show Cache Stats</button>
    <pre>{{ stats }}</pre>
  </div>
</template>

<script>
import { clearCourseCache, getCacheStats } from '@/services/api'

export default {
  data() {
    return {
      stats: null
    }
  },
  methods: {
    async clearCache() {
      await clearCourseCache(this.$route.params.courseCode)
      alert('Cache cleared!')
    },
    async showStats() {
      this.stats = await getCacheStats()
    }
  }
}
</script>
```

## Best Practices

1. **Let it work automatically**: The cache is designed to work transparently
2. **Don't manually clear unless needed**: Cache invalidation is handled automatically
3. **Use cache stats for debugging**: If you see stale data, check the cache stats
4. **Clean up expired entries periodically**: Call `cleanupExpiredCache()` on app startup

## Troubleshooting

### Stale Data

If you see stale data, the cache may not have been invalidated:

```javascript
import { clearCourseCache } from '@/services/api'
await clearCourseCache('spa_for_eng')
```

### Cache Not Working

Check browser console for `[CourseCache]` log messages:
- `Cache hit` = cache is working
- `Cache miss` = fetching fresh data
- `Cache expired` = old data removed, fetching fresh

### IndexedDB Errors

If IndexedDB is unavailable or blocked:
- The app will still work (cache operations fail silently)
- All data fetching falls back to API/static files
- Check browser privacy settings (some browsers block IndexedDB in private mode)
