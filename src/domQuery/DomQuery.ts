import { Always } from "../utils/types";
import State from "../state/State";

export default class DOMQuery<TQueryAPI = {}> extends State {
  addProjection(queries: any, api: TQueryAPI) {
    this._domQueries.set(queries, api);
  }

  removeProjection(projection: any) {
    this._domQueries.delete(projection);
  }

  domQuery<TKey extends keyof TQueryAPI>(key: TKey): Always<TQueryAPI[TKey]>[] {
    const result: Always<TQueryAPI[TKey]>[] = [];
    for (const [, api] of this._domQueries.entries()) {
      typeof api[key] !== "undefined" &&
        result.push(api[key] as Always<TQueryAPI[TKey]>);
    }
    return result;
  }

  private _domQueries = new Map<any, TQueryAPI>();
}

/**
 * @ignore
 */
export type InferDOMQueryAPI<TState extends DOMQuery> = TState extends DOMQuery<
  infer QueryAPI
>
  ? QueryAPI
  : never;
