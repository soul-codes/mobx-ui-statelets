import { Component } from "react";
import DOMQuery, { InferDOMQueryAPI } from "../domQuery/DomQuery";

const domQuerySources = new WeakMap<Component, Set<DOMQuery>>();

/**
 */
export function resolveDOMQuery<
  TComponent extends Component<any, any, any>,
  TResolutions extends DOMQueryResolution<any>[]
>(
  resolutions: (
    component: TComponent,
    resolveFn: typeof resolve
  ) => TResolutions
) {
  return (Class: new (...args: any[]) => TComponent) => {
    const componentDidMount = Class.prototype.componentDidMount;
    const componentDidUpdate = Class.prototype.componentDidUpdate;
    const componentWillUnmount = Class.prototype.componentWillUnmount;

    Class.prototype.componentDidMount = function(this: TComponent) {
      domQuerySources.set(this, new Set<DOMQuery>());
      bootstrapResolution(this, resolutions(this, resolve));
      componentDidMount && componentDidMount.call(this);
    };

    Class.prototype.componentDidUpdate = function(this: TComponent) {
      bootstrapResolution(this, resolutions(this, resolve));
      componentDidUpdate && componentDidUpdate.call(this);
    };

    Class.prototype.componentWillUnmount = function(this: TComponent) {
      removeSubscription(this);
      componentWillUnmount && componentWillUnmount.call(this);
    };
  };
}

/**
 * Makes sure that the component is subscribing to a state when it becomes
 * available and stops subscribing when it's no longer available.
 * @param component
 * @param resolutions
 */
function bootstrapResolution(
  component: Component,
  resolutions: DOMQueryResolution<DOMQuery>[]
) {
  const states = domQuerySources.get(component) as Set<DOMQuery>;
  const newStates = new Set<DOMQuery>();
  resolutions.forEach(({ domQuery, resolution }) => {
    newStates.add(domQuery);
    domQuery.addProjection(component, resolution);
  });

  states.forEach(
    state => !newStates.has(state) && state.removeProjection(component)
  );

  domQuerySources.set(component, newStates);
}

/**
 * Remove all subscriptions to all UI states from the React component.
 * @param component
 */
function removeSubscription(component: Component) {
  const states = domQuerySources.get(component) as Set<DOMQuery>;
  states.forEach(state => state.removeProjection(component));
}

const $resolution = Symbol("Subscription");

/**
 * Creates a subscription
 * @param domQuery The state to subscribe to
 * @param resolution The subscription, which should be a subset of the state's
 * supported projections.
 */
function resolve<TDOMQuery extends DOMQuery>(
  domQuery: TDOMQuery,
  resolution: InferDOMQueryAPI<TDOMQuery>
): DOMQueryResolution<TDOMQuery> {
  const result = { domQuery, resolution };
  Object.defineProperty(result, $resolution, {
    value: true,
    enumerable: false,
    configurable: false
  });
  return result as DOMQueryResolution<TDOMQuery>;
}

export interface DOMQueryResolution<TDOMQuery extends DOMQuery> {
  domQuery: TDOMQuery;
  resolution: InferDOMQueryAPI<TDOMQuery>;
  [$resolution]: true;
}
