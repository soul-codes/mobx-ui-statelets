import { observable, action, runInAction } from "mobx";
import State, { StateDevOptions } from "./State";
import { Falsy } from "../utils/types";
import Task, { TaskAction } from "./Task";
import deepEqual from "../utils/deepEqual";

export default class DataQuery<TQuery, TItem> extends State {
  constructor(readonly options: DataQueryOptions<TQuery, TItem>) {
    super(options);
    const fetch = options && options.fetch;
    if (typeof fetch === "function") {
      this._fetchTask = new Task(
        async (q: FetchQuery<TQuery> & { append: boolean }, helpers) => {
          const result = await fetch(q, helpers);
          if (result && !helpers.isCanceled) {
            runInAction(() => {
              this._items = q.append
                ? [...this._items, ...result.items]
                : result.items;
              this._lastSuccessfulResult = result;
              this._lastSuccessfulQuery = q.query;
            });
          }
          return result || false;
        }
      );
    } else {
      this._items = fetch;
      this._lastSuccessfulResult = {
        items: fetch,
        stats: { isDone: true }
      };
    }
  }

  @action
  async fetch(query: TQuery, fetchOptions?: { force?: true }) {
    const fetchTask = this._fetchTask;
    if (!fetchTask) return;
    if (
      deepEqual(this._lastAttemptedQuery, query) &&
      !(fetchOptions && fetchOptions.force)
    )
      return fetchTask.promise as Promise<void>;

    const { options } = this;
    const fetchLimit = options && options.fetchLimit;
    this._lastAttemptedQuery = query;
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
    if (this._lastSuccessfulResult && this._lastSuccessfulResult.stats.isDone)
      return;

    const query = this._lastAttemptedQuery;
    if (query === void 0) return;

    const isSameAsSuccessfulQuery = deepEqual(this._lastSuccessfulQuery, query);
    const { options } = this;
    const fetchLimit = options && options.fetchLimit;
    await fetchTask.invoke({
      query,
      limit: fetchLimit === void 0 ? Infinity : fetchLimit,
      offset: isSameAsSuccessfulQuery ? this._items.length : 0,
      append: true
    });
  }

  cancel() {
    return this._fetchTask && this._fetchTask.cancel();
  }

  get items() {
    return this._items;
  }

  /**
   * Only has meaning once query is stable
   */
  get hasMoreItems() {
    if (!this._fetchTask) return false;
    const result = this._lastSuccessfulResult;
    if (!result) return null;
    const { total, isDone } = result.stats;

    if (isDone) return false;
    if (total === void 0 || total <= this._items.length) return false;
    return true;
  }

  /**
   * Returns the number of total items once known.
   */
  get totalItems() {
    if (!this._fetchTask) return this._items.length;
    const result = this._lastSuccessfulResult;
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
    return this._lastAttemptedQuery;
  }

  /**
   * Returns the query whose current results are from.
   */
  get activeQuery() {
    return this._lastSuccessfulQuery;
  }

  /**
   * Returns true if the last fetch encountered an error.
   */
  get isError() {
    return Boolean(this._fetchTask && this._fetchTask.result === false);
  }

  @action
  clear() {
    if (this._fetchTask) {
      this._fetchTask.cancel();
      this._items = [];
      this._lastAttemptedQuery = void 0;
      this._lastSuccessfulQuery = void 0;
      this._lastSuccessfulResult = void 0;
    }
  }

  @observable.ref
  private _items: TItem[] = [];

  @observable.ref
  private _lastAttemptedQuery?: TQuery;

  @observable.ref
  private _lastSuccessfulQuery?: TQuery;
  private _lastSuccessfulResult?: FetchResult<TItem>;
  private _fetchTask?: Task<
    FetchQuery<TQuery> & { append: boolean },
    FetchResult<TItem> | false
  >;
}

export interface DataQueryOptions<TQuery, TItem> extends StateDevOptions {
  fetch:
    | TaskAction<FetchQuery<TQuery>, FetchResult<TItem> | Falsy, void>
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
