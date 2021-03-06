/**
 * @license Use of this source code is governed by an MIT-style license that
 * can be found in the LICENSE file at https://github.com/cartant/rxjs-etc
 */

import {
    concat,
    from,
    identity,
    MonoTypeOperatorFunction,
    Observable,
    ObservableInput,
    of,
    OperatorFunction,
    Subject
} from "rxjs";

import { expand, ignoreElements, mergeMap, tap } from "rxjs/operators";
import { NotificationQueue } from "./NotificationQueue";

export type TraverseElement<T, M> = { markers: ObservableInput<M>, values: ObservableInput<T> };
export type TraverseFactory<T, M> = (marker: M | undefined, index: number) => Observable<TraverseElement<T, M>>;

export function traverse<T, M>(options: {
    concurrency?: number,
    factory: TraverseFactory<T, M>,
    notifier: Observable<any>
}): Observable<T>;

export function traverse<T, M, R>(options: {
    concurrency?: number,
    factory: TraverseFactory<T, M>,
    operator: OperatorFunction<T, R>
}): Observable<R>;

export function traverse<T, M>(options: {
    concurrency?: number,
    factory: TraverseFactory<T, M>
}): Observable<T>;

// https://github.com/palantir/tslint/issues/3906

export function traverse<T, M, R>({
    concurrency: optionalConcurrency, // tslint:disable-line:no-use-before-declare
    factory,
    operator: optionalOperator, // tslint:disable-line:no-use-before-declare
    notifier: optionalNotifier // tslint:disable-line:no-use-before-declare
}: {
    concurrency?: number,
    factory: TraverseFactory<T, M>,
    operator?: OperatorFunction<T, T | R>,
    notifier?: Observable<any>
}): Observable<T | R> {
    return new Observable<T | R>(observer => {

        const concurrency = (optionalConcurrency !== undefined) ? optionalConcurrency : 1;
        const operator = optionalOperator || identity;
        let queue: NotificationQueue;
        let queueOperator: MonoTypeOperatorFunction<M | undefined>;

        if (optionalNotifier) {
            queue = new NotificationQueue(optionalNotifier);
            queueOperator = identity;
        } else {
            const subject = new Subject<any>();
            queue = new NotificationQueue(subject);
            queueOperator = markers => { subject.next(); return markers; };
        }

        const destination = new Subject<T | R>();
        const subscription = destination.subscribe(observer);
        subscription.add(queue.connect());
        subscription.add(of(undefined).pipe(
            expand((marker: M | undefined) => queue.pipe(
                mergeMap(index => factory(marker, index).pipe(
                    mergeMap(({ markers, values }) => concat(
                        from<T>(values).pipe(
                            operator,
                            tap(value => destination.next(value)),
                            ignoreElements()
                        ) as Observable<never>,
                        from<M>(markers)
                    ))
                )),
                queueOperator
            ), concurrency)
        ).subscribe({
            complete: () => destination.complete(),
            error: error => destination.error(error)
        }));
        return subscription;
    });
}
