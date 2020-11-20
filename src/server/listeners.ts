import {getParameters, hasFlag} from "./parameters";
import WebSocket from 'ws';
import {createServer} from "http";
import {node} from "./node";
import {WebsocketNodeConnection} from "../websocket/websocket-node-connection";
import {addInternalDiscoverListener, setupInternalDiscovery} from "./discover-internal";

function session(socket: WebSocket) {
    WebsocketNodeConnection.connect(node, socket as any, true).catch(
        reason => console.error('ERROR while establishing WS connection', reason)
    );
}

const port = Number(getParameters('--port')[0] ?? 80);

console.log('Port: ' + port);

if (port > -1) {
    const server = createServer(
        function(request, response) {
            response.writeHead(200);
            response.write(node.identity.bytes.toString('hex'));
            response.end();
        }
    );

    const wsServer = new WebSocket.Server({
        server: server
    });

    wsServer.on('connection', session);
    server.listen(port);
} else {
    console.log('No Server');
}

if (hasFlag('--cluster')) {
    console.log('--cluster');

    const internalServer = createServer();
    const internalWSServer = new WebSocket.Server({
        server: internalServer
    });

    internalWSServer.on('connection', session);
    internalServer.listen({
        host: '127.0.0.1',
        port: 0,
        exclusive: true
    }, () => {
        const privateURL = 'ws://127.0.0.1:' + (internalServer.address() as any).port;
        console.log('Internal (Private) Server', privateURL);
        setupInternalDiscovery(privateURL, node.identity);
    });

    addInternalDiscoverListener(
        (internalURL, identity) => {
            // console.log('Found', internalURL, identity);
            node.connect(internalURL, identity, true).catch(err => void 0);
        }
    );
}
