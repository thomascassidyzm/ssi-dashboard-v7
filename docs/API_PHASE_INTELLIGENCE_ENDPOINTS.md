# Phase Intelligence API Endpoints

**Purpose**: Add new API endpoints to `automation_server.cjs` for phase intelligence modules

**Location**: Insert after existing `/api/prompts/` endpoints (around line 2820)

**Backwards Compatible**: ✅ Yes - existing prompt endpoints remain unchanged

---

## Code to Add to automation_server.cjs

Insert this code block after the `/api/prompts/:phase/history` endpoint (line ~2820):

```javascript
// =============================================================================
// PHASE INTELLIGENCE API ENDPOINTS
// =============================================================================

/**
 * GET /api/phase-intelligence (List all modules)
 * Return metadata for all phase intelligence modules
 */
app.get('/api/phase-intelligence', async (req, res) => {
  try {
    const intelligenceDir = path.join(__dirname, 'docs', 'phase_intelligence');

    // Check if directory exists
    if (!await fs.pathExists(intelligenceDir)) {
      return res.json({ modules: [], message: 'Phase intelligence directory not found' });
    }

    // Read all .md files
    const files = (await fs.readdir(intelligenceDir)).filter(f => f.endsWith('.md') && f.startsWith('phase_'));

    const modules = await Promise.all(files.map(async file => {
      const content = await fs.readFile(path.join(intelligenceDir, file), 'utf8');

      // Extract version from first line: **Version**: 2.0 (2025-10-23)
      const versionMatch = content.match(/\*\*Version\*\*:\s*([0-9.]+)/);
      const version = versionMatch ? versionMatch[1] : '1.0';

      // Extract status
      const statusMatch = content.match(/\*\*Status\*\*:\s*(.+)/);
      const status = statusMatch ? statusMatch[1].trim() : 'active';

      // Extract phase number from filename: phase_3_extraction.md → 3
      const phaseMatch = file.match(/phase_([0-9]+)/);
      const phase = phaseMatch ? phaseMatch[1] : null;

      return {
        phase,
        filename: file,
        version,
        status,
        lastModified: (await fs.stat(path.join(intelligenceDir, file))).mtime
      };
    }));

    res.json({ modules: modules.filter(m => m.phase) });
  } catch (error) {
    console.error('Error listing phase intelligence:', error);
    res.status(500).json({ error: 'Failed to list modules', details: error.message });
  }
});

/**
 * GET /api/phase-intelligence/:phase
 * Fetch active methodology for a specific phase
 */
app.get('/api/phase-intelligence/:phase', async (req, res) => {
  const { phase } = req.params;

  try {
    const intelligenceDir = path.join(__dirname, 'docs', 'phase_intelligence');

    // Find matching file: phase_3_extraction.md
    const files = await fs.readdir(intelligenceDir);
    const matchingFile = files.find(f => f.startsWith(`phase_${phase}_`) && f.endsWith('.md'));

    if (!matchingFile) {
      // Backwards compatibility: fallback to PHASE_PROMPTS
      const promptKey = `PHASE_${phase.replace('.', '_')}`;
      const promptData = apmlRegistry.variable_registry.PHASE_PROMPTS[promptKey];

      if (promptData) {
        console.log(`⚠️  Phase ${phase} intelligence module not found, falling back to PHASE_PROMPTS`);
        return res.json({
          phase: promptData.phase,
          name: promptData.name,
          content: promptData.prompt,
          version: '1.0-legacy',
          source: 'APML_PROMPTS_FALLBACK',
          message: 'Using legacy PHASE_PROMPTS - consider migrating to phase intelligence module'
        });
      }

      return res.status(404).json({
        error: `Phase ${phase} intelligence module not found`,
        hint: `Create docs/phase_intelligence/phase_${phase}_*.md`
      });
    }

    // Read module content
    const filePath = path.join(intelligenceDir, matchingFile);
    const content = await fs.readFile(filePath, 'utf8');

    // Extract metadata
    const versionMatch = content.match(/\*\*Version\*\*:\s*([0-9.]+)/);
    const version = versionMatch ? versionMatch[1] : '1.0';

    const statusMatch = content.match(/\*\*Status\*\*:\s*(.+)/);
    const status = statusMatch ? statusMatch[1].trim() : 'active';

    const nameMatch = matchingFile.match(/phase_\d+_(.+)\.md/);
    const name = nameMatch ? nameMatch[1].replace(/_/g, ' ') : `Phase ${phase}`;

    const stats = await fs.stat(filePath);

    res.json({
      phase,
      name,
      version,
      status,
      content,
      filename: matchingFile,
      lastModified: stats.mtime,
      source: 'PHASE_INTELLIGENCE_MODULE'
    });

  } catch (error) {
    console.error(`Error fetching phase ${phase} intelligence:`, error);
    res.status(500).json({ error: 'Failed to fetch phase intelligence', details: error.message });
  }
});

/**
 * PUT /api/phase-intelligence/:phase
 * Publish updated phase intelligence module
 */
app.put('/api/phase-intelligence/:phase', async (req, res) => {
  const { phase } = req.params;
  const { content, version, changelog, publishedBy = 'human' } = req.body;

  if (!content) {
    return res.status(400).json({ error: 'Content required' });
  }

  if (!version) {
    return res.status(400).json({ error: 'Version required' });
  }

  try {
    const intelligenceDir = path.join(__dirname, 'docs', 'phase_intelligence');

    // Ensure directory exists
    await fs.ensureDir(intelligenceDir);

    // Find existing file or create new one
    const files = await fs.readdir(intelligenceDir);
    let targetFile = files.find(f => f.startsWith(`phase_${phase}_`) && f.endsWith('.md'));

    if (!targetFile) {
      // Create new file with sanitized name
      const sanitizedPhase = phase.replace(/[^a-z0-9]/gi, '_');
      targetFile = `phase_${sanitizedPhase}_methodology.md`;
      console.log(`📝 Creating new phase intelligence module: ${targetFile}`);
    }

    const filePath = path.join(intelligenceDir, targetFile);

    // Write content
    await fs.writeFile(filePath, content);

    // Git commit
    const commitMessage = changelog || `Update Phase ${phase} intelligence to v${version} (${publishedBy})`;
    await execAsync(`cd ${__dirname} && git add "${filePath}" && git commit -m "${commitMessage}"`);

    console.log(`✅ Published Phase ${phase} intelligence v${version} (${publishedBy})`);

    res.json({
      success: true,
      phase,
      version,
      filename: targetFile,
      message: 'Phase intelligence published and committed',
      publishedBy,
      publishedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error publishing phase intelligence:', error);
    res.status(500).json({ error: 'Failed to publish', details: error.message });
  }
});

/**
 * GET /api/phase-intelligence/:phase/history
 * Get Git history of phase intelligence changes
 */
app.get('/api/phase-intelligence/:phase/history', async (req, res) => {
  const { phase } = req.params;

  try {
    const intelligenceDir = path.join(__dirname, 'docs', 'phase_intelligence');
    const files = await fs.readdir(intelligenceDir);
    const matchingFile = files.find(f => f.startsWith(`phase_${phase}_`) && f.endsWith('.md'));

    if (!matchingFile) {
      return res.status(404).json({ error: `Phase ${phase} intelligence module not found` });
    }

    const filePath = path.join('docs', 'phase_intelligence', matchingFile);

    // Git log for specific file
    const { stdout } = await execAsync(
      `cd ${__dirname} && git log --follow --pretty=format:"%H|%an|%ai|%s" -- "${filePath}" || true`
    );

    const history = stdout.split('\n').filter(Boolean).map(line => {
      const [hash, author, date, message] = line.split('|');
      return { hash, author, date, message };
    });

    res.json({ phase, filename: matchingFile, history });

  } catch (error) {
    console.error('Error fetching phase intelligence history:', error);
    res.status(500).json({ error: 'Failed to fetch history', details: error.message });
  }
});

/**
 * GET /api/phase-intelligence/:phase/diff/:oldVersion/:newVersion
 * Get diff between two versions of phase intelligence
 */
app.get('/api/phase-intelligence/:phase/diff/:oldHash/:newHash', async (req, res) => {
  const { phase, oldHash, newHash } = req.params;

  try {
    const intelligenceDir = path.join(__dirname, 'docs', 'phase_intelligence');
    const files = await fs.readdir(intelligenceDir);
    const matchingFile = files.find(f => f.startsWith(`phase_${phase}_`) && f.endsWith('.md'));

    if (!matchingFile) {
      return res.status(404).json({ error: `Phase ${phase} intelligence module not found` });
    }

    const filePath = path.join('docs', 'phase_intelligence', matchingFile);

    // Git diff between commits
    const { stdout } = await execAsync(
      `cd ${__dirname} && git diff ${oldHash}..${newHash} -- "${filePath}"`
    );

    res.json({
      phase,
      filename: matchingFile,
      oldHash,
      newHash,
      diff: stdout
    });

  } catch (error) {
    console.error('Error fetching phase intelligence diff:', error);
    res.status(500).json({ error: 'Failed to fetch diff', details: error.message });
  }
});

// =============================================================================
// END PHASE INTELLIGENCE API ENDPOINTS
// =============================================================================
```

