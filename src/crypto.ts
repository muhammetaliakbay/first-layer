const browserCrypto = typeof window === 'undefined' ? undefined : window.crypto;

const nodejsCrypto = (() => {
    try {
        return require('crypto') as typeof import('crypto');
    } catch (e) {
        return undefined;
    }
}) ();

export function randomBytes(length: number): Buffer {
    if (nodejsCrypto) {
        return nodejsCrypto.randomBytes(length);
    } else if(browserCrypto) {
        return Buffer.from(browserCrypto.getRandomValues(new Uint8Array(length)));
    } else {
        throw new Error('No crypto-provider found');
    }
}

export async function sha256(input: Buffer): Promise<Buffer> {
    if (nodejsCrypto) {
        return nodejsCrypto.createHash('sha256').update(input).digest();
    } else if(browserCrypto) {
        return Buffer.from(await browserCrypto.subtle.digest('sha256', input));
    } else {
        throw new Error('No crypto-provider found');
    }
}
