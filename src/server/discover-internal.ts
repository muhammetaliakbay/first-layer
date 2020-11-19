import pm2, {ProcessDescription} from 'pm2';
import {NodeIdentity} from "../identity";

let pm2Connection: Promise<void> | null;
function pm2Connect(): Promise<void> {
    return pm2Connection ??= new Promise(
        (resolve, reject) => {
            pm2.connect(err => {
                if (err != null) {
                    reject(err);
                } else {
                    resolve(void 0);
                }
            });
        }
    );
}

function pm2ListIDs(): Promise<number[]> {
    return pm2Connect().then(
        () => new Promise<ProcessDescription[]>(
            (resolve, reject) => {
                pm2.list((err, processDescriptionList) => {
                    if (err != null) {
                        reject(err);
                    } else {
                        resolve(processDescriptionList);
                    }
                })
            }
        )
    ).then(
        list => list.filter(
            d => d.pid !== process.pid && d.pm2_env.status === 'online'
        ).map(
            list => list.pm_id
        )
    );
}

function pm2DescribePID(pid: number): Promise<ProcessDescription | undefined> {
    return pm2Connect().then(
        () => new Promise<ProcessDescription[]>(
            (resolve, reject) => {
                pm2.list((err, processDescriptionList) => {
                    if (err != null) {
                        reject(err);
                    } else {
                        resolve(processDescriptionList);
                    }
                })
            }
        )
    ).then(
        list => list.find(
            d => d.pid === pid
        )
    );
}

function pm2Send(id: number, data: any): Promise<void> {
    return pm2Connect().then(
        () => new Promise<void>(
            (resolve, reject) => {
                pm2.sendDataToProcessId(
                    id, {
                        type : 'process:msg',
                        data : data,
                        topic: 'first-layer'
                    }, (err) => {
                        if (err != null) {
                            reject(err);
                        } else {
                            resolve(void 0);
                        }
                    }
                );
            }
        )
    );
}

interface InternalDiscoverMessage {
    type: 'discover-internal';
    internalURL: string,
    identityHex: string
}

function isInternalDiscoverMessage(value: any): value is InternalDiscoverMessage {
    return typeof value === 'object' &&
        value.type === 'discover-internal' &&
        typeof value.internalURL === 'string' &&
        typeof value.identityHex === 'string';
}

export type InternalDiscoverListener = (internalURL: string, identity: NodeIdentity) => void;
const discoverListeners: InternalDiscoverListener[] = [];

export function addInternalDiscoverListener(listener: InternalDiscoverListener) {
    const index = discoverListeners.indexOf(listener);
    if (index === -1) {
        discoverListeners.push(listener);
        if (discoverListeners.length === 1) {
            process.addListener('message', messageListener);
        }
    }
}

export function removeInternalDiscoverListener(listener: InternalDiscoverListener) {
    const index = discoverListeners.indexOf(listener);
    if (index === -1) {
        discoverListeners.splice(index, 1);
        if (discoverListeners.length === 0) {
            process.removeListener('message', messageListener);
        }
    }
}

function messageListener(message: any) {
    if (typeof message === 'object' && message.topic === 'first-layer' && isInternalDiscoverMessage(message.data)) {
        const identity = new NodeIdentity(Buffer.from(message.data.identityHex, 'hex'));
        for (const listener of discoverListeners) {
            listener(message.data.internalURL, identity);
        }
    }
}

let setup = false;
export function setupInternalDiscovery(internalURL: string, identity: NodeIdentity): void {
    if (!setup) {
        setup = true;

        const identityHex = identity.bytes.toString('hex');

        let skip = false;
        function discover() {
            if (!skip) {
                skip = true;
                pm2ListIDs().then(
                    ids => Promise.all(
                        ids.map(
                            id => pm2Send(id, {
                                type: 'discover-internal',
                                internalURL,
                                identityHex
                            } as InternalDiscoverMessage)
                        )
                    )
                ).finally(
                    () => skip = false
                );
            }
        }

        setInterval(
            discover,
            10000
        );

        discover();
    } else {
        throw new Error('Already setup for: ' + internalURL);
    }
}
