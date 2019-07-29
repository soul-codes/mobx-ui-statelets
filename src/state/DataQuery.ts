import { observable, action, runInAction } from "mobx";
import State, { StateDevOptions } from "./State";
import { Falsy } from "../utils/types";
import Task, { TaskAction } from "./Task";
import deepEqual from "../utils/deepEqual";

/**
 * Represents an incremental data query state such as that of infinite scrollers
 * or auto-complete dropdowns.
 *
 * The class can fetch data using any arbitrary fetch function, depending on any
 * arbitrary fetch query. The pending state of the fetch, the last successful
 * fetch query and result, as well as the data total statistics are available.
 *
 * @template QueryType The type of the data fetch query, for instance,
 * search strings or filter crieteria.
 *
 * @template ItemType The type of each item to be returned from the fetch.
 */
export default class DataQuery<
  QueryType = any,
  ItemType = any,
  ErrorType = any
> extends State {
  /**
   * @param options Data Query-specific options
   */
  constructor(
    readonly options: DataQueryOptions<QueryType, ItemType, ErrorType>
  ) {
    super(options);
  }

  /**
   * Starts fetchin data. The supplied query will be the attempted query and the
   * fetch will start from offset zero always.
   *
   * @param query The query to fetch with.
   * @param fetchOptions
   * @param fetchOptions.force
   *    If `force` is given, any pending fetch will be canceled
   *    and a new one started even if the given query is identical to that of the
   *    pending fetch.
   * @param fetchOptions.debounce
   *    If given, the fetch will be debounced by the specified number of
   *    milliseconds (and therefore may be overridden by subsequent fetches).
   */
  @action
  async fetch(
    query: QueryType,
    fetchOptions?: { force?: true; debounce?: number }
  ) {
    clearTimeout(this._debounceTimer);
    this._debounceTimer = 0;

    const fetchTask = this._fetchTask;
    if (
      deepEqual(this._lastAttemptedQuery, query) &&
      !(fetchOptions && fetchOptions.force)
    )
      return fetchTask.promise || void 0;

    if (fetchOptions && fetchOptions.debounce) {
      const debounceTimeout = new Promise(
        resolve =>
          (this._debounceTimer = setTimeout(resolve, fetchOptions.debounce))
      );

      return (async (): Promise<void> => {
        await debounceTimeout;
        this._debounceTimer = 0;
        return this.fetch(query, { ...fetchOptions, debounce: 0 });
      })();
    }

    const { options } = this;
    const fetchLimit = options && options.fetchLimit;
    this._lastAttemptedQuery = query;
    this._isIncrementalFetch = false;
    await fetchTask.invoke({
      query,
      limit: fetchLimit === void 0 ? Infinity : fetchLimit,
      offset: 0,
      append: false
    });
  }

  /**
   * Fetches more items using the current query. The fetch function configured
   * in [[DataQueryOptions]] will receive an offset that is the number of items
   * currently.
   *
   * The method can also be used for retrying a failed fetch of a new query. In
   * this case, the offset will be zero (rather than the count of the results
   * from a different query).
   *
   * This method is no-op if there has never been an attempted query.
   */
  @action
  async fetchMore() {
    clearTimeout(this._debounceTimer);
    const fetchTask = this._fetchTask;
    if (fetchTask.isPending) return fetchTask.promise as Promise<void>;
    if (this._lastSuccessfulResult && this._lastSuccessfulResult.isDone) return;

    const query = this._lastAttemptedQuery;
    if (query === void 0) return;

    const isSameAsSuccessfulQuery = deepEqual(this._lastSuccessfulQuery, query);
    const { options } = this;
    const fetchLimit = options && options.fetchLimit;
    this._isIncrementalFetch = true;
    await fetchTask.invoke({
      query,
      limit: fetchLimit === void 0 ? Infinity : fetchLimit,
      offset: isSameAsSuccessfulQuery ? this._items.length : 0,
      append: true
    });
  }

  /**
   * Cancel any on-going data fetch. This will cause the fetch to fail. If the
   * current fetch is a new query, the [[items]] will not clear.
   */
  cancel() {
    return this._fetchTask && this._fetchTask.cancel();
  }

  /**
   * Gets the items of the most recent successful fetch. This is an empty array
   * if no successful fetch has ever happened. Note that if the most recent
   * failed fetch is of a different query, this still holds data from the
   * successful fetch that may be from a different query.
   */
  get items() {
    return this._items;
  }

  /**
   * Returns true if there are more items to fetch, which means one of the
   * following:
   * - The most recent fetch returned `isDone`.
   * - The current number of items is the same as or exceeds the the most
   *   recent `total` returned from a fetch.
   *
   * If no successful fetch has ever happened with the last attempted query,
   * then this returns `null`.
   *
   * @see [[FetchResultWithStats]]
   */
  get hasMoreItems() {
    if (!this._fetchTask) return false;
    const result = this._lastSuccessfulResult;
    if (!result) return null;
    if (!deepEqual(this._lastAttemptedQuery, this._lastSuccessfulQuery))
      return null;
    const { total, isDone } = result;

    if (isDone) return false;
    if (total === void 0 || total <= this._items.length) return false;
    return true;
  }

  /**
   * Returns the number of total items, once this is known. If the fetch function
   * returns either `isDone` or `total` (see [[FetchResultWithStats]]), the number will
   * be respectively be the number of items so far, or the total number.
   *
   * In case the number is not known, this returns `null`.
   */
  get totalItems() {
    if (!this._fetchTask) return this._items.length;
    const result = this._lastSuccessfulResult;
    if (!result) return null;
    const { total, isDone } = result;

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
   * Returns true if the most recent fetch (regardless of its state: success,
   * pending, or error) is incremental.
   */
  get isLastFetchIncremental() {
    return Boolean(this._fetchTask && this._isIncrementalFetch);
  }

  /**
   * Returns true if there is a debounced fetch coming up.
   */
  get isDebounced() {
    return this._debounceTimer > 0;
  }

  /**
   * Returns the query of the last attempted fetch. If the fetch is pending,
   * this would be the pending query. If the fetch is complete and successful,
   * this is the same as [[activeQuery]].
   */
  get attemptedQuery() {
    return this._lastAttemptedQuery;
  }

  /**
   * Returns the last successful query whose current results are based on. For
   * the query used in the most recent fetch attempt, including failed fetches,
   * use [[attemptedQuery]].
   */
  get activeQuery() {
    return this._lastSuccessfulQuery;
  }

  /**
   * Returns true if the last completed fetch encountered an error.
   */
  get isError() {
    return Boolean(
      this._fetchTask &&
        (this._fetchTask.result === false ||
          (this._fetchTask.result && "error" in this._fetchTask.result))
    );
  }

  /**
   * Returns the specific error value that the last fetch encountered. Note that
   * this may still be `null` if the fetch task simply returned `false` or the
   * user canceled the fetch.
   */
  get error() {
    return this._fetchTask.result && "error" in this._fetchTask.result
      ? this._fetchTask.result.error
      : null;
  }

  /**
   * Cancels any pending fetch, and restores the data query into the initial
   * state. This forgets all of the previous results and queries.
   */
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
  private _debounceTimer: number = 0;

  @observable.ref
  private _items: ItemType[] = [];

  @observable.ref
  private _lastAttemptedQuery?: QueryType;

  @observable.ref
  private _isIncrementalFetch: boolean = false;

  @observable.ref
  private _lastSuccessfulQuery?: QueryType;
  private _lastSuccessfulResult?: FetchResultWithStats<ItemType>;
  private _fetchTask = new Task(
    async (q: FetchQuery<QueryType> & { append: boolean }, helpers) => {
      const result = await this.options.fetch(q, helpers);
      if (result && !("error" in result) && !helpers.isCanceled) {
        runInAction(() => {
          const items = Array.isArray(result) ? result : result.items;
          this._items = q.append ? [...this._items, ...items] : items;
          this._lastSuccessfulResult = Array.isArray(result)
            ? { items }
            : result;
          this._lastSuccessfulQuery = q.query;
        });
      }
      return result || false;
    }
  );
}

/**
 * Describes how the [[DataQuery]] is customized.
 * @template QueryType see [[DataQuery]]
 * @template ItemType see [[DataQuery]]
 */
export interface DataQueryOptions<QueryType, ItemType, ErrorType = any>
  extends StateDevOptions {
  /**
   * Specfies the fetch logic, which is essentially a [[Task]] action. This should
   * resolve to a standardized [[FetchResultWithStats]] structure, or a plain
   * array of your items, or a falsy value to indicate that the fetch encountered
   * an error.
   *
   * You should also take advantage of the [[TaskHelpers]] to cancel fetch
   * attempts properly and not e.g. leave your AJAX request implementation hanging.
   *
   * Note that the fetch action cannot currently report progress.
   */
  fetch: TaskAction<
    FetchQuery<QueryType>,
    FetchResultWithStats<ItemType> | ItemType[] | Falsy | { error: ErrorType },
    void
  >;

  /**
   * Specifies the upper limit of items that should be fetched. This gets passed
   * back to the fetch as the query, but will also affect the behavior of
   * [[fetchMore]].
   */
  fetchLimit?: number;
}

/**
 * Describes the query information that is sent to the fetch function.
 * @template [[QueryType]] see [[DataQuery]]
 * @see [[DataQueryOptions]]
 */
export interface FetchQuery<QueryType> {
  /**
   * The actual fetch query that is passed from [[DataQuery.fetch]] or saved
   * when using [[DataQuery.fetchMore]].
   */
  query: QueryType;

  /**
   * The offset that the fetch function should begin fetching.
   */
  offset: number;

  /**
   * The limit of items to fetch, which is the same as `fetchLimit` in
   * [[DataQueryOptions]]. Note that this is `Infinity` if the limit is not
   * set.
   *
   * You do not need to obey this limit, but it serves as a guide for you not
   * to query too many at once.
   */
  limit: number;
}

/**
 * Describes the fetch result, which should be the resolve value of the fetch
 * function.
 * @template [[QueryType]] see [[ItemType]]
 *
 * @see [[DataQueryOptions]]
 */
export interface FetchResultWithStats<ItemType> {
  /**
   * The actual items that result from the fetch. Note that this should be the
   * items starting at the offset given in the [[FetchQuery]]. For instance,
   * if the query wants items starting from offset `20`, the first element
   * of the item should be the item at offset `20`.
   */
  items: ItemType[];

  /**
   * If true, this will tell the [[DataQuery]] not to ignore subsequent
   * [[DataQuery.fetchMore]] calls until a new fresh fetch. This will also
   * update [[DataQuery.totalItems]]
   */
  isDone?: boolean;

  /**
   * If specified, this will be updated in the [[DataQuery]] and will be used
   * as the value of [[DataQuery.totalItems]].
   */
  total?: number;
}
