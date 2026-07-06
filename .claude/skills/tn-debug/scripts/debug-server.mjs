#!/usr/bin/env node
// Minimal log collector for /tn-debug instrumentation.
// Useful for the web preview (`npm run web`) or any client that can POST:
// entries accumulate as NDJSON in /tmp/tn-debug.log.
//
//   node debug-server.mjs [port]
//
//   POST   /log   — append body (JSON or raw text) with timestamp
//   GET    /logs  — return collected entries
//   DELETE /logs  — clear the log file

import { createServer } from 'node:http'
import { appendFileSync, readFileSync, writeFileSync, existsSync } from 'node:fs'

const PORT = Number(process.argv[2] ?? 7331)
const LOG_FILE = '/tmp/tn-debug.log'

const server = createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', '*')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    return res.end()
  }

  if (req.method === 'POST' && req.url === '/log') {
    let body = ''
    req.on('data', (chunk) => (body += chunk))
    req.on('end', () => {
      let entry
      try { entry = JSON.parse(body) } catch { entry = { message: body } }
      appendFileSync(LOG_FILE, JSON.stringify({ ts: new Date().toISOString(), ...entry }) + '\n')
      res.writeHead(204)
      res.end()
    })
    return
  }

  if (req.method === 'GET' && req.url === '/logs') {
    const content = existsSync(LOG_FILE) ? readFileSync(LOG_FILE, 'utf8') : ''
    res.writeHead(200, { 'Content-Type': 'application/x-ndjson' })
    return res.end(content)
  }

  if (req.method === 'DELETE' && req.url === '/logs') {
    writeFileSync(LOG_FILE, '')
    res.writeHead(204)
    return res.end()
  }

  res.writeHead(404)
  res.end()
})

server.listen(PORT, () => {
  console.log(`[tn-debug] log server on http://localhost:${PORT} → ${LOG_FILE}`)
})
