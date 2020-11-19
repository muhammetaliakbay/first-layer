import {TreeMap} from "./tree-map";

export class BufferMap<T> extends TreeMap<Buffer, Buffer, T> {
    private partOffsets: number[] = [];
    private partEnds: number[] = [];
    private partCount: number;
    constructor(
        keyLength: number,
        partLengths: number[]
    ) {
        super();

        let offset = 0;
        for (const partLength of partLengths) {
            const end = offset + partLength;

            this.partOffsets.push(offset);
            this.partEnds.push(end);

            offset = end;
        }

        if (keyLength - offset > 0) {
            this.partOffsets.push(offset);
            this.partEnds.push(keyLength);
        }

        this.partCount = this.partOffsets.length;
    }

    protected compare(a: Buffer, b: Buffer, index: number): boolean {
        return a.equals(b);
    }

    protected keyPart(key: Buffer, index: number): Buffer | undefined {
        if (index > this.partCount) {
            return undefined;
        } else {
            const offset = this.partOffsets[index];
            const end = this.partEnds[index];

            return key.subarray(offset, end);
        }
    }
}
