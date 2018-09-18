import State from "../state/State";
import { action, observable } from "mobx";

export default function withHover<
  TState extends new (...args: any[]) => State<any>
>(State: TState) {
  class WithHover extends State {
    /**
     * Returns true if the presentational layer has reported that the corresponding
     * element representing this state is being hovered on.
     */
    get isHovered(): boolean {
      return this.__$$private_isHovered;
    }

    /**
     * The presentational layer should report the corresponding state that the
     * element is being hovered.
     */
    @action
    reportHover() {
      this.__$$private_isHovered = true;
    }

    /**
     * The presentational layer should report to the corresponding state that
     * the element is no longer being hovered.
     */
    @action
    reportUnhover() {
      this.__$$private_isHovered = false;
    }

    @observable
    __$$private_isHovered = false;
  }
  return WithHover;
}
