import { Component } from "react";
import { autorun } from "mobx";
import { observer } from "mobx-react";
import { Falsy } from "../utils/types";

/**
 * Connects A React component to a state as a projection.
 * @param reaction This function should return the subscriptions to the UI
 * state that should be set up when the state is provided as a prop and torn
 * down when the state is no longer provided.
 */
export function syncDOMState<TComponent extends Component<any, any, any>>(
  reaction: (component: TComponent) => void
) {
  const syncReactions = new WeakMap<Component, () => void>();
  return (Class: new (...args: any[]) => TComponent) => {
    const componentDidMount = Class.prototype.componentDidMount;
    const componentWillUnmount = Class.prototype.componentWillUnmount;

    Class.prototype.componentDidMount = function(this: TComponent) {
      syncReactions.set(this, autorun(() => reaction(this)));
      componentDidMount && componentDidMount.call(this);
    };

    Class.prototype.componentWillUnmount = function(this: TComponent) {
      const dispose = syncReactions.get(this);
      dispose && dispose();
      componentWillUnmount && componentWillUnmount.call(this);
    };

    observer(Class);
  };
}

export function createDOMStateSync<TElement extends HTMLElement, TState>(
  syncFn: (element: TElement, state: TState) => void
): DOMStateSync<TElement, TState> {
  function syncState<TComponent extends Component>(
    syncProps: (
      component: TComponent
    ) => { el: TElement | Falsy; state: TState } | Falsy
  ): (component: new (...args: any[]) => TComponent) => void;
  function syncState(el: TElement | Falsy, state: TState | void): void;
  function syncState<TComponent extends Component>(
    first:
      | TElement
      | ((
          component: TComponent
        ) => { el: TElement | Falsy; state: TState } | Falsy)
      | Falsy,
    second?: TState | void
  ): ((component: new (...args: any[]) => TComponent) => void) | void {
    if (first instanceof HTMLElement) {
      if (second !== void 0) {
        syncFn(first, second);
      }
    } else if (first) {
      return syncDOMState((component: TComponent) => {
        const { el = null, state = void 0 } = first(component) || {};
        if (el && state !== void 0) {
          syncFn(el, state);
        }
      });
    }
  }

  return syncState;
}

/**
 * A DOM state sync function that can be used as an imperative update method
 * from within a DOM state sync callback, but also as a decorator factory.

 * @typeparam TElement the kind of HTML element that can be synced.
 * @typeparam TState the shape of the DOM state that is needed to sync.
 * 
 * @see [[syncDOMState]]
 */
export interface DOMStateSync<TElement extends HTMLElement, TState> {
  /**
   * This overloads imperatively updates the DOM element state based on the
   * supplied state information.
   * @param el
   * @param state
   */
  (el: TElement | Falsy, state: TState | void): void;

  /**
   * This overload creates a React component class decorator that syncs the
   * specified element's state.
   * @param syncProps
   */
  <TComponent extends Component>(
    syncProps: (
      component: TComponent
    ) => { el: TElement | Falsy; state: TState } | Falsy
  ): (component: new (...args: any[]) => TComponent) => void;
}
