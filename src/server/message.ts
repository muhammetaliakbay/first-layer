export type WorkerMessage = {
    subscribe: Buffer
} | {
    unsubscribe: Buffer
} | {
    publish: Buffer,
    payload: Buffer
} | 'ready';
