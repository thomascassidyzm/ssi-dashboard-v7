/**
 * The STAGING booth on one origin: this tree's built SPA, with every /api/*
 * call proxied to the staging production-api. Same-origin means the SPA needs
 * no Environment Switcher pin — but the spec pins localStorage.api_base_url to
 * this origin anyway, because getApiUrl() on 127.0.0.1 otherwise falls through
 * to localhost:3470, which is PRODUCTION.
 *
 * Runs on watson-1 as a user unit out of ~/wt-staging:
 *   STAGING_SPA_PORT=3491 STAGING_API=http://127.0.0.1:3490 node e2e/booth-artists-day/staging-spa-server.cjs
 */
const express = require('express')
const path = require('path')
const { createProxyMiddleware } = require('http-proxy-middleware')

const PORT = Number(process.env.STAGING_SPA_PORT || 3491)
const API = process.env.STAGING_API || 'http://127.0.0.1:3490'
const DIST = process.env.STAGING_DIST || path.join(__dirname, '..', '..', 'dist')

const app = express()
app.use(createProxyMiddleware({ pathFilter: '/api', target: API, changeOrigin: false, ws: false }))
app.use(express.static(DIST, { index: false }))
app.get(/.*/, (req, res) => res.sendFile(path.join(DIST, 'index.html')))
app.listen(PORT, '127.0.0.1', () => console.log(`[staging-spa] ${DIST} on :${PORT}, /api -> ${API}`))
