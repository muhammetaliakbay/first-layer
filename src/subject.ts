import {CompareResult, SortedList} from "./sorted-list";
import {SubjectAddress} from "./subject-address";
import {NodeIdentity} from "./identity";

export type DataListener = (subjectAddress: SubjectAddress, data: Buffer, hops: NodeIdentity[]) => void;
export type WeightListener = (subjectAddress: SubjectAddress, weight: number) => void;

export interface Subject {
    readonly weight: number;
    readonly address: SubjectAddress;
    interest(listener: DataListener, weight: number): void;
    addWeightListener(listener: WeightListener): void;
    removeWeightListener(listener: WeightListener): void;
    publish(data: Buffer, hops: NodeIdentity[]): void;
}

interface Interest {
    listener: DataListener;
    weight: number;
}

class InterestList extends SortedList<Interest> {
    protected compare(a: Interest, b: Interest): CompareResult {
        return b.weight - a.weight;
    }

    maxWeightInterest(): Interest | undefined {
        return this.first();
    }
}

export function createSubject(subjectAddress: SubjectAddress): Subject {
    return new SubjectImpl(subjectAddress);
}

class SubjectImpl implements Subject {
    constructor(
        readonly address: SubjectAddress
    ) {
    }

    get weight(): number {
        return this.interests.maxWeightInterest()?.weight ?? 0;
    }

    publish(data: Buffer, hops: NodeIdentity[]) {
        for (const interest of this.interests) {
            interest.listener(this.address, data, hops);
        }
    }

    private interests = new InterestList();
    interest(listener: DataListener, weight: number): void {
        if (!(weight >= 0)) {
            throw new Error('Invalid Weight(must be >= 0): ' + weight);
        }

        const previousMaxWeight = this.weight;

        this.interests
            .findReference(elm => elm.listener === listener)
            .remove();

        if (weight > 0) {
            const interest: Interest = {
                listener,
                weight
            };
            this.interests.insert(interest);
        }

        if (previousMaxWeight !== this.weight) {
            this.weightUpdated(this.weight);
        }
    }

    private weightListeners: WeightListener[] = [];
    addWeightListener(listener: WeightListener) {
        if (!this.weightListeners.includes(listener)) {
            this.weightListeners.push(listener);
        }
    }
    removeWeightListener(listener: WeightListener) {
        this.weightListeners.splice(
            this.weightListeners.indexOf(listener), 1
        );
    }

    private weightUpdated(newWeight: number) {
        for (const listener of this.weightListeners) {
            listener(this.address, newWeight);
        }
    }
}
