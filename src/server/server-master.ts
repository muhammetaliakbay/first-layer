import * as cluster from "cluster";
import {ChannelMap} from "../channel-map";
import {ChannelPublishListener} from "../channel";
import {WorkerMessage} from "./message";

const workerCount = require('os').cpus().length;

interface WorkerMeta {
    worker: cluster.Worker;
    id: number;
}

const map = new ChannelMap();

const workers: WorkerMeta[] = [];
let unreadyWorkers = workerCount;
for (let id = 0; id < workerCount; id ++) {
    const worker = cluster.fork({
        id
    });

    map.addGlobalStateListener(
        (address, channelState) => {
            if (channelState === 'awake') {
                worker.send({
                    subscribe: address
                } as WorkerMessage);
            } else if (channelState === 'sleeping') {
                worker.send({
                    unsubscribe: address
                } as WorkerMessage);
            }
        }
    );

    workers.push(
        {
            worker,
            id
        }
    );

    const publishListener: ChannelPublishListener = (payload, address, publisher) => {
        if (publisher !== id) {
            worker.send({
                payload,
                publish: address
            } as WorkerMessage);
        }
    };

    worker.on('message', (message: WorkerMessage) => {
        if (message === 'ready') {

            console.log(`Worker #${id} is ready.`)

            unreadyWorkers --;
            if (unreadyWorkers === 0) {
                console.log(`All workers is ready. Starting to listen clients.`)

                for (const {worker} of workers) {
                    worker.send('ready');
                }
            }

        } else if ('subscribe' in message) {

            map.subscribe(message.subscribe, publishListener);

        } else if ('unsubscribe' in message) {

            map.unsubscribe(message.unsubscribe, publishListener);

        } else if ('publish' in message) {

            map.publish(message.publish, message.payload, id);

        }
    });
}
