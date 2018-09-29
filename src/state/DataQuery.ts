import { observable, action, runInAction } from "mobx";
import State, { StateDevOptions } from "./State";
import { MaybePromise, Falsy } from "../utils/types";
import Task, { AddCancelHandler } from "./Task";
import deepEqual from "../utils/deepEqual";

export default class DataQuery<TQuery, TItem> extends State {
  constructor(readonly options?: DataQueryOptions<TQuery, TItem>) {
    super(options);
    const fetch = options && options.fetch;
    if (typeof fetch === "function") {
      this._fetchTask = new Task(
        async (q: FetchQuery<TQuery> & { append: boolean }, onCancel) => {
          let isCanceled = false;
          onCancel(() => (isCanceled = true));

          const result = await fetch(q, onCancel);
          if (!isCanceled) {
            runInAction(() => {
              result &&
                (this._items = q.append
                  ? [...this._items, ...result.items]
                  : result.items);
              this._lastResult = result || null;
              this._activeQuery = q.query;
            });
          }
        }
      );
    } else {
      this._items = fetch || [];
    }
  }

  @action
  async fetch(query: TQuery, fetchOptions?: { force?: true }) {
    const fetchTask = this._fetchTask;
    if (!fetchTask) return;
    if (
      fetchTask.isPending &&
      deepEqual(this._pendingQuery, query) &&
      !(fetchOptions && fetchOptions.force)
    )
      return fetchTask.promise as Promise<void>;

    const { options } = this;
    const fetchLimit = options && options.fetchLimit;
    this._pendingQuery = query;
    await fetchTask.invoke({
      query,
      limit: fetchLimit === void 0 ? Infinity : fetchLimit,
      offset: 0,
      append: false
    });
  }

  @action
  async fetchMore() {
    const fetchTask = this._fetchTask;
    if (!fetchTask) return;
    if (fetchTask.isPending) return fetchTask.promise as Promise<void>;
    if (this._lastResult && this._lastResult.stats.isDone) return;

    const query = this._pendingQuery;
    if (query === void 0) return;

    const { options } = this;
    const fetchLimit = options && options.fetchLimit;
    await fetchTask.invoke({
      query,
      limit: fetchLimit === void 0 ? Infinity : fetchLimit,
      offset: this._items.length,
      append: true
    });
  }

  get items() {
    return this._items;
  }

  /**
   * Only has meaning once query is stable
   */
  get hasMoreItems() {
    if (!this._fetchTask) return false;
    const result = this._lastResult;
    if (!result) return null;
    const { total, isDone } = result.stats;

    if (isDone) return true;
    if (total === void 0 || total <= this._items.length) return true;
    return false;
  }

  /**
   * Returns the number of total items once known.
   */
  get totalItems() {
    if (!this._fetchTask) return this._items.length;
    const result = this._lastResult;
    if (!result) return null;
    const { total, isDone } = result.stats;

    if (isDone) return this._items.length;
    if (typeof total === "number") return total;
    return null;
  }

  /**
   * Returns true if data fetch is currently happening.
   */
  get isFetching() {
    return Boolean(this._fetchTask && this._fetchTask.isPending);
  }

  /**
   * Returns the query whose pending fetch is based.
   */
  get pendingQuery() {
    return this.isFetching ? this._pendingQuery : void 0;
  }

  /**
   * Returns the query whose current results are from.
   */
  get activeQuery() {
    return this._activeQuery;
  }

  /**
   * Returns true if the last fetch encountered an error.
   */
  get isError() {
    return Boolean(this._lastResult === null);
  }

  @observable.ref
  private _items: TItem[] = [];

  @observable.ref
  private _pendingQuery?: TQuery;

  @observable.ref
  private _activeQuery?: TQuery;
  private _lastResult?: FetchResult<TItem> | null;
  private _fetchTask?: Task<FetchQuery<TQuery> & { append: boolean }, void>;
}

export interface DataQueryOptions<TQuery, TItem> extends StateDevOptions {
  fetch?:
    | ((
        query: FetchQuery<TQuery>,
        onCancel: AddCancelHandler
      ) => MaybePromise<FetchResult<TItem> | Falsy>)
    | TItem[];
  fetchLimit?: number;
}

export interface FetchQuery<TQuery> {
  query: TQuery;
  offset: number;
  limit: number;
}

export interface FetchResult<TItem> {
  items: TItem[];
  stats: {
    isDone?: boolean;
    total?: number;
  };
}
