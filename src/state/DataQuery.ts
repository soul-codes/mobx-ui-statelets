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
 * @typeparam QueryType The type of the data fetch query, for instance,
 * search strings or filter crieteria.
 *
 * @typeparam ItemType The type of each item to be returned from the fetch.
 */
export default class DataQuery<QueryType, ItemType> extends State {
  /**
   * @param options Data Query-specific options
   */
  constructor(readonly options: DataQueryOptions<QueryType, ItemType>) {
    super(options);
  }

  /**
   * Starts fetchin data. The supplied query will be the attempted query and the
   * fetch will start from offset zero always.
   *
   * @param query The query to fetch with.
   * @param fetchOptions If `force` is given, any pending fetch will be canceled
   * and a new one started even if the given query is identical to that of the
   * pending fetch.
   */
  @action
  async fetch(query: QueryType, fetchOptions?: { force?: true }) {
    const fetchTask = this._fetchTask;
    if (
      deepEqual(this._lastAttemptedQuery, query) &&
      !(fetchOptions && fetchOptions.force)
    )
      return fetchTask.promise || void 0;

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
    const fetchTask = this._fetchTask;
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
   * @see [[FetchResult]]
   */
  get hasMoreItems() {
    if (!this._fetchTask) return false;
    const result = this._lastSuccessfulResult;
    if (!result) return null;
    if (!deepEqual(this._lastAttemptedQuery, this._lastSuccessfulQuery))
      return null;
    const { total, isDone } = result.stats;

    if (isDone) return false;
    if (total === void 0 || total <= this._items.length) return false;
    return true;
  }

  /**
   * Returns the number of total items, once this is known. If the fetch function
   * returns either `isDone` or `total` (see [[FetchResult]]), the number will
   * be respectively be the number of items so far, or the total number.
   *
   * In case the number is not known, this returns `null`.
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
    return Boolean(this._fetchTask && this._fetchTask.result === false);
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
  private _items: ItemType[] = [];

  @observable.ref
  private _lastAttemptedQuery?: QueryType;

  @observable.ref
  private _lastSuccessfulQuery?: QueryType;
  private _lastSuccessfulResult?: FetchResult<ItemType>;
  private _fetchTask = new Task(
    async (q: FetchQuery<QueryType> & { append: boolean }, helpers) => {
      const result = await this.options.fetch(q, helpers);
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
}

/**
 * Describes how the [[DataQuery]] is customized.
 * @typeparam QueryType see [[DataQuery]]
 * @typeparam ItemType see [[DataQuery]]
 */
export interface DataQueryOptions<QueryType, ItemType> extends StateDevOptions {
  /**
   * Specfies the fetch logic, which is similar to a [[Task]] action. this should
   * resolve to a standardized [[FetchResult]] structure, or a falsy value to
   * indicate that the fetch encountered an error.
   */
  fetch: TaskAction<FetchQuery<QueryType>, FetchResult<ItemType> | Falsy, void>;

  /**
   * Specifies the upper limit of items that should be fetched. This gets passed
   * back to the fetch as the query, but will also affect the behavior of
   * [[fetchMore]].
   */
  fetchLimit?: number;
}

/**
 * Describes the query information that is sent to the fetch function.
 * @typeparam [[QueryType]] see [[DataQuery]]
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
 * @typeparam [[QueryType]] see [[ItemType]]
 *
 * @see [[DataQueryOptions]]
 */
export interface FetchResult<ItemType> {
  /**
   * The actual items that result from the fetch. Note that this should be the
   * items starting at the offset given in the [[FetchQuery]]. For instance,
   * if the query wants items starting from offset `20`, the first element
   * of the item should be the item at offset `20`.
   */
  items: ItemType[];

  /**
   * Specifies the statistics about the fetch.
   */
  stats: {
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
  };
}
