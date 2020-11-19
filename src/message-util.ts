import {isMessage, Message, MessageType} from "./message";
import {deserialize, Document, serialize} from "bson";
import {NodeIdentity} from "./identity";
import {SubjectAddress} from "./subject-address";

export function encodeBSONMessage(message: Message | InitialMessage): Buffer {
    let serializableMessage: Document = {
        ...message
    };

    if (message.type === 'initial') {
        serializableMessage.identity = message.identity.bytes;
    } else if (message.type === MessageType.InterestMessage) {
        serializableMessage.subjectAddress = message.subjectAddress.bytes;
    } else if (message.type === MessageType.PublishMessage) {
        serializableMessage.subjectAddress = message.subjectAddress.bytes;
        serializableMessage.hops = message.hops.map(
            hop => hop.bytes
        );
    } else if (message.type === MessageType.ConnectionInfoMessage) {
        serializableMessage.identity = message.identity.bytes;
    } else {
        throw new Error('Invalid message type: ' + (message as any).type);
    }

    return serialize(serializableMessage);
}

export function decodeBSONMessage(packet: Buffer): Message | InitialMessage {
    const serializableMessage: any = deserialize(packet, {
        promoteBuffers: true
    });

    if (serializableMessage.type === 'initial') {
        serializableMessage.identity = new NodeIdentity(serializableMessage.identity);
    } else if (serializableMessage.type === MessageType.InterestMessage) {
        serializableMessage.subjectAddress = new SubjectAddress(serializableMessage.subjectAddress);
    } else if (serializableMessage.type === MessageType.PublishMessage) {
        serializableMessage.subjectAddress = new SubjectAddress(serializableMessage.subjectAddress);
        serializableMessage.hops = serializableMessage.hops.map(
            hop => new NodeIdentity(hop)
        );
    } else if (serializableMessage.type === MessageType.ConnectionInfoMessage) {
        serializableMessage.identity = new NodeIdentity(serializableMessage.identity);
    } else {
        throw new Error('Invalid message type: ' + serializableMessage.type);
    }

    if (isInitialMessage(serializableMessage) || isMessage(serializableMessage)) {
        return serializableMessage;
    } else {
        throw new Error('Invalid message');
    }
}

export interface InitialMessage {
    type: 'initial';
    identity: NodeIdentity;
}
export function isInitialMessage(val: any): val is InitialMessage {
    return typeof val === 'object' && val.identity instanceof NodeIdentity;
}