import { Always } from "../utils/types";

export default class State<TProjectionAPI extends StateProjectionMap = {}> {
  constructor(readonly devOptions?: StateDevOptions) {}

  addProjection(projection: any, api: TProjectionAPI) {
    this.__$$private_projections.set(projection, api);
  }

  removeProjection(projection: any) {
    this.__$$private_projections.delete(projection);
  }

  project<TKey extends keyof TProjectionAPI>(
    key: TKey
  ): Always<TProjectionAPI[TKey]>[] {
    const result: TProjectionAPI[TKey][] = [];
    for (const [, api] of this.__$$private_projections.entries()) {
      typeof api[key] !== "undefined" && result.push(api[key]);
    }
    return result;
  }

  get name() {
    return (this.devOptions && this.devOptions.name) || null;
  }

  __$$private_projections = new Map<any, TProjectionAPI>();
}

export type StateProjectionMap = { [key: string]: any };

export type ProjectionAPI<TState extends State> = TState extends State<
  infer TProjection
>
  ? TProjection
  : never;

export interface StateDevOptions {
  name?: string;
}
