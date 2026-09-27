import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
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

const transport = new StdioServerTransport()
await server.connect(transport)
