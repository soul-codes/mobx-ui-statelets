export type MaybePromise<T> = T | Promise<T>;
export type MaybeConstant<T extends (...args: any[]) => any> =
  | T
  | (T extends (...args: any[]) => infer TResult ? TResult : never);

export type Falsy = null | false | void | 0 | "";
export type ArrayItem<T extends Array<any>> = T extends Array<infer TItem>
  ? TItem
  : never;

export type Always<T> = T extends void ? never : T;