---

## API Documentation

### 1. List All Modules
```
GET /api/phase-intelligence
```

**Response**:
```json
{
  "modules": [
    {
      "phase": "3",
      "filename": "phase_3_extraction.md",
      "version": "2.0",
      "status": "Active methodology",
      "lastModified": "2025-10-23T11:30:00.000Z"
    }
  ]
}
```

---

### 2. Fetch Phase Methodology
```
GET /api/phase-intelligence/:phase
```

**Example**: `GET /api/phase-intelligence/3`

**Response**:
```json
{
  "phase": "3",
  "name": "extraction",
  "version": "2.0",
  "status": "Active methodology",
  "content": "# Phase 3: LEGO Extraction Intelligence\n\n...",
  "filename": "phase_3_extraction.md",
  "lastModified": "2025-10-23T11:30:00.000Z",
  "source": "PHASE_INTELLIGENCE_MODULE"
}
```

**Backwards Compatibility**: If module doesn't exist, falls back to `PHASE_PROMPTS` from APML registry:
```json
{
  "phase": "1",
  "name": "Pedagogical Translation",
  "content": "# Phase 1: Pedagogical Translation\n...",
  "version": "1.0-legacy",
  "source": "APML_PROMPTS_FALLBACK",
  "message": "Using legacy PHASE_PROMPTS - consider migrating to phase intelligence module"
}
```

