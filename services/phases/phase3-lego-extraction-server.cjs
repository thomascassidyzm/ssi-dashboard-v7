#!/usr/bin/env node

/**
 * Phase 3: LEGO Extraction Server (STUB - To be implemented)
 *
 * Port: 3458
 */

const express = require('express');
const app = express();
const PORT = process.env.PORT || 3458;
const SERVICE_NAME = process.env.SERVICE_NAME || 'Phase 3 (LEGO Extraction)';

app.use(express.json());

app.post('/start', (req, res) => {
  console.log('⚠️  Phase 3 server is a stub - not yet implemented');
  res.status(501).json({ error: 'Phase 3 server not yet implemented' });
});

app.get('/health', (req, res) => {
  res.json({ service: SERVICE_NAME, status: 'stub', port: PORT });
});

app.listen(PORT, () => {
  console.log(`✅ ${SERVICE_NAME} (STUB) listening on port ${PORT}`);
});
