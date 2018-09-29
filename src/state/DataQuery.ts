import { observable, action } from "mobx";
import State, { StateDevOptions } from "./State";
import { MaybePromise } from "../utils/types";
import Task from "./Task";
import deepEqual from "../utils/deepEqual";

export default class DataQuery<TQuery, TItem> extends State {
  constructor(readonly options?: DataQueryOptions<TQuery, TItem>) {
    super(options);
    const fetch = options && options.fetch;
    if (typeof fetch === "function") {
      this._fetchTask = new Task(fetch);
    } else {
      this._items = fetch || [];
    }
  }

  @action
  async fetch(query: TQuery, fetchOptions?: { force?: true }) {
    const choiceTask = this._fetchTask;
    if (!choiceTask) return;
    if (
      choiceTask.isPending &&
      deepEqual(this._lastQuery, query) &&
      !(fetchOptions && fetchOptions.force)
    )
      return choiceTask.promise as Promise<void>;

    const { options } = this;
    const fetchLimit = options && options.fetchLimit;
    this._lastQuery = query;
    await choiceTask.invoke({
      query,
      limit: fetchLimit === void 0 ? Infinity : fetchLimit,
      offset: 0
    });
    this._items = choiceTask.result ? choiceTask.result.items : [];
  }

  @action
  async fetchMore() {
    const choiceTask = this._fetchTask;
    if (!choiceTask) return;
    if (choiceTask.isPending) return choiceTask.promise as Promise<void>;
    if (choiceTask.result && choiceTask.result.stats.isDone) return;

    const query = this._lastQuery;
    if (query === void 0) return;

    const { options } = this;
    const fetchLimit = options && options.fetchLimit;
    await choiceTask.invoke({
      query,
      limit: fetchLimit === void 0 ? Infinity : fetchLimit,
      offset: this._items.length
    });

    const result = choiceTask.result;
    result && this._items.push(...result.items);
  }

  get items() {
    return this._items;
  }

  get hasMoreItems() {
    const choiceTask = this._fetchTask;
    if (!choiceTask) return false;
    if (!choiceTask.result) return true;
    return !choiceTask.result.stats.isDone;
  }

  get totalItems() {
    const choiceTask = this._fetchTask;
    if (!choiceTask) return this._items.length;
    if (!choiceTask.result) return null;
    const total = choiceTask.result.stats.total;
    return total === void 0 ? null : total;
  }

  get isFetching() {
    return Boolean(this._fetchTask && this._fetchTask.isPending);
  }

  @observable.ref
  private _items: TItem[] = [];
  private _lastQuery?: TQuery;
  private _fetchTask?: Task<FetchQuery<TQuery>, FetchResult<TItem>>;
}

export interface DataQueryOptions<TQuery, TItem> extends StateDevOptions {
  fetch?:
    | ((query: FetchQuery<TQuery>) => MaybePromise<FetchResult<TItem>>)
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
