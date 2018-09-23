import State from "../state/State";
import { action, observable } from "mobx";
import createWeakProperty from "../utils/weakProp";

const privateIsHovered = createWeakProperty((instance: State) => false);

export default function withHover<
  TState extends new (...args: any[]) => State<any>
>(State: TState) {
  class WithHover extends State {
    /**
     * Returns true if the presentational layer has reported that the corresponding
     * element representing this state is being hovered on.
     */
    get isHovered(): boolean {
      return privateIsHovered.get(this);
    }

    /**
     * The presentational layer should report the corresponding state that the
     * element is being hovered.
     */
    @action
    reportHover() {
      privateIsHovered.set(this, true);
    }

    /**
     * The presentational layer should report to the corresponding state that
     * the element is no longer being hovered.
     */
    @action
    reportUnhover() {
      privateIsHovered.set(this, false);
    }
  }
  return WithHover;
}
