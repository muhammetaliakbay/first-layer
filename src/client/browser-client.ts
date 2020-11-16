import {ChannelMap} from "../channel-map";
import {
    decodeBufferPacket,
    decodeStringPacket,
    encodeBufferPacket,
    InvalidPacketTypeError,
    Packet,
    PacketType
} from "../packet";

export type DataListener = (data: Buffer, address: Buffer) => void;

export class BrowserClient {
    private map = new ChannelMap();

    private constructor(readonly socket: WebSocket) {
        this.map.addGlobalStateListener(
            (address, channelState) => {
                if (channelState === 'awake') {
                    this.socket.send(encodeBufferPacket({
                        type: PacketType.Subscribe,
                        address
                    }));
                } else if (channelState === 'sleeping') {
                    this.socket.send(encodeBufferPacket({
                        type: PacketType.Unsubscribe,
                        address
                    }));
                }
            }
        );
        socket.addEventListener('message', ({data}) => {
            let packet: Packet;
            if (data instanceof Buffer) {
                packet = decodeBufferPacket(data);
            } else if (typeof data === 'string') {
                packet = decodeStringPacket(data);
            } else {
                throw new Error('Invalid packet');
            }

            if (packet.type === PacketType.Publish) {
                this.map.publish(packet.address, packet.payload);
            } else {
                throw new InvalidPacketTypeError();
            }
        });
    }

    static connect(socketURL: string): Promise<BrowserClient> {
        const socket = new WebSocket(socketURL);
        const client = new BrowserClient(socket);
        return new Promise<BrowserClient>(
            (resolve, reject) => {
                socket.addEventListener('open', () => {
                    resolve(client)
                });
                socket.addEventListener('close', () => {
                    reject(new Error('socket closed too early'))
                });
                socket.addEventListener('error', () => {
                    reject(new Error('socket error'))
                });
            }
        );
    }

    publish(address: Buffer, data: Buffer): void {
        this.socket.send(encodeBufferPacket({
            type: PacketType.Publish,
            address,
            payload: data
        }));
    }
    subscribe(address: Buffer, listener: DataListener): void {
        this.map.subscribe(address, listener);
    }
    unsubscribe(address: Buffer, listener: DataListener): void {
        this.map.unsubscribe(address, listener);
    }
}
