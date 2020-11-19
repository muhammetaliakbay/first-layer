import {
    ConnectionState,
    ConnectionStateListener,
    ForeignNodeConnection,
    LayerNode,
    MessageListener
} from "../layer-node";
import {NodeIdentity} from "../identity";
import {isMessage, Message, MessageType} from "../message";
import {decodeBSONMessage, encodeBSONMessage} from "../message-util";

export const WebSocketConstructor: typeof WebSocket = typeof WebSocket === 'undefined' ? require('ws') : WebSocket;

export class WebsocketNodeConnection implements ForeignNodeConnection {
    private socketMessageListener = ({data}: MessageEvent) => {
        let bufferData: Buffer;
        if (data instanceof Buffer) {
            bufferData = data;
        } else if (data instanceof ArrayBuffer) {
            bufferData = Buffer.from(data);
        } else {
            throw new Error('Unexpected message format');
        }

        try {
            const message = decodeBSONMessage(bufferData);
            if (message.type === 'initial') {
                throw new Error('Initial message is not accepted at this state');
            } else {
                for(const listener of this.messageListeners) {
                    listener(message);
                }
            }
        } catch (e) {
            console.error('ERROR while parsing message', e);
            this.socket.close();
        }
    };
    private messageListeners: MessageListener[] = [];
    addMessageListener(listener: MessageListener) {
        const index = this.messageListeners.indexOf(listener);
        if (index === -1) {
            this.messageListeners.push(listener);

            if (listener.length === 1) {
                this.socket.addEventListener('message', this.socketMessageListener);
            }
        }
    }
    removeMessageListener(listener: MessageListener) {
        const index = this.messageListeners.indexOf(listener);

        if (index > -1) {
            this.messageListeners.splice(index, 1);

            if (listener.length === 0) {
                this.socket.removeEventListener('message', this.socketMessageListener);
            }
        }
    }

    private socketStateListener = () => {
        const state = this.getConnectionState();
        for(const listener of this.stateListeners) {
            listener(state);
        }
    };
    private stateListeners: ConnectionStateListener[] = [];
    getConnectionState(): ConnectionState {
        return this.socket.readyState === 1 /*OPEN*/ ? 'connected' : 'disconnected';
    }

    addConnectionStateListener(listener: ConnectionStateListener) {
        const index = this.stateListeners.indexOf(listener);
        if (index === -1) {
            this.stateListeners.push(listener);

            if (listener.length === 1) {
                this.socket.addEventListener('open', this.socketStateListener);
                this.socket.addEventListener('close', this.socketStateListener);
                this.socket.addEventListener('error', this.socketStateListener);
            }
        }
    }
    removeConnectionStateListener(listener: ConnectionStateListener) {
        const index = this.stateListeners.indexOf(listener);

        if (index > -1) {
            this.stateListeners.splice(index, 1);

            if (listener.length === 0) {
                this.socket.removeEventListener('open', this.socketStateListener);
                this.socket.removeEventListener('close', this.socketStateListener);
                this.socket.removeEventListener('error', this.socketStateListener);
            }
        }
    }

    readonly url: string | undefined;

    private constructor(
        readonly identity: NodeIdentity,
        readonly socket: WebSocket,
        readonly internal: boolean
    ) {
        this.url = socket.url;
    }

    async sendMessage(message: Message) {
        this.socket.send(
            encodeBSONMessage(message)
        );
    }

    static connect(node: LayerNode, socketOrURL: WebSocket | string, skipWaitingOpen: boolean = false, internal: boolean = false): Promise<WebsocketNodeConnection> {
        let socket: WebSocket;

        if (typeof socketOrURL === 'string') {
            socket = new WebSocketConstructor(socketOrURL);
        } else {
            socket = socketOrURL;
        }

        const socketReady = skipWaitingOpen ? Promise.resolve(socket) : new Promise<WebSocket>(
            (resolve, reject) => {
                function openListener() {
                    resolve(socket);
                    cleanup();
                }

                function closeListener() {
                    reject(new Error('socket closed before connect'));
                    cleanup();
                }

                function errorListener() {
                    reject(new Error('socket error'));
                    cleanup();
                }

                socket.addEventListener('open', openListener);
                socket.addEventListener('close', closeListener);
                socket.addEventListener('error', errorListener);

                function cleanup() {
                    socket.removeEventListener('open', openListener);
                    socket.removeEventListener('close', closeListener);
                    socket.removeEventListener('error', errorListener);
                }
            }
        );

        return socketReady.then(
            socket => new Promise<WebsocketNodeConnection>(
                (resolve, reject) => {
                    socket.send(
                        encodeBSONMessage({
                            type: 'initial',
                            identity: node.identity
                        })
                    );

                    function initListener({data}: MessageEvent) {
                        try {
                            let bufferData: Buffer;
                            if (data instanceof Buffer) {
                                bufferData = data;
                            } else if (data instanceof ArrayBuffer) {
                                bufferData = Buffer.from(data);
                            } else {
                                throw new Error('Unexpected message format');
                            }

                            const message = decodeBSONMessage(Buffer.from(bufferData));
                            if (message.type === 'initial') {

                                const connection = new WebsocketNodeConnection(message.identity, socket, internal);
                                if (node.addConnection(connection)) {
                                    resolve(connection);
                                } else {
                                    throw new Error('LayerNode didn\'t accept the connection');
                                }

                            } else {
                                throw new Error('Expected initial message. Got: ' + message.type);
                            }
                        } catch (e) {
                            reject(e);
                            socket.close();
                        } finally {
                            cleanup();
                        }
                    }

                    function closeListener() {
                        reject(new Error('socket closed before establish'));
                        cleanup();
                    }

                    function errorListener() {
                        reject(new Error('socket error'));
                        cleanup();
                    }

                    socket.addEventListener('message', initListener);
                    socket.addEventListener('close', closeListener);
                    socket.addEventListener('error', errorListener);

                    function cleanup() {
                        socket.removeEventListener('message', initListener);
                        socket.removeEventListener('close', closeListener);
                        socket.removeEventListener('error', errorListener);
                    }
                }
            )
        );
    }

}
