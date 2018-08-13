import State from "../state/State";
import { action, observable } from "mobx";

export const currentFocus = observable.box<State | null>(null, {
  deep: false
});

export interface FocusProjections {
  focus?(): boolean;
  blur?(): boolean;
}

export default function withFocus<
  TState extends new (...args: any[]) => State<FocusProjections>
>(State: TState) {
  class WithFocus extends State {
    get isFocused(): boolean {
      return currentFocus.get() === this;
    }

    @action
    focus() {
      return Boolean(this.project("focus").find(fn => Boolean(fn())));
    }

    @action
    blur() {
      return Boolean(this.project("blur").find(fn => Boolean(fn())));
    }

    @action
    reportFocus() {
      currentFocus.set(this);
    }

    @action
    reportBlur() {
      this.isFocused && currentFocus.set(null);
    }
  }
  return WithFocus;
}
