import { Component } from "react";
import { autorun } from "mobx";
import { observer } from "mobx-react";

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
