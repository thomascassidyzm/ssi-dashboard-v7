# Brief: Fix Terminal Spawning + Dashboard Issues

**Critical Issues Found**:
1. 🚨 automation_server.cjs spawns Terminal.app (not Warp) → Claude Code can't execute
2. Dashboard defaults to 574 seeds (should be 668 for full course)
3. Language selector hardcoded (should use ISO 3-char codes from database)
4. Course folders created but empty (because Terminal.app failed)

---

## Issue #1: Terminal Spawning (CRITICAL - BLOCKING)

### Problem
**Location**: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/automation_server.cjs` line ~160

**Current Code**:
```javascript
const appleScript = `
tell application "Terminal"
    activate
    set newTab to do script "cd ${courseDir} && echo '...' && cat '${promptFile}'"
end tell
`.trim();
```

**Issue**:
- Opens Terminal.app (default macOS terminal)
- User uses Warp terminal
- Terminal.app doesn't have Claude Code Pro Max account configured
- Commands fail silently

### Solution
Change AppleScript to use **Warp** instead:

```javascript
const appleScript = `
tell application "Warp"
    activate
    tell application "System Events"
        keystroke "t" using {command down}
    end tell
    delay 0.5
    do script "cd ${courseDir} && echo '═══════════════════════════════════════════════════════' && echo 'SSi Course Production - Phase ${phase}' && echo '═══════════════════════════════════════════════════════' && echo 'Course: ${courseCode}' && echo 'Training: ${trainingURL}' && echo '' && echo 'PROMPT:' && cat '${promptFile}' && echo '' && echo '═══════════════════════════════════════════════════════'"
end tell
`.trim();
```

**Alternative** (if Warp doesn't support `do script`):
```javascript
const appleScript = `
tell application "Warp"
    activate
    tell application "System Events"
        keystroke "t" using {command down}
        delay 0.5
        keystroke "cd ${courseDir}" & return
        delay 0.3
        keystroke "echo '═══════════════════════════════════════════════════════'" & return
        keystroke "echo 'SSi Course Production - Phase ${phase}'" & return
        keystroke "echo '═══════════════════════════════════════════════════════'" & return
        keystroke "cat '${promptFile}'" & return
        keystroke "echo '═══════════════════════════════════════════════════════'" & return
        keystroke "claude" & return
    end tell
end tell
`.trim();
```

**Best Solution** (Most Reliable):
Don't use AppleScript at all - spawn directly via Node.js child_process:

```javascript
async function spawnPhaseAgent(phase, prompt, courseDir, courseCode) {
  console.log(`[Agent] Spawning Phase ${phase} agent...`);

  const trainingURL = `${CONFIG.TRAINING_URL}/phase/${phase}`;

  // Write prompt to temp file
  const promptFile = path.join(__dirname, `.prompt-${phase}-${Date.now()}.txt`);
  await fs.writeFile(promptFile, prompt, 'utf8');

  // Spawn Warp with new tab and command
  const { spawn } = require('child_process');

  const command = `cd "${courseDir}" && echo "═══════════════════════════════════════════════════════" && echo "SSi Course Production - Phase ${phase}" && echo "═══════════════════════════════════════════════════════" && echo "Course: ${courseCode}" && echo "Training: ${trainingURL}" && echo "" && echo "PROMPT:" && cat "${promptFile}" && echo "" && echo "═══════════════════════════════════════════════════════" && exec $SHELL`;

  try {
    // Open Warp with the command
    const child = spawn('open', [
      '-a', 'Warp',
      '-n', // New instance
      '--args',
      '--execute-command', command
    ], {
      detached: true,
      stdio: 'ignore'
    });

    child.unref();

    console.log(`[Agent] Phase ${phase} agent spawned in Warp`);

    // Clean up temp file after delay
    setTimeout(() => {
      fs.unlink(promptFile).catch(err => {
        console.warn(`[Agent] Failed to clean up temp prompt file: ${err.message}`);
      });
    }, 5000);
  } catch (error) {
    console.error(`[Agent] Failed to spawn Phase ${phase} agent:`, error.message);
    await fs.unlink(promptFile).catch(() => {});
    throw error;
  }
}
```

**Test which approach works**:
```bash
# Test 1: AppleScript with Warp
osascript -e 'tell application "Warp" to activate'

# Test 2: open command
open -a Warp --args --execute-command "echo 'Test'"

