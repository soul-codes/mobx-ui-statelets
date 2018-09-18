import { Component } from "react";
import State, { StateProjections } from "../state/State";

const projectionState = new WeakMap<Component, Set<State>>();

/**
 * Connects A React component to a state as a projection.
 * @param subscriptions This function should return the subscriptions to the UI
 * state that should be set up when the state is provided as a prop and torn
 * down when the state is no longer provided.
 */
export function stateProjection<
  TComponent extends Component<any, any, any>,
  TSubscriptions extends StateSubscription<any>[]
>(
  subscriptions: (
    component: TComponent,
    subscribeFn: typeof subscribe
  ) => TSubscriptions
) {
  return (Class: new (...args: any[]) => TComponent) => {
    const componentDidMount = Class.prototype.componentDidMount;
    const componentDidUpdate = Class.prototype.componentDidUpdate;
    const componentWillUnmount = Class.prototype.componentWillUnmount;

    Class.prototype.componentDidMount = function(this: TComponent) {
      projectionState.set(this, new Set<State>());
      bootstrapSubscription(this, subscriptions(this, subscribe));
      componentDidMount && componentDidMount.call(this);
    };

    Class.prototype.componentDidUpdate = function(this: TComponent) {
      bootstrapSubscription(this, subscriptions(this, subscribe));
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
 * @param subscriptions
 */
function bootstrapSubscription(
  component: Component,
  subscriptions: StateSubscription<State>[]
) {
  const states = projectionState.get(component) as Set<State>;
  const newStates = new Set<State>();
  subscriptions.forEach(({ state, subscription }) => {
    newStates.add(state);
    state.addProjection(component, subscription);
  });

  states.forEach(
    state => !newStates.has(state) && state.removeProjection(component)
  );

  projectionState.set(component, newStates);
}

/**
 * Remove all subscriptions to all UI states from the React component.
 * @param component
 */
function removeSubscription(component: Component) {
  const states = projectionState.get(component) as Set<State>;
  states.forEach(state => state.removeProjection(component));
}

const $subscription = Symbol("Subscription");

/**
 * Creates a subscription
 * @param state The state to subscribe to
 * @param subscription The subscription, which should be a subset of the state's
 * supported projections.
 */
function subscribe<TState extends State>(
  state: TState,
  subscription: StateProjections
): StateSubscription<TState> {
  const result = { state, subscription };
  Object.defineProperty(result, $subscription, {
    value: true,
    enumerable: false,
    configurable: false
  });
  return result as StateSubscription<TState>;
}

interface StateSubscription<TState extends State> {
  state: TState;
  subscription: StateProjections;
  [$subscription]: true;
}
