import {Message, MessageType} from "./message";
import {NodeIdentity} from "./identity";
import {SubjectMap, SubjectMapImpl} from "./subject-map";
import {DataListener, WeightListener} from "./subject";
import {SubjectAddress} from "./subject-address";
import {WebsocketNodeConnection} from "./websocket/websocket-node-connection";
import {node} from "./server/node";

export interface LayerNode extends SubjectMap {
    identity: NodeIdentity;

    hasConnection(identifier: ForeignNodeConnection | NodeIdentity | string): boolean;
    addConnection(connection: ForeignNodeConnection): boolean;
    removeConnection(connection: ForeignNodeConnection | NodeIdentity): ForeignNodeConnection | undefined;

    connect(url: string, identity?: NodeIdentity, internal?: boolean);
}

export function createLayerNode(): LayerNode {
    return new LayerNodeImpl();
}

export type MessageListener = (message: Message) => void;
export type ConnectionStateListener = (state: ConnectionState) => void;

export type ConnectionState = 'connected' | 'disconnected';

export interface ForeignNodeConnection {
    readonly identity: NodeIdentity;
    readonly url: string | undefined;
    readonly internal: boolean;

    addConnectionStateListener(listener: ConnectionStateListener): void;
    removeConnectionStateListener(listener: ConnectionStateListener): void;
    getConnectionState(): ConnectionState;

    addMessageListener(listener: MessageListener): void;
    removeMessageListener(listener: MessageListener): void;
    sendMessage(message: Message): void;
}

class LayerNodeImpl extends SubjectMapImpl implements LayerNode {

    readonly identity = NodeIdentity.createRandom();

    private connections: ForeignNodeConnection[] = [];
    private connectionCleanups: (() => void)[] = [];

    private setupConnection(connection: ForeignNodeConnection) {
        for (const otherConnection of this.connections) {
            if (!otherConnection.internal) {
                connection.sendMessage({
                    type: MessageType.ConnectionInfoMessage,
                    identity: otherConnection.identity,
                    url: otherConnection.url
                });
            }

            if (!connection.internal) {
                otherConnection.sendMessage({
                    type: MessageType.ConnectionInfoMessage,
                    identity: connection.identity,
                    url: connection.url
                });
            }
        }

        const ownInterests = this.getInterestedSubjects();
        for (const subject of ownInterests) {
            connection.sendMessage({
                type: MessageType.InterestMessage,
                weight: subject.weight,
                subjectAddress: subject.address
            });
        }

        const weightListener: WeightListener = (subjectAddress, weight) => {
            connection.sendMessage({
                type: MessageType.InterestMessage,
                weight,
                subjectAddress
            });
        }
        this.addGlobalWeightListener(weightListener);

        const dataListener: DataListener = (subjectAddress, data, hops) => {
            if (hops.findIndex(test => test.equals(connection.identity)) === -1) {
                connection.sendMessage({
                    type: MessageType.PublishMessage,
                    hops,
                    data,
                    subjectAddress
                });
            }
        };

        const interestedSubjects: SubjectAddress[] = [];

        const messageListener: MessageListener = message => {
            if (message.type === MessageType.InterestMessage) {

                const effectiveWeight = Math.min(Math.max(message.weight - 1, 0), 3);
                const index = interestedSubjects.findIndex(test => test.equals(message.subjectAddress));
                if (effectiveWeight > 0) {
                    if (index === -1) {
                        interestedSubjects.push(message.subjectAddress);
                    }
                } else {
                    if (index > -1) {
                        interestedSubjects.splice(index, 1);
                    }
                }
                this.interest(message.subjectAddress, dataListener, effectiveWeight);

            } else if (message.type === MessageType.PublishMessage) {

                if (message.hops.findIndex(test => test.equals(this.identity)) === -1) {
                    this.publish(
                        message.subjectAddress,
                        message.data,
                        [
                            ...message.hops,
                            connection.identity
                        ]
                    );
                }

            } else if (message.type === MessageType.ConnectionInfoMessage) {

                this.connect(message.url, message.identity).catch(
                    err => void 0
                );

            }
        };

        const connectionStateListener: ConnectionStateListener = (state) => {
            if (state !== 'connected') {
                this.removeConnection(connection);
            }
        }

        connection.addMessageListener(messageListener);
        connection.addConnectionStateListener(connectionStateListener);

        return () => {
            for (const subject of interestedSubjects) {
                this.interest(subject, dataListener, 0);
            }
            connection.removeMessageListener(messageListener);
            this.removeGlobalWeightListener(weightListener);
            connection.removeConnectionStateListener(connectionStateListener);
        }
    }

    hasConnection(identifier: ForeignNodeConnection | NodeIdentity | string): boolean {
        if (identifier == null) {
            throw new Error('Invalid connection identifier');
        } else if (typeof identifier === 'string') {
            return this.connections.find(connection => connection.url === identifier) != null;
        } else if (identifier instanceof NodeIdentity) {
            return this.connections.find(connection => connection.identity.equals(identifier)) != null;
        } else {
            return this.connections.includes(identifier);
        }
    }

    addConnection(connection: ForeignNodeConnection) {
        if (connection.getConnectionState() !== 'connected') {
            return false;
        } else {
            if (connection.identity.equals(this.identity)) {
                return false;
            }

            const old = this.connections.find(
                test => test.identity.equals(connection.identity) || (connection.url != null && connection.url === test.url)
            );

            if (old == null) {
                this.connectionCleanups.push(
                    this.setupConnection(connection)
                );
                this.connections.push(connection);
                // console.log('ADD-CONNECTION', connection.identity, connection.url)
                return true;
            } else {
                return false;
            }
        }
    }

    removeConnection(connection: ForeignNodeConnection | NodeIdentity) {
        const index = connection instanceof NodeIdentity ?
            this.connections.findIndex(test => test.identity.equals(connection)):
            this.connections.indexOf(connection);
        const found = this.connections[index];

        if (index > -1) {
            this.connections.splice(index, 1);
            const cleanup = this.connectionCleanups.splice(index, 1)[0];

            cleanup();

            // console.log('REMOVE-CONNECTION', found.identity, found.url);
        }

        return found;
    }

    async connect(url: string, identity?: NodeIdentity, internal?: boolean): Promise<ForeignNodeConnection> {
        if (!node.hasConnection(url) && (identity == null || !node.hasConnection(identity))) {
            if (url.startsWith('ws://') || url.startsWith('wss://')) {
                return await WebsocketNodeConnection.connect(node, url, internal);
            } else {
                throw new Error('Unsupported url scheme to connect');
            }
        } else {
            throw new Error('There is another connection already to the url');
        }
    }
}