# Test 3: Check Warp CLI
which warp-cli
```

---

## Issue #2: Default Seed Count

### Problem
**Location**: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/src/views/CourseGeneration.vue`

**Current**: Defaults to 574 seeds
**Should be**: 668 seeds (full canonical corpus)

### Solution
Find the seed count default (likely around line 50-100):

```javascript
// BEFORE
const seedCount = ref(574);

// AFTER
const seedCount = ref(668);
```

And update the helper text:
```vue
<!-- BEFORE -->
<p class="text-sm text-slate-400">Default: 574 (full SSi course)</p>

<!-- AFTER -->
<p class="text-sm text-slate-400">Default: 668 (full canonical corpus)</p>
```

---

## Issue #3: Language Selector (Hardcoded)

### Problem
**Location**: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/src/views/CourseGeneration.vue`

**Current**: Hardcoded language options
**Should be**: Dynamic from API or use ISO 639-3 standard

### Solution Option A: Fetch from API

Add endpoint to automation_server.cjs:
```javascript
// GET /api/languages - Return supported languages
app.get('/api/languages', (req, res) => {
  const languages = [
    { code: 'eng', name: 'English', native: 'English' },
    { code: 'ita', name: 'Italian', native: 'Italiano' },
    { code: 'spa', name: 'Spanish', native: 'Español' },
    { code: 'fra', name: 'French', native: 'Français' },
    { code: 'deu', name: 'German', native: 'Deutsch' },
    { code: 'cym', name: 'Welsh', native: 'Cymraeg' },
    { code: 'gle', name: 'Irish', native: 'Gaeilge' },
    { code: 'gla', name: 'Scottish Gaelic', native: 'Gàidhlig' },
    { code: 'bre', name: 'Breton', native: 'Brezhoneg' },
    { code: 'cor', name: 'Cornish', native: 'Kernewek' },
    { code: 'glv', name: 'Manx', native: 'Gaelg' },
    { code: 'por', name: 'Portuguese', native: 'Português' },
    { code: 'cat', name: 'Catalan', native: 'Català' },
    { code: 'eus', name: 'Basque', native: 'Euskara' },
    { code: 'nld', name: 'Dutch', native: 'Nederlands' },
    { code: 'swe', name: 'Swedish', native: 'Svenska' },
    { code: 'nor', name: 'Norwegian', native: 'Norsk' },
    { code: 'dan', name: 'Danish', native: 'Dansk' },
    { code: 'isl', name: 'Icelandic', native: 'Íslenska' },
    { code: 'pol', name: 'Polish', native: 'Polski' },
    { code: 'ces', name: 'Czech', native: 'Čeština' },
    { code: 'slk', name: 'Slovak', native: 'Slovenčina' },
    { code: 'hun', name: 'Hungarian', native: 'Magyar' },
    { code: 'ron', name: 'Romanian', native: 'Română' },
    { code: 'bul', name: 'Bulgarian', native: 'Български' },
    { code: 'hrv', name: 'Croatian', native: 'Hrvatski' },
    { code: 'srp', name: 'Serbian', native: 'Српски' },
    { code: 'slv', name: 'Slovenian', native: 'Slovenščina' },
    { code: 'mkd', name: 'Macedonian', native: 'Македонски' },
    { code: 'rus', name: 'Russian', native: 'Русский' },
    { code: 'ukr', name: 'Ukrainian', native: 'Українська' },
    { code: 'bel', name: 'Belarusian', native: 'Беларуская' },
    { code: 'ell', name: 'Greek', native: 'Ελληνικά' },
    { code: 'tur', name: 'Turkish', native: 'Türkçe' },
    { code: 'ara', name: 'Arabic', native: 'العربية' },
    { code: 'heb', name: 'Hebrew', native: 'עברית' },
    { code: 'jpn', name: 'Japanese', native: '日本語' },
    { code: 'kor', name: 'Korean', native: '한국어' },
    { code: 'cmn', name: 'Mandarin Chinese', native: '中文' },
    { code: 'yue', name: 'Cantonese', native: '粵語' },
    { code: 'tha', name: 'Thai', native: 'ไทย' },
    { code: 'vie', name: 'Vietnamese', native: 'Tiếng Việt' },
    { code: 'ind', name: 'Indonesian', native: 'Bahasa Indonesia' },
    { code: 'msa', name: 'Malay', native: 'Bahasa Melayu' },
    { code: 'tgl', name: 'Tagalog', native: 'Tagalog' },
    { code: 'hin', name: 'Hindi', native: 'हिन्दी' },
    { code: 'ben', name: 'Bengali', native: 'বাংলা' },
    { code: 'urd', name: 'Urdu', native: 'اردو' },
    { code: 'fas', name: 'Persian', native: 'فارسی' },
    { code: 'swa', name: 'Swahili', native: 'Kiswahili' },
    { code: 'amh', name: 'Amharic', native: 'አማርኛ' },
    { code: 'hau', name: 'Hausa', native: 'Hausa' },
    { code: 'yor', name: 'Yoruba', native: 'Yorùbá' },
    { code: 'zul', name: 'Zulu', native: 'isiZulu' },
    { code: 'xho', name: 'Xhosa', native: 'isiXhosa' },
    { code: 'afr', name: 'Afrikaans', native: 'Afrikaans' }
  ];

  // Sort by English name
  languages.sort((a, b) => a.name.localeCompare(b.name));

  res.json(languages);
});
```

Update CourseGeneration.vue:
```javascript
// Fetch languages on mount
const targetLanguages = ref([]);
const knownLanguages = ref([]);

