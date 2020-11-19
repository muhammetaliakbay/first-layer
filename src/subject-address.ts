import {sha256} from "./crypto";
import {BufferMap} from "./buffer-map";

export class SubjectAddress {
    private static knownNames = new BufferMap<string>(32, [2, 2]);

    constructor(readonly bytes: Buffer) {
        if (bytes.length != 32) {
            throw new Error('Subject address must be 32 bytes long');
        }
    }

    equals(address: SubjectAddress): boolean {
        return this.bytes.equals(address.bytes);
    }

    toString() {
        const name = SubjectAddress.knownNames.get(this.bytes);
        return name == null ? '0x' + this.bytes.toString('hex') : JSON.stringify(name);
    }

    static async resolve(name: string): Promise<SubjectAddress> {
        const bytes = await sha256(Buffer.from(name, 'utf8'));
        SubjectAddress.knownNames.put(bytes, name);
        return new SubjectAddress(bytes);
    }
}
