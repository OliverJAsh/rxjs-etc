/**
 * @license Use of this source code is governed by an MIT-style license that
 * can be found in the LICENSE file at https://github.com/cartant/rxjs-etc
 */
/*tslint:disable:no-unused-expression*/

import { marbles } from "rxjs-marbles";
import { forkJoinConcurrent } from "./forkJoinConcurrent";

describe("forkJoinConcurrent", () => {

    it("should join a single observable", marbles((m) => {

        const values = { a: 1 };
        const results = { x: [values.a] };

        const source =   m.cold("a----|", values);
        const subs =            "^----!";
        const expected = m.cold("-----(x|)", results);

        const destination = forkJoinConcurrent([source], 1);
        m.expect(destination).toBeObservable(expected);
        m.expect(source).toHaveSubscriptions(subs);
    }));

    it("should join multiple observables", marbles((m) => {

        const values = { a: 1, b: 2 };
        const results = { x: [values.a, values.b] };

        const source1 =  m.cold("a--|", values);
        const subs1 =           "^--!";
        const source2 =     m.cold("b-|", values);
        const subs2 =           "---^-!";
        const expected = m.cold("-----(x|)", results);

        const destination = forkJoinConcurrent([source1, source2], 1);
        m.expect(destination).toBeObservable(expected);
        m.expect(source1).toHaveSubscriptions(subs1);
        m.expect(source2).toHaveSubscriptions(subs2);
    }));
});