onMounted(async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/languages`);
    const languages = await response.json();
    targetLanguages.value = languages;
    knownLanguages.value = languages;
  } catch (error) {
    console.error('Failed to load languages:', error);
    // Fallback to hardcoded list
  }
});
```

Update template:
```vue
<select v-model="targetLanguage">
  <option v-for="lang in targetLanguages" :key="lang.code" :value="lang.code">
    {{ lang.name }} ({{ lang.code }})
  </option>
</select>
```

---

## Issue #4: Course Folders Created but Empty

### Problem
**Location**: VFS directory `/Users/tomcassidy/SSi/SSi_Course_Production/vfs/courses/gle_for_eng_30seeds/`

**Current State**:
- Folders created (amino_acids/, phase_outputs/, etc.)
- But no files inside (phases didn't execute)

**Root Cause**: Issue #1 (Terminal.app spawning failed)

### Solution
1. Fix Issue #1 (Warp terminal spawning)
2. Delete empty course folder:
   ```bash
   rm -rf /Users/tomcassidy/SSi/SSi_Course_Production/vfs/courses/gle_for_eng_30seeds/
   ```
3. Re-run generation after fix

---

## Testing Plan

### Test 1: Verify Warp Spawning
```bash
# Manual test
cd /Users/tomcassidy/SSi/ssi-dashboard-v7-clean
node -e "
const { spawn } = require('child_process');
spawn('open', ['-a', 'Warp', '-n'], { detached: true, stdio: 'ignore' });
"
```

Should open Warp terminal window.

### Test 2: Verify Claude Code in Warp
Open Warp manually and run:
```bash
claude --version
```

Should show Claude Code version (not "command not found").

### Test 3: Generate Test Course
1. Fix all 3 issues
2. Restart automation server
3. Try generating 10-seed test course (fast validation)
4. Verify Terminal windows spawn in Warp
5. Verify Claude Code executes
6. Verify phase files created

---

## Implementation Order

1. **Fix #1 (Warp spawning)** - CRITICAL, BLOCKING
2. **Test Warp spawning** - Verify it works
3. **Fix #2 (Seed count)** - Quick frontend change
4. **Fix #3 (Language selector)** - Frontend + backend change
5. **Clean up failed course** - Delete empty gle_for_eng_30seeds
6. **Test full generation** - Run 10-seed test
7. **Run 30-seed Irish course** - Full validation

---

## Files to Modify

1. `automation_server.cjs` - Line ~148-182 (spawnPhaseAgent function)
2. `src/views/CourseGeneration.vue` - Seed count default + language selector
3. `automation_server.cjs` - Add GET /api/languages endpoint (optional)

---

## Success Criteria

✅ Warp terminal spawns (not Terminal.app)
✅ Claude Code executes in Warp
✅ Phase files created in VFS
✅ Seed count defaults to 668
✅ Language selector uses ISO 3-char codes
✅ Irish course generates successfully

---

## Notes

**Why Warp?**
- User's active terminal
- Has Claude Code Pro Max configured
- Required for course generation to work

**Alternative**: Configure Terminal.app with Claude Code, but Warp is user's preference.

**Testing Warp AppleScript**:
```bash
osascript -e 'tell application "Warp" to activate'
osascript -e 'tell application "System Events" to tell process "Warp" to keystroke "t" using {command down}'
```
