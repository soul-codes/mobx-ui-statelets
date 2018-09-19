import { action, observable } from "mobx";
import { Always, Falsy } from "../utils/types";

export const currentFocus = observable.box<State | null>(null, {
  deep: false
});

/**
 * Represents any generic UI state. Other specialized UI states such as inputs
 * and tasks derive from this state.
 */
export default class State<
  TProjectionAPI extends StateProjections = StateProjections
> {
  /**
   * Instantiates a generic UI state.
   * @param devOptions Development-time settings
   */
  constructor(readonly devOptions?: StateDevOptions) {}

  /**
   * The presentation layer (e.g. React component) can use this to subscribe
   * itself to the UI state so that the projection is communicated to it.
   *
   * Calling this method replaces the entire projection API for the entity
   * that is passed.
   *
   * For React component, consider using "stateProjection" decorator instead,
   * as it fully manages UI State projection throughout the React component
   * lifecycle for you.
   *
   * @param projection The presentational entity that the state should project
   * to.
   * @api The exact projections that the presentational entity should support.
   */
  addProjection(projection: any, api: TProjectionAPI) {
    this.__$$private_projections.set(projection, api);
  }

  /**
   * The presentation layer (e.g. React component) can use this to unsubscribe
   * itself from the UI state. Further projections from this state will no longer
   * reach the presentation entity.
   *
   * @param projection The presentational entity that the state should stop
   * projecting to.
   */
  removeProjection(projection: any) {
    this.__$$private_projections.delete(projection);
  }

  /**
   * Receives all presentational projections from this UI state entity. The
   * result is an array of projection informations. If a presentation entity
   * does not define the requested projection, it is excluded.
   *
   * @param key The projection key.
   */
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

  /**
   * Returns the UI state's debug name.
   */
  get name() {
    return (this.devOptions && this.devOptions.name) || null;
  }

  /**
   * Returns the UI state's DOM element projection: these are DOM elements that
   * the presentation layer claims to be the presentation of the state.
   *
   * You should generally NOT mutate these elements from the UI state layer
   * directly unless you can do so without assuming anything specific about
   * the returned DOM elements.
   */
  get elements(): HTMLElement[] {
    return this.project("element")
      .map(el => el())
      .filter(Boolean) as HTMLElement[];
  }

  /**
   * Returns true if a UI state that represents a focusable entity is focused.
   */
  get isFocused(): boolean {
    return currentFocus.get() === this;
  }

  /**
   * Assigns focus state on the UI state that represents a focusable entity such as
   * an input. The presentation layer must define the focus projection to determine
   * exactly which DOM element gets focused.
   */
  @action
  focus() {
    return Boolean(this.project("focus").find(fn => Boolean(fn())));
  }

  /**
   * Removes focus state on the UI state that represents a focusable entity such as
   * an input. The presentation layer must define the blur projection to determine
   * exactly how the DOM element is blurred.
   */
  @action
  blur() {
    return Boolean(this.project("blur").find(fn => Boolean(fn())));
  }

  /**
   * The presentational layer should report the focus state of its relevant
   * DOM element using this method.
   */
  @action
  reportFocus() {
    currentFocus.set(this);
  }

  /**
   * The presentational layer should report the blurred state of its relevant
   * DOM element using this method.
   */
  @action
  reportBlur() {
    this.isFocused && currentFocus.set(null);
  }

  /**
   * @private
   */
  __$$private_projections = new Map<any, TProjectionAPI>();
}

/**
 * Defines the supported state projections for the presentational layer.
 *
 * Projections are ways for the state entities to communicate to the presentation
 * layer without needing to them directly. For instance, the "focus" and "blur"
 * projections allow states representing such focusable UI elements to programmatically
 * focus the actual DOM elements without needing to know about them.
 *
 * Think of projections as "refs" that presentational layer provides to the
 * state entities without betraying their true DOM nature.
 */
export interface StateProjections {
  /**
   * The UI state communicates its wish to be focused on here. The presentational
   * layer should return true if it finds that it is indeed able to focus.
   */
  focus?(): boolean;

  /**
   * The UI state communicates its wish to be blurred out here. The presentational
   * layer should return true if it finds that it is indeed able to focus.
   */
  blur?(): boolean;

  /**
   * The UI state communicate the wish to receive the actual DOM element here.
   * The presentational layer should return such a DOM Element or a falsy value
   * if it doesn't exist.
   */
  element?(): HTMLElement | Falsy;
}

/**
 * Development-only options for any state instance.
 */
export interface StateDevOptions {
  /**
   * Debug-friendly name that can be back-queried from the state instance.
   */
  name?: string;
}
