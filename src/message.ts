import {SubjectAddress} from "./subject-address";
import {isIdentityArray, NodeIdentity} from "./identity";

export enum MessageType {
    InterestMessage = 'interest',
    PublishMessage = 'publish',
    ConnectionInfoMessage = 'connection-info'
}

export interface InterestMessage {
    type: MessageType.InterestMessage;
    subjectAddress: SubjectAddress;
    weight: number;
}

export interface PublishMessage {
    type: MessageType.PublishMessage;
    subjectAddress: SubjectAddress;
    data: Buffer;
    hops: NodeIdentity[];
}

export interface ConnectionInfoMessage {
    type: MessageType.ConnectionInfoMessage;
    identity: NodeIdentity;
    url: string;
}

export type Message = InterestMessage | PublishMessage | ConnectionInfoMessage;

export function isInterestMessage(value: any): value is InterestMessage {
    return typeof value === 'object' &&
        value.type === MessageType.InterestMessage &&
        value.subjectAddress instanceof SubjectAddress &&
        typeof value.weight === 'number' && value.weight >= 0
}

export function isPublishMessage(value: any): value is PublishMessage {
    return typeof value === 'object' &&
        value.type === MessageType.PublishMessage &&
        value.subjectAddress instanceof SubjectAddress &&
        value.data instanceof Buffer &&
        isIdentityArray(value.hops)
}

export function isConnectionInfoMessage(value: any): value is ConnectionInfoMessage {
    return typeof value === 'object' &&
        value.type === MessageType.ConnectionInfoMessage &&
        value.identity instanceof NodeIdentity &&
        typeof value.url === 'string' &&
        typeof value.internal === 'boolean'
}

export function isMessage(value: any): value is Message {
    return isInterestMessage(value) || isPublishMessage(value) || isConnectionInfoMessage(value);
}
