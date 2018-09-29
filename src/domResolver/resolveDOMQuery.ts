import { Component } from "react";
import DOMQuery, { InferDOMQueryAPI } from "../domQuery/DomQuery";

const domQuerySources = new WeakMap<Component, Set<DOMQuery>>();

/**
 * Creates a React component decoator that sets up headless DOM query resolution
 * within the life-cycle of the component.
 *
 * @param resolutions The method should use the component context to emit
 * DOM query resolutions that should be active while the component is active.
 * This method will automatically be called on component mount as well as on
 * component update.
 *
 * @typeparam TComponent The type of the component that will resolve the DOM query.
 * @typeparam TMapping The type of the resolution mapping.
 */
export function resolveDOMQuery<
  TComponent extends Component<any, any, any>,
  TMapping extends DOMQueryResolutionMapping<any>[]
>(resolutions: (component: TComponent, resolveFn: typeof resolve) => TMapping) {
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
  resolutions: DOMQueryResolutionMapping<DOMQuery>[]
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
): DOMQueryResolutionMapping<TDOMQuery> {
  const result = { domQuery, resolution };
  Object.defineProperty(result, $resolution, {
    value: true,
    enumerable: false,
    configurable: false
  });
  return result as DOMQueryResolutionMapping<TDOMQuery>;
}

export interface DOMQueryResolutionMapping<TDOMQuery extends DOMQuery> {
  domQuery: TDOMQuery;
  resolution: InferDOMQueryAPI<TDOMQuery>;
  [$resolution]: true;
}
