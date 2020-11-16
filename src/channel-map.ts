import {Channel, ChannelPublishListener, ChannelState, ChannelStateListener} from "./channel";

export type GlobalStateListener = (address: Buffer, channelState: ChannelState) => void;

function normalizeAddress(addr: Buffer): string {
    return addr.toString('base64');
}

export class ChannelMap {
    private map: {[normAddr: string]: Channel} = {};

    private globalStateListeners: GlobalStateListener[] = [];
    private updateState(channelAddress: Buffer, channelState: ChannelState) {
        this.globalStateListeners.forEach(
            globalStateListener => globalStateListener(channelAddress, channelState)
        );
    }

    addGlobalStateListener(globalStateListener: GlobalStateListener) {
        this.globalStateListeners.push(globalStateListener);
    }

    removeGlobalStateListener(globalStateListener: GlobalStateListener) {
        this.globalStateListeners.splice(
            this.globalStateListeners.indexOf(globalStateListener), 1
        );
    }

    private registerChannel(channelAddress: Buffer) {
        const channel = new Channel(channelAddress);

        channel.addStateListener(
            state => this.updateState(channelAddress, state),
            false
        );

        return channel;
    }

    private require(channelAddress: Buffer): Channel {
        return this.map[normalizeAddress(channelAddress)] ??= this.registerChannel(channelAddress);
    }

    publish(channelAddress: Buffer, payload: Buffer, publisher?: any) {
        this.map[normalizeAddress(channelAddress)]?.publish(payload, publisher);
    }

    subscribe(channelAddress: Buffer, publishListener: ChannelPublishListener, silent: boolean = false) {
        this.require(channelAddress).addPublishListener(
            publishListener, silent
        );
    }

    unsubscribe(channelAddress: Buffer, publishListener: ChannelPublishListener) {
        this.map[normalizeAddress(channelAddress)]?.removePublishListener(publishListener);
    }

    getState(channelAddress: Buffer): ChannelState {
        return this.map[normalizeAddress(channelAddress)]?.getState() ?? 'sleeping';
    }

    addStateListener(channelAddress: Buffer, stateListener: ChannelStateListener, initialState?: boolean) {
        return this.require(channelAddress).addStateListener(stateListener, initialState);
    }

    removeStateListener(channelAddress: Buffer, stateListener: ChannelStateListener) {
        this.map[normalizeAddress(channelAddress)]?.removeStateListener(stateListener)
    }

}
