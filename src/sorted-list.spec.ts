import { expect } from "chai";
import {CompareResult, SortedList} from "./sorted-list";
import Chance from 'chance';

class NumberList extends SortedList<number> {
    protected compare(a: number, b: number): CompareResult {
        return a - b;
    }
}

const chance = Chance();

describe('SortedList tests', () => {

    it('inserts and removes', () => {
        const list = new NumberList();

        expect(list.first()).eq(undefined, 'First value must be undefined in an empty list');
        expect(list.last()).eq(undefined, 'Last value must be undefined in an empty list');

        const sortedTestNumbers = chance.n(() => chance.integer({
            min: -100,
            max: 100
        }), 100).sort((a, b) => a - b);
        const remove = chance.pickset(sortedTestNumbers, 50);
        const afterRemove = sortedTestNumbers.slice();
        for (const r of remove) {
            afterRemove.splice(afterRemove.indexOf(r), 1);
        }

        for (const n of chance.shuffle(sortedTestNumbers)) {
            list.insert(n);
        }

        for (const r of remove) {
            list.findReference(value => value === r).remove();
        }

        expect(list.length).eq(afterRemove.length, 'Invalid length');

        const sorted: number[] = [];
        for( const n of list ) {
            sorted.push(n);
        }

        expect(JSON.stringify(sorted)).eq(JSON.stringify(afterRemove), 'Invalid items');

        expect(list.first()).eq(afterRemove[0], 'First value is invalid');
        expect(list.last()).eq(afterRemove[afterRemove.length - 1], 'Last value is invalid');
    });

});
