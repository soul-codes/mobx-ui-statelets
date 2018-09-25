/**
 * Represents a type or a promise that resolves to that type. For instance,
 * `MaybePromise<number>` is either `number` or a promise that resolves `number`.
 */
export type MaybePromise<T> = T | Promise<T>;

/**
 * Represents a type that is either a constant value or a function that returns
 * the type of that constant value. For instance, `MaybeConstant<() => number>`
 * is either a function that returns `number`, or just `number` itself.
 */
export type MaybeConstant<T extends (...args: any[]) => any> =
  | T
  | (T extends (...args: any[]) => infer TResult ? TResult : never);

/**
 * Represents any falsy value.
 */
export type Falsy = null | false | void | 0 | "";

/**
 * @ignore
 */
export type ArrayItem<T extends Array<any>> = T extends Array<infer TItem>
  ? TItem
  : never;

/**
 * Represents a type that removes the `void` type. For instance, `Always<number|void>`
 * is just `number`.
 */
export type Always<T> = T extends void ? never : T;
