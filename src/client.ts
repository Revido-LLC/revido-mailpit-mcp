export interface MailpitConfig {
  host: string
  apiUser: string
  apiPass: string
  smtpPort?: number
  project: string
}

export interface MailpitMessage {
  ID: string
  Subject: string
  From: { Address: string; Name: string }
  To: Array<{ Address: string; Name: string }>
  Tags: string[]
  Date: string
}

export interface MailpitMessageDetail extends MailpitMessage {
  Text: string
  HTML: string
}

export interface MailpitMessagesResponse {
  messages: MailpitMessage[]
  total: number
}

export class MailpitClient {
  private baseUrl: string
  private auth: string

  constructor(private config: MailpitConfig) {
    this.baseUrl = `https://${config.host}/api/v1`
    this.auth = 'Basic ' + Buffer.from(`${config.apiUser}:${config.apiPass}`).toString('base64')
  }

  async getMessages(query?: string): Promise<MailpitMessagesResponse> {
    const url = query
      ? `${this.baseUrl}/search?query=${encodeURIComponent(query)}`
      : `${this.baseUrl}/messages`
    const res = await fetch(url, { headers: { Authorization: this.auth } })
    if (!res.ok) throw new Error(`Mailpit API error: ${res.status}`)
    return res.json() as Promise<MailpitMessagesResponse>
  }

  async getMessage(id: string): Promise<MailpitMessageDetail> {
    const res = await fetch(`${this.baseUrl}/message/${id}`, { headers: { Authorization: this.auth } })
    if (!res.ok) throw new Error(`Mailpit API error: ${res.status}`)
    return res.json() as Promise<MailpitMessageDetail>
  }

  async deleteByAddress(address: string): Promise<void> {
    await fetch(`${this.baseUrl}/search?query=${encodeURIComponent(`to:"${address}"`)}`, {
      method: 'DELETE',
      headers: { Authorization: this.auth }
    })
  }
}
