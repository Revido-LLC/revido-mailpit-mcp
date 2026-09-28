import http from 'http'

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
    this.baseUrl = `http://${config.host}:8025/api/v1`
    this.auth = 'Basic ' + Buffer.from(`${config.apiUser}:${config.apiPass}`).toString('base64')
  }

  private request(url: string, method = 'GET'): Promise<{ statusCode: number; body: string }> {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url)
      const req = http.request({
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: `${parsedUrl.pathname}${parsedUrl.search}`,
        method,
        headers: { Authorization: this.auth }
      }, res => {
        const chunks: Buffer[] = []
        res.on('data', chunk => chunks.push(Buffer.from(chunk)))
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode ?? 0,
            body: Buffer.concat(chunks).toString('utf8')
          })
        })
      })

      req.on('error', reject)
      req.end()
    })
  }

  async getMessages(query?: string): Promise<MailpitMessagesResponse> {
    const url = query
      ? `${this.baseUrl}/search?query=${encodeURIComponent(query)}`
      : `${this.baseUrl}/messages`
    const res = await this.request(url)
    if (res.statusCode < 200 || res.statusCode >= 300) throw new Error(`Mailpit API error: ${res.statusCode}`)
    return JSON.parse(res.body) as MailpitMessagesResponse
  }

  async getMessage(id: string): Promise<MailpitMessageDetail> {
    const res = await this.request(`${this.baseUrl}/message/${id}`)
    if (res.statusCode < 200 || res.statusCode >= 300) throw new Error(`Mailpit API error: ${res.statusCode}`)
    return JSON.parse(res.body) as MailpitMessageDetail
  }

  async deleteByAddress(address: string): Promise<void> {
    await this.request(`${this.baseUrl}/search?query=${encodeURIComponent(`to:"${address}"`)}`, 'DELETE')
  }
}
