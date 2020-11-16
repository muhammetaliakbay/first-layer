export type ChannelPublishListener = (payload: Buffer, channelAddress: Buffer, publisher: any | undefined) => void;

export type ChannelState = 'awake' | 'sleeping';
export type ChannelStateListener = (state: ChannelState, channelAddress: Buffer) => void;

export class Channel {
    constructor(
        readonly address: Buffer
    ) {
    }

    private state: ChannelState;
    getState(): ChannelState {
        return this.state;
    }

    private stateListeners: ChannelStateListener[] = [];
    private publishListeners: ChannelPublishListener[] = [];

    addStateListener(stateListener: ChannelStateListener, initialState: boolean = true) {
        this.stateListeners.push(stateListener);
        if (initialState) {
            stateListener(this.state, this.address);
        }
    }
    removeStateListener(stateListener: ChannelStateListener) {
        this.stateListeners.splice(
            this.stateListeners.indexOf(stateListener), 1
        );
    }

    addPublishListener(publishListener: ChannelPublishListener, silent: boolean = false) {
        this.publishListeners.push(publishListener);
        if (!silent && this.state === 'sleeping') {
            this.state = 'awake';
            this.stateListeners.forEach(stateListener => stateListener('awake', this.address));
        }
    }
    removePublishListener(publishListener: ChannelPublishListener) {
        this.publishListeners.splice(
            this.publishListeners.indexOf(publishListener), 1
        );
        if (this.publishListeners.length === 0 && this.state === 'awake') {
            this.state = 'sleeping';
            this.stateListeners.forEach(stateListener => stateListener('sleeping', this.address));
        }
    }

    publish(payload: Buffer, publisher?: any) {
        this.publishListeners.forEach(publishListener => publishListener(payload, this.address, publisher));
    }
}
