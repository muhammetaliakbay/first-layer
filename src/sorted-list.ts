export type CompareResult = number;

interface Ring<T> {
    previous: Ring<T> | undefined;
    next: Ring<T> | undefined;
    value: T;
    inserted: boolean;
}

export abstract class SortedList<T> implements Iterable<T> {
    private firstRing: Ring<T> | undefined = undefined;
    private lastRing: Ring<T> | undefined = undefined;
    private lengthCounter: number = 0;

    get length() {
        return this.lengthCounter;
    }

    first(): T | undefined {
        return this.firstRing?.value;
    }
    last(): T | undefined {
        return this.lastRing?.value;
    }

    private ringIterator(): Iterator<Ring<T>> {
        let ring = this.firstRing;
        return {
            next: () => {
                if (ring == null) {
                    return {
                        value: undefined,
                        done: true
                    };
                } else {
                    const previousRing = ring;
                    ring = ring.next;
                    return {
                        value: previousRing,
                        done: false
                    };
                }
            }
        };
    }
    private rings: Iterable<Ring<T>> = {
        [Symbol.iterator]: this.ringIterator.bind(this)
    };

    private findRing(predicate: (value: T) => boolean): Ring<T> | undefined {
        for (const ring of this.rings) {
            if (predicate(ring.value)) {
                return ring;
            }
        }

        return undefined;
    }

    private findNextRing(value: T): Ring<T> | undefined {
        for (const ring of this.rings) {
            if (this.compare(ring.value, value) >= 0) {
                return ring;
            }
        }

        return undefined;
    }

    private insertBefore(next: Ring<T> | undefined, value?: T): Ring<T> {
        const ring = {
            inserted: true,
            value
        } as Ring<T>;

        if (this.firstRing == null || this.lastRing == null) {
            if (next != null) {
                throw new Error('BUG!');
            }

            ring.next = null;
            ring.previous = null;

            this.firstRing = ring;
            this.lastRing = ring;
        } else if (next == null) {
            ring.next = null;
            ring.previous = this.lastRing;

            this.lastRing.next = ring;
            this.lastRing = ring;
        } else {
            ring.next = next;
            ring.previous = next.previous;

            if (next.previous != null) {
                next.previous.next = ring;
            } else {
                this.firstRing = ring;
            }

            next.previous = ring;
        }

        this.lengthCounter ++;

        return ring;
    }

    private removeRing(ring: Ring<T>): void {
        if (ring.inserted) {

            if (ring.next != null) {
                ring.next.previous = ring.previous;
            } else {
                this.lastRing = ring.previous;
            }

            if (ring.previous != null) {
                ring.previous.next = ring.next;
            } else {
                this.firstRing = ring.next;
            }

            this.lengthCounter --;
            ring.inserted = false;
        }
    }

    insert(value: T): void {
        const nextRing = this.findNextRing(value);
        this.insertBefore(nextRing, value);
    }

    findReference(
        predicate: (value: T) => boolean
    ): {
        remove(): void,
        value: T | undefined
    } {
        const ring = this.findRing(predicate);
        const value = ring?.value;

        return {
            value,
            remove: ring == null ? () => {} : this.removeRing.bind(this, ring)
        };
    }

    [Symbol.iterator](): Iterator<T> {
        let ringIterator = this.ringIterator();
        return {
            next() {
                const next = ringIterator.next();
                if (next.done) {
                    return {
                        done: true,
                        value: undefined
                    };
                } else {
                    return {
                        done: false,
                        value: next.value.value
                    };
                }
            }
        };
    }

    protected abstract compare(a: T, b: T): CompareResult;
}
