export interface MailpitConfig {
    host: string;
    apiUser: string;
    apiPass: string;
    smtpPort?: number;
    project: string;
}
export interface MailpitMessage {
    ID: string;
    Subject: string;
    From: {
        Address: string;
        Name: string;
    };
    To: Array<{
        Address: string;
        Name: string;
    }>;
    Tags: string[];
    Date: string;
}
export interface MailpitMessageDetail extends MailpitMessage {
    Text: string;
    HTML: string;
}
export interface MailpitMessagesResponse {
    messages: MailpitMessage[];
    total: number;
}
export declare class MailpitClient {
    private config;
    private baseUrl;
    private auth;
    private agent;
    constructor(config: MailpitConfig);
    private request;
    getMessages(query?: string): Promise<MailpitMessagesResponse>;
    getMessage(id: string): Promise<MailpitMessageDetail>;
    deleteByAddress(address: string): Promise<void>;
}
