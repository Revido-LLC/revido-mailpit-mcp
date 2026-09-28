import { createServer, type IncomingMessage } from 'node:http'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { z } from 'zod'
import { makeAddress, waitForEmail, extractCode, cleanup } from './helper.js'
import type { MailpitConfig } from './client.js'

function getConfig(): MailpitConfig {
  const host = process.env.MAILPIT_HOST
  const apiUser = process.env.MAILPIT_API_USER
  const apiPass = process.env.MAILPIT_API_PASS
  const project = process.env.MAILPIT_SMTP_USER
  if (!host || !apiUser || !apiPass || !project) {
    throw new Error('Missing required env vars: MAILPIT_HOST, MAILPIT_API_USER, MAILPIT_API_PASS, MAILPIT_SMTP_USER')
  }
  return { host, apiUser, apiPass, project }
}

const server = new McpServer({ name: 'revido-mailpit', version: '1.0.0' })

server.tool('make_address', 'Generate a unique test email address for this project.', {}, async () => {
  const config = getConfig()
  const address = makeAddress(config.project)
  return { content: [{ type: 'text', text: address }] }
})

server.tool('wait_for_email', 'Wait until an email arrives for the given address.', {
  address: z.string().describe('The test email address to wait for'),
  timeout_ms: z.number().optional().describe('How long to wait in ms (default 15000)')
}, async ({ address, timeout_ms }) => {
  const config = getConfig()
  const email = await waitForEmail(address, config, timeout_ms)
  return { content: [{ type: 'text', text: JSON.stringify({ id: email.ID, subject: email.Subject, from: email.From.Address, to: email.To.map(t => t.Address), text: email.Text, html: email.HTML }, null, 2) }] }
})

server.tool('extract_code', 'Extract an OTP or verification link from an email body.', {
  html: z.string().optional(),
  text: z.string().optional()
}, async ({ html, text }) => {
  const fakeEmail = { ID: '', Subject: '', From: { Address: '', Name: '' }, To: [], Tags: [], Date: '', Text: text || '', HTML: html || '' }
  const result = extractCode(fakeEmail)
  return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
})

server.tool('cleanup', 'Delete emails for a specific test address only.', {
  address: z.string().describe('The test address to clean up')
}, async ({ address }) => {
  const config = getConfig()
  await cleanup(address, config)
  return { content: [{ type: 'text', text: `Cleaned up emails for ${address}` }] }
})

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', chunk => chunks.push(Buffer.from(chunk)))
    req.on('end', () => {
      if (chunks.length === 0) {
        resolve(undefined)
        return
      }

      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
      } catch (error) {
        reject(error)
      }
    })
    req.on('error', reject)
  })
}

const port = Number.parseInt(process.env.PORT || '3000', 10)
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error(`Invalid PORT value: ${process.env.PORT}`)
}

const httpServer = createServer(async (req, res) => {
  try {
    const body = req.method === 'POST' ? await readBody(req) : undefined
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
    await server.connect(transport)
    await transport.handleRequest(req, res, body)
  } catch (error) {
    console.error('Error handling HTTP request:', error)
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Internal server error' }))
    }
  }
})

httpServer.listen(port, () => {
  console.log(`MCP Streamable HTTP Server listening on port ${port}`)
})

process.on('SIGINT', () => {
  httpServer.close()
})
