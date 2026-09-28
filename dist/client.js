import http from 'http';
export class MailpitClient {
    config;
    baseUrl;
    auth;
    constructor(config) {
        this.config = config;
        this.baseUrl = `http://${config.host}:8025/api/v1`;
        this.auth = 'Basic ' + Buffer.from(`${config.apiUser}:${config.apiPass}`).toString('base64');
    }
    request(url, method = 'GET') {
        return new Promise((resolve, reject) => {
            const parsedUrl = new URL(url);
            const req = http.request({
                hostname: parsedUrl.hostname,
                port: parsedUrl.port,
                path: `${parsedUrl.pathname}${parsedUrl.search}`,
                method,
                headers: { Authorization: this.auth }
            }, res => {
                const chunks = [];
                res.on('data', chunk => chunks.push(Buffer.from(chunk)));
                res.on('end', () => {
                    resolve({
                        statusCode: res.statusCode ?? 0,
                        body: Buffer.concat(chunks).toString('utf8')
                    });
                });
            });
            req.on('error', reject);
            req.end();
        });
    }
    async getMessages(query) {
        const url = query
            ? `${this.baseUrl}/search?query=${encodeURIComponent(query)}`
            : `${this.baseUrl}/messages`;
        const res = await this.request(url);
        if (res.statusCode < 200 || res.statusCode >= 300)
            throw new Error(`Mailpit API error: ${res.statusCode}`);
        return JSON.parse(res.body);
    }
    async getMessage(id) {
        const res = await this.request(`${this.baseUrl}/message/${id}`);
        if (res.statusCode < 200 || res.statusCode >= 300)
            throw new Error(`Mailpit API error: ${res.statusCode}`);
        return JSON.parse(res.body);
    }
    async deleteByAddress(address) {
        await this.request(`${this.baseUrl}/search?query=${encodeURIComponent(`to:"${address}"`)}`, 'DELETE');
    }
}
