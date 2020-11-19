import {randomBytes} from "./crypto";

export class NodeIdentity {
    constructor(readonly bytes: Buffer) {
        if (bytes.length != 32) {
            throw new Error('Layer identity must be 32 bytes long');
        }
    }

    equals(identity: NodeIdentity): boolean {
        return this.bytes.equals(identity.bytes);
    }

    toString() {
        return '0x' + this.bytes.toString('hex');
    }

    static createRandom() {
        return new NodeIdentity(randomBytes(32));
    }
}

export function isIdentityArray(value: any): value is NodeIdentity[] {
    return Array.isArray(value) &&
        value.every(test => test instanceof NodeIdentity)
}
