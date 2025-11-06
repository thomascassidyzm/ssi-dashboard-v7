// Quick test to verify cache functions work
// Run this in browser console to test the cache

import { getCachedCourse, setCachedCourse, clearCourseCache, isCacheValid, getCacheStats } from './courseCache.js'

async function testCache() {
  console.log('🧪 Testing Course Cache...\n')

  try {
    // Test 1: Set cache
    console.log('1️⃣ Testing setCachedCourse...')
    await setCachedCourse('test_course', '1.0', {
      seedPairs: { translations: { S0001: ['Hola', 'Hello'], S0002: ['Adiós', 'Goodbye'] } },
      legoPairs: { seeds: [] },
      legoBaskets: []
    })
    console.log('✅ Cache set successfully\n')

    // Test 2: Get cache
    console.log('2️⃣ Testing getCachedCourse...')
    const cached = await getCachedCourse('test_course')
    if (cached && cached.version === '1.0') {
      console.log('✅ Cache retrieved successfully')
      console.log('   Cached data:', cached)
    } else {
      console.log('❌ Cache retrieval failed')
    }
    console.log('')

    // Test 3: Check validity
    console.log('3️⃣ Testing isCacheValid...')
    const isValid = await isCacheValid('test_course', '1.0')
    console.log(isValid ? '✅ Cache is valid' : '❌ Cache is invalid')
    console.log('')

    // Test 4: Get stats
    console.log('4️⃣ Testing getCacheStats...')
    const stats = await getCacheStats()
    console.log('✅ Cache stats:', stats)
    console.log('')

    // Test 5: Clear cache
    console.log('5️⃣ Testing clearCourseCache...')
    await clearCourseCache('test_course')
    const afterClear = await getCachedCourse('test_course')
    if (!afterClear) {
      console.log('✅ Cache cleared successfully')
    } else {
      console.log('❌ Cache clear failed')
    }
    console.log('')

    console.log('🎉 All tests passed!')
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Export for use in browser console
window.testCourseCache = testCache

console.log('Run window.testCourseCache() in browser console to test the cache')
