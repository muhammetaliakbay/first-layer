import {createLayerNode, ForeignNodeConnection} from "../layer-node";
import {WebsocketNodeConnection} from "../websocket/websocket-node-connection";
import WebSocket from "ws";
import {NodeIdentity} from "../identity";

export async function connect(url: string, identity?: NodeIdentity, internal?: boolean): Promise<ForeignNodeConnection> {
    if (!node.hasConnection(url) && (identity == null || !node.hasConnection(identity))) {
        if (url.startsWith('ws://') || url.startsWith('wss://')) {
            return await WebsocketNodeConnection.connect(node, new WebSocket(url) as any, internal);
        } else {
            throw new Error('Unsupported url scheme to connect');
        }
    } else {
        throw new Error('There is another connection already to the url');
    }
}

export const node = createLayerNode();
