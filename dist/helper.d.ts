import { MailpitConfig, MailpitMessageDetail } from './client.js';
export declare function makeAddress(project: string): string;
export declare function waitForEmail(address: string, config: MailpitConfig, timeoutMs?: number): Promise<MailpitMessageDetail>;
export declare function extractCode(email: MailpitMessageDetail): {
    otp: string | null;
    link: string | null;
};
export declare function cleanup(address: string, config: MailpitConfig): Promise<void>;
