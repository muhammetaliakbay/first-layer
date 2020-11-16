import {WorkerMessage} from "./message";
import {ChannelMap} from "../channel-map";
import {ChannelPublishListener} from "../channel";
import WebSocket from 'ws';
import {IncomingMessage} from "http";
import {
    decodeBufferPacket,
    decodeStringPacket,
    encodeBufferPacket,
    Packet,
    PacketType
} from "../packet";

const map = new ChannelMap();

const MasterPublisher = Symbol('MasterPublisher');

const publishListener: ChannelPublishListener = (payload, channelAddress, publisher) => {
    if (publisher !== MasterPublisher) {
        process.send({
            publish: channelAddress,
            payload
        } as WorkerMessage);
    }
}

map.addGlobalStateListener(
    (address, channelState) => {
        if (channelState === 'awake') {
            process.send({
                subscribe: address,
            } as WorkerMessage);
        } else if (channelState === 'sleeping') {
            process.send({
                unsubscribe: address,
            } as WorkerMessage);
        }
    }
);

process.on('message', (message: WorkerMessage) => {

    if (message === 'ready') {
        listen();
    } else if ('subscribe' in message) {
        map.subscribe(message.subscribe, publishListener, true);
    } else if ('unsubscribe' in message) {
        map.unsubscribe(message.unsubscribe, publishListener);
    } else if ('publish' in message) {
        map.publish(message.publish, message.payload, MasterPublisher);
    }

});

process.send('ready' as WorkerMessage);

function listen() {
    const server = new WebSocket.Server({
        port: 80
    });

    server.on('connection', session);
}

function session(socket: WebSocket, request: IncomingMessage) {
    const publishListener: ChannelPublishListener = (payload, channelAddress, publisher) => {
        if (publisher !== socket) {
            const packet = encodeBufferPacket({
                type: PacketType.Publish,
                address: channelAddress,
                payload
            });

            socket.send(
                packet
            );
        }
    };
    const subscriptions: string[] = [];

    socket.on('message', data => {
        // console.log('Incoming WS message', data);

        let packet: Packet;
        if (data instanceof Buffer) {
            packet = decodeBufferPacket(data);
        } else if (typeof data === 'string') {
            packet = decodeStringPacket(data);
        } else {
            throw new Error('Invalid packet');
        }

        // console.log('Incoming WS packet', packet, address);

        if (packet.type === PacketType.Subscribe) {
            map.subscribe(packet.address, publishListener);
            subscriptions.push(packet.address.toString('base64'));
        } else if (packet.type === PacketType.Unsubscribe) {
            map.unsubscribe(packet.address, publishListener);
            subscriptions.splice(subscriptions.indexOf(packet.address.toString('base64')), 1);
        } else if (packet.type === PacketType.Publish) {
            map.publish(packet.address, packet.payload, socket);
        }
    });

    socket.on('close', () => {
        for (const sub of subscriptions) {
            map.unsubscribe(Buffer.from(sub, 'base64'), publishListener);
        }
    });
}
