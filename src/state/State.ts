import { action, observable } from "mobx";
import { Always, Falsy } from "../utils/types";

export const currentFocus = observable.box<State | null>(null, {
  deep: false
});

export default class State<
  TProjectionAPI extends StateProjections = StateProjections
> {
  constructor(readonly devOptions?: StateDevOptions) {}

  addProjection(projection: any, api: TProjectionAPI) {
    this.__$$private_projections.set(projection, api);
  }

  removeProjection(projection: any) {
    this.__$$private_projections.delete(projection);
  }

  project<TKey extends keyof (TProjectionAPI)>(
    key: TKey
  ): Always<(TProjectionAPI)[TKey]>[] {
    const result: Always<(TProjectionAPI)[TKey]>[] = [];
    for (const [, api] of this.__$$private_projections.entries()) {
      typeof api[key] !== "undefined" &&
        result.push(api[key] as Always<(TProjectionAPI)[TKey]>);
    }
    return result;
  }

  get name() {
    return (this.devOptions && this.devOptions.name) || null;
  }

  get elements(): HTMLElement[] {
    return this.project("element")
      .map(el => el())
      .filter(Boolean) as HTMLElement[];
  }
  get isFocused(): boolean {
    return currentFocus.get() === this;
  }

  @action
  focus() {
    return Boolean(this.project("focus").find(fn => Boolean(fn())));
  }

  @action
  blur() {
    return Boolean(this.project("blur").find(fn => Boolean(fn())));
  }

  @action
  reportFocus() {
    currentFocus.set(this);
  }

  @action
  reportBlur() {
    this.isFocused && currentFocus.set(null);
  }

  __$$private_projections = new Map<any, TProjectionAPI>();
}

export interface StateProjections {
  focus?(): boolean;
  blur?(): boolean;
  element?(): HTMLElement | Falsy;
}

export interface StateDevOptions {
  name?: string;
}