---

### 3. Publish Updated Module
```
PUT /api/phase-intelligence/:phase
```

**Body**:
```json
{
  "content": "# Phase 3: LEGO Extraction Intelligence\n\n**Version**: 2.1...",
  "version": "2.1",
  "changelog": "Added composability scoring examples",
  "publishedBy": "developer@example.com"
}
```

**Response**:
```json
{
  "success": true,
  "phase": "3",
  "version": "2.1",
  "filename": "phase_3_extraction.md",
  "message": "Phase intelligence published and committed",
  "publishedBy": "developer@example.com",
  "publishedAt": "2025-10-23T12:00:00.000Z"
}
```

**Actions**:
1. Writes content to file
2. Git commits change
3. Returns confirmation

---

### 4. Version History
```
GET /api/phase-intelligence/:phase/history
```

**Example**: `GET /api/phase-intelligence/3/history`

**Response**:
```json
{
  "phase": "3",
  "filename": "phase_3_extraction.md",
  "history": [
    {
      "hash": "abc123",
      "author": "Developer Name",
      "date": "2025-10-23T11:30:00Z",
      "message": "Add preposition wrapping intelligence"
    },
    {
      "hash": "def456",
      "author": "Developer Name",
      "date": "2025-10-15T10:00:00Z",
      "message": "Initial extraction rules"
    }
  ]
}
```

---

### 5. Diff Between Versions
```
GET /api/phase-intelligence/:phase/diff/:oldHash/:newHash
```

**Example**: `GET /api/phase-intelligence/3/diff/def456/abc123`

**Response**:
```json
{
  "phase": "3",
  "filename": "phase_3_extraction.md",
  "oldHash": "def456",
  "newHash": "abc123",
  "diff": "--- a/docs/phase_intelligence/phase_3_extraction.md\n+++ b/docs/phase_intelligence/phase_3_extraction.md\n..."
}
```

---

## Integration Steps

### 1. Add Code to automation_server.cjs
Open `automation_server.cjs` and insert the code block after line 2820 (after the `/api/prompts/:phase/history` endpoint).

### 2. Test Endpoints
```bash
# Start server
node automation_server.cjs

# Test list endpoint
curl http://localhost:3456/api/phase-intelligence

# Test fetch endpoint
curl http://localhost:3456/api/phase-intelligence/3

# Test publish endpoint
curl -X PUT http://localhost:3456/api/phase-intelligence/3 \
  -H "Content-Type: application/json" \
  -d '{"content":"# Test","version":"2.0","changelog":"Test update"}'
```

### 3. Frontend Integration (Future)
Dashboard can call these endpoints to:
- Display phase intelligence in UI
- Allow editing and publishing
- Show version history
- Compare versions

---

## Backwards Compatibility

✅ **Existing APIs Unchanged**:
- `/api/prompts/:phase` - Still works
- `/api/prompts/:phase/history` - Still works
- All existing code continues to function

✅ **Graceful Fallback**:
- If phase intelligence module doesn't exist
- Falls back to PHASE_PROMPTS from APML
- Returns legacy marker in response

✅ **Migration Path**:
1. Add endpoints (this code)
2. Create phase intelligence modules
3. Gradually migrate agents to new endpoints
4. Deprecate old prompts when ready

---

## Testing Checklist

After adding code:

- [ ] Server starts without errors
- [ ] GET /api/phase-intelligence returns modules list
- [ ] GET /api/phase-intelligence/3 returns Phase 3 module
- [ ] GET /api/phase-intelligence/1 falls back to PHASE_PROMPTS
- [ ] PUT /api/phase-intelligence/3 publishes updates
- [ ] Git commits are created
- [ ] GET /api/phase-intelligence/3/history shows git log
- [ ] Existing /api/prompts/ endpoints still work

---

**This provides full API support for the phase intelligence module system while maintaining backwards compatibility with existing prompts.**
