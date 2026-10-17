// Browser rendering check with synthetic auth. Every database request is blocked.
const { chromium } = require('@playwright/test')
const path = require('path')
const { evidencePath } = require('../../tools/lib/evidence-path.cjs')
const outputDir = process.env.CS_SCRATCH || path.dirname(evidencePath('voice-coverage/browser-check.png'))
let browser
;(async () => {
 const summaryResponse = await fetch(process.env.COVERAGE_API_URL || 'http://localhost:3470/api/admin/voice-coverage')
 if (!summaryResponse.ok) throw new Error(`No saved summary: ${summaryResponse.status}`)
 const summary = await summaryResponse.json()
 browser = await chromium.launch({headless:true})
 const context = await browser.newContext({ viewport:{width:1280,height:900} })
 const page = await context.newPage(), errors = []
 page.on('pageerror',e=>errors.push(e.message))
 const fake = {email:'coverage-test@example.invalid',role:'admin',name:'Coverage browser check',courses:'*'}
 await page.addInitScript(({fake})=>{
   const base64url = v => btoa(JSON.stringify(v)).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_')
   const exp = Math.floor(Date.now()/1000)+3600
   const token = `${base64url({alg:'HS256',typ:'JWT'})}.${base64url({sub:'00000000-0000-4000-8000-000000000001',email:fake.email,exp})}.synthetic`
   localStorage.setItem('sb-swfvymspfxmnfhevgdkg-auth-token',JSON.stringify({access_token:token,refresh_token:'synthetic',expires_at:exp,expires_in:3600,token_type:'bearer',user:{id:'00000000-0000-4000-8000-000000000001',email:fake.email,user_metadata:{}}}))
   localStorage.setItem('popty_dashboard_user',JSON.stringify(fake))
 },{fake})
 await page.route('**/*',async route=>{
   const url = new URL(route.request().url())
   if(url.pathname === '/api/admin/voice-coverage') return route.fulfill({json:summary})
   if(url.pathname === '/api/auth/me') return route.fulfill({json:fake})
   if(url.hostname.endsWith('.supabase.co')) return route.fulfill({status:200,json:[]})
   if(url.pathname.startsWith('/api/')) return route.fulfill({status:200,json:{}})
   return route.continue()
 })
 await page.goto(process.env.COVERAGE_PAGE_URL || 'https://popty.app/admin/voice-coverage',{waitUntil:'networkidle'})
 await page.getByRole('heading',{name:'Per-voice coverage',exact:true}).waitFor()
 const initialRows = await page.locator('article tbody tr').count()
 if (initialRows !== 0) throw new Error('Collapsed voice tables rendered eagerly')
 await page.getByPlaceholder('Filter courses or languages').fill('spa_mx_for_eng')
 await page.getByRole('heading',{name:'spa_mx_for_eng',exact:true}).waitFor()
 const course = summary.courses.find(c=>c.courseCode==='spa_mx_for_eng')
 if(!course || course.error) throw new Error('Mexican Spanish not measured')
 const details = page.locator('article details')
 await details.first().locator('summary').click()
 await page.getByRole('columnheader',{name:'First break',exact:true}).waitFor()
 const text = await page.locator('main.coverage').innerText()
 if(!text.includes('First break')) throw new Error('Voice detail did not open')
 await page.screenshot({path:outputDir+'/voice-coverage-desktop.png',fullPage:true})
 await page.setViewportSize({width:390,height:844})
 const phoneTableWidth = await page.locator('article table').first().evaluate(el => el.getBoundingClientRect().width)
 if (phoneTableWidth < 700) throw new Error(`Phone table columns are crushed: table width ${phoneTableWidth}px`)
 await page.screenshot({path:outputDir+'/voice-coverage-mobile.png',fullPage:true})
 console.log(JSON.stringify({url:page.url(),syntheticAuth:true,blockedDatabase:true,renderedCourses:await page.locator('article').count(),errors,headline:text.slice(0,2400)}))
 await browser.close()
 if(errors.length) process.exitCode=1
})().catch(e=>{ console.error(e.message);process.exitCode=1 }).finally(async()=>{ if(browser) await browser.close() })
