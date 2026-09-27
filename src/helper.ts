import { MailpitClient, MailpitConfig, MailpitMessageDetail } from './client.js'

const DOMAIN = 'test.revido.co'
const DEFAULT_TIMEOUT_MS = 15000
const POLL_INTERVAL_MS = 1000

export function makeAddress(project: string): string {
  const random = Math.random().toString(36).slice(2, 8)
  return `${random}+${project}@${DOMAIN}`
}

export async function waitForEmail(
  address: string,
  config: MailpitConfig,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<MailpitMessageDetail> {
  const client = new MailpitClient(config)
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const { messages } = await client.getMessages(`to:"${address}"`)
    if (messages.length > 0) return client.getMessage(messages[0].ID)
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS))
  }
  throw new Error(`No email arrived for ${address} within ${timeoutMs}ms`)
}

export function extractCode(email: MailpitMessageDetail): { otp: string | null; link: string | null } {
  const body = email.HTML || email.Text || ''
  const otpMatch = body.match(/\b(\d{4,8})\b/)
  const otp = otpMatch ? otpMatch[1] : null
  const linkMatch = body.match(/https?:\/\/[^\s"'<>]+(?:verify|confirm|magic|token|auth)[^\s"'<>]*/i)
  const link = linkMatch ? linkMatch[0] : null
  return { otp, link }
}

export async function cleanup(address: string, config: MailpitConfig): Promise<void> {
  const client = new MailpitClient(config)
  await client.deleteByAddress(address)
}
