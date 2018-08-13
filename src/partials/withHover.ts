import State from "../state/State";
import { action, observable } from "mobx";

export default function withHover<
  TState extends new (...args: any[]) => State<any>
>(State: TState) {
  class WithHover extends State {
    get isHovered(): boolean {
      return this.__$$private_isHovered;
    }

    @action
    reportHover() {
      this.__$$private_isHovered = true;
    }

    @action
    reportUnhover() {
      this.__$$private_isHovered = false;
    }

    @observable
    __$$private_isHovered = false;
  }
  return WithHover;
}
