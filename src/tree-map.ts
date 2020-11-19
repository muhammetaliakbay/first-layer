interface TreeNode<K, KP, T> {
    keyPart: KP;
    children: TreeNode<K, KP, T>[];
    value: T;
}

export abstract class TreeMap<K, KP, T> {
    private root: TreeNode<K, KP, T> = {
        keyPart: undefined,
        children: [],
        value: undefined
    };

    private getTreeNode(key: K, fill: boolean = false) {
        let node = this.root;
        for (const {keyPart, index} of this.keyPartIterable(key)) {
            let childNode = node.children.find(
                ({keyPart: b}) => this.compare(keyPart, b, index)
            );

            if (childNode === undefined) {
                if (fill) {
                    childNode = {
                        children: [],
                        value: undefined,
                        keyPart: keyPart
                    };
                    node.children.push(childNode);
                } else {
                    return undefined;
                }
            }

            node = childNode;
        }
        return node;
    }

    put(key: K, value: T): T | undefined {
        const node = this.getTreeNode(key, true);
        const oldValue = node.value;
        node.value = value;
        return oldValue;
    }

    get(key: K): T | undefined {
        const node = this.getTreeNode(key);
        return node?.value;
    }

    getOrPut(key: K, gen: () => T): T {
        const node = this.getTreeNode(key, true);
        return node.value ??= gen();
    }

    private keyPartIterator(key: K): Iterator<{keyPart: KP, index: number}> {
        let index = 0;
        return {
            next: () =>  {
                const part = this.keyPart(key, index);
                if (part === undefined) {
                    return {
                        done: true,
                        value: undefined
                    };
                } else {
                    return {
                        done: false,
                        value: {
                            keyPart: part,
                            index: index ++
                        }
                    };
                }
            }
        };
    }
    private keyPartIterable(key: K): Iterable<{keyPart: KP, index: number}> {
        return {
            [Symbol.iterator]: this.keyPartIterator.bind(this, key)
        };
    }

    protected abstract keyPart(key: K, index: number): KP | undefined;
    protected abstract compare(a: KP, b: KP, index: number): boolean;
}
