import { Component } from "react";
import State, { ProjectionAPI } from "../state/State";

const projectionState = new WeakMap<Component, Set<State>>();

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

function removeSubscription(component: Component) {
  const states = projectionState.get(component) as Set<State>;
  states.forEach(state => state.removeProjection(component));
}

const $subscription = Symbol("Subscription");
function subscribe<TState extends State>(
  state: TState,
  subscription: ProjectionAPI<TState>
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
  subscription: ProjectionAPI<TState>;
  [$subscription]: true;
}
