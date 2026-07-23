/**
 * Upstash QStash Serverless Queue Service
 * Handles asynchronous job queuing, anti-ban delay scheduling, idempotency, and retries
 */

export interface QueueJobPayload {
    campaignId: string;
    recipientId: string;
    phoneE164: string;
    recipientName?: string;
    materialTitles: string[];
    delaySeconds: number;
    idempotencyKey: string;
}

export class UpstashQStashService {
    private static QSTASH_URL = 'https://qstash.upstash.io/v2/publish';

    /**
     * Publishes job to QStash queue with delay and idempotency deduplication key
     */
    public static async publishDispatchJob(payload: QueueJobPayload): Promise<{ success: boolean; messageId?: string }> {
        const token = typeof process !== 'undefined' ? process.env.QSTASH_TOKEN : '';
        const workerUrl = typeof process !== 'undefined' ? process.env.VERCEL_WORKER_URL : '';

        if (!token || !workerUrl) {
            // Local fallback simulation
            return {
                success: true,
                messageId: `msg_${Date.now()}_${Math.floor(Math.random() * 1000)}`
            };
        }

        try {
            const response = await fetch(`${UpstashQStashService.QSTASH_URL}/${workerUrl}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Upstash-Delay': `${payload.delaySeconds}s`,
                    'Upstash-Deduplication-Id': payload.idempotencyKey,
                    'Upstash-Retries': '3'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            return {
                success: response.ok,
                messageId: data.messageId
            };
        } catch (e) {
            console.error('QStash publish failure', e);
            return { success: false };
        }
    }
}
