import {BufferMap} from "./buffer-map";
import {createSubject, DataListener, Subject, WeightListener} from "./subject";
import {SubjectAddress} from "./subject-address";
import {NodeIdentity} from "./identity";

export interface SubjectMap {
    publish(subjectAddress: SubjectAddress, data: Buffer, hops: NodeIdentity[]): void;
    interest(subjectAddress: SubjectAddress, listener: DataListener, weight: number): void;
    addWeightListener(subjectAddress: SubjectAddress, listener: WeightListener): void;
    removeWeightListener(subjectAddress: SubjectAddress, listener: WeightListener): void;

    addGlobalWeightListener(listener: WeightListener): void;
    removeGlobalWeightListener(listener: WeightListener): void;
    getInterestedSubjects(): Subject[];
}

export function createSubjectMap(): SubjectMap {
    return new SubjectMapImpl();
}

export class SubjectMapImpl implements SubjectMap {

    private map = new BufferMap<Subject>(32, [2, 2, 2]);
    private interestedSubjects: Subject[] = [];

    getInterestedSubjects(): Subject[] {
        return this.interestedSubjects;
    }

    private registerSubject(address: SubjectAddress): Subject {
        const subject = createSubject(address);

        subject.addWeightListener(
            (address, weight) => {
                const index = this.interestedSubjects.indexOf(subject);

                if (weight > 0) {
                    if (index === -1) {
                        this.interestedSubjects.push(subject);
                    }
                } else {
                    if (index > -1) {
                        this.interestedSubjects.splice(index, 1);
                    }
                }

                for(const listener of this.globalWeightListeners) {
                    listener(address, weight);
                }
            }
        )

        return subject;
    }

    publish(subjectAddress: SubjectAddress, data: Buffer, hops: NodeIdentity[]) {
        this.map.get(subjectAddress.bytes)?.publish(
            data, hops
        );
    }

    interest(subjectAddress: SubjectAddress, listener: DataListener, weight: number) {
        if (weight > 0) {
            this.map.getOrPut(subjectAddress.bytes, this.registerSubject.bind(this, subjectAddress)).interest(
                listener, weight
            );
        } else {
            this.map.get(subjectAddress.bytes)?.interest(
                listener, weight
            );
        }
    }

    addWeightListener(subjectAddress: SubjectAddress, listener: WeightListener) {
        this.map.getOrPut(subjectAddress.bytes, this.registerSubject.bind(this, subjectAddress)).addWeightListener(
            listener
        );
    }

    removeWeightListener(subjectAddress: SubjectAddress, listener: WeightListener) {
        this.map.get(subjectAddress.bytes)?.removeWeightListener(
            listener
        );
    }

    private globalWeightListeners: WeightListener[] = [];
    addGlobalWeightListener(listener: WeightListener) {
        const index = this.globalWeightListeners.indexOf(listener);
        if (index === -1) {
            this.globalWeightListeners.push(listener);
        }
    }
    removeGlobalWeightListener(listener: WeightListener) {
        const index = this.globalWeightListeners.indexOf(listener);
        this.globalWeightListeners.splice(index, 1);
    }

}