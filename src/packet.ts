import {parseJSONs} from "./human";

export enum PacketType {
    Subscribe = 'subscribe',
    Unsubscribe = 'unsubscribe',
    Publish = 'publish'
}

export interface SubscribePacket {
    type: PacketType.Subscribe;
    address: Buffer;
}

export interface UnsubscribePacket {
    type: PacketType.Unsubscribe;
    address: Buffer;
}

export interface PublishPacket {
    type: PacketType.Publish;
    address: Buffer;
    payload: Buffer;
}

export type Packet = SubscribePacket | UnsubscribePacket | PublishPacket;

export function isPacket(val: any): val is Packet {
    return typeof val === 'object' && 'type' in val && 'address' in val &&
        (val.address instanceof Buffer && val.address.length === 32) &&
        (
            'payload' in val ?
                (val.payload instanceof Buffer && val.type === PacketType.Publish) :
                (val.type === PacketType.Subscribe || val.type === PacketType.Unsubscribe)
        )
}

export class InvalidPacketLengthError extends Error {
    constructor() {
        super('InvalidPacketLength');
    }
}
export class InvalidPacketTypeError extends Error {
    constructor() {
        super('InvalidPacketType');
    }
}

export class InvalidStringPacketError extends Error {
    constructor() {
        super('InvalidStringPacket');
    }
}

export function decodeStringPacket(packet: string): Packet {
    const parts = parseJSONs(packet);

    const type: PacketType = parts[0];
    let address = parts[1];

    if (address instanceof Buffer && address.length < 32) {
        address = Buffer.concat([
            address,
            Buffer.alloc(32 - address.length)
        ]);
    }

    const payload = parts[2];

    const decoded: any = {
        type,
        address
    };

    if (payload != null) {
        decoded.payload = payload;
    }

    if (isPacket(decoded)) {
        return decoded;
    } else {
        throw new InvalidStringPacketError();
    }
}

export function decodeBufferPacket(packet: Buffer): Packet {
    const packetType = packet.readUInt8(0);

    const address = packet.subarray(1, 1 + 32);
    if (address.length !== 32) {
        throw new InvalidPacketLengthError();
    }

    if (packetType === 0) {
        return {
            type: PacketType.Subscribe,
            address
        };
    } else if (packetType === 1) {
        return {
            type: PacketType.Unsubscribe,
            address
        };
    } else if (packetType === 2) {
        const payload = packet.subarray(1 + 32);

        return {
            type: PacketType.Publish,
            address,
            payload
        };
    } else {
        throw new InvalidPacketTypeError();
    }
}

const codeByType = {
    [PacketType.Subscribe]: Buffer.from('00', 'hex'),
    [PacketType.Unsubscribe]: Buffer.from('01', 'hex'),
    [PacketType.Publish]: Buffer.from('02', 'hex')
}

export class InvalidAddressError extends Error {
    constructor() {
        super('InvalidAddress');
    }
}

export function encodeBufferPacket(packet: Packet): Buffer {
    if (packet.address.length !== 32) {
        throw new InvalidAddressError();
    }

    const parts = [
        codeByType[packet.type],
        packet.address
    ];

    if ('payload' in packet) {
        parts.push(packet.payload)
    }

    return Buffer.concat(parts);
}

export function encodeStringPacket(packet: Packet): string {
    if (packet.address.length !== 32) {
        throw new InvalidAddressError();
    }

    let str = packet.type + ' 16x' + packet.address.toString('hex');

    if ('payload' in packet) {
        str += ' 16x' + packet.payload.toString('hex');
    }

    return str;
}
