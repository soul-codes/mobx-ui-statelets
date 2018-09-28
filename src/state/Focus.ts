import State from "./State";
import { observable, action } from "mobx";

/**
 * @ignore
 */
export const currentFocus = observable.box<FocusState | null>(null, {
  deep: false
});

export default class FocusState extends State {
  static get currentFocus() {
    return currentFocus.get();
  }

  /**
   * Returns true if a UI state that represents a focusable entity is focused.
   */
  get isFocused(): boolean {
    return currentFocus.get() === this;
  }

  /**
   * Assigns focus state on the UI state that represents a focusable entity such as
   * an input. The presentation layer must define the focus projection to determine
   * exactly which DOM element gets focused.
   */
  @action
  focus() {
    currentFocus.set(this);
  }

  /**
   * Removes focus state on the UI state that represents a focusable entity such as
   * an input. The presentation layer must define the blur projection to determine
   * exactly how the DOM element is blurred.
   */
  @action
  blur() {
    this.isFocused && currentFocus.set(null);
  }

  /**
   * The presentational layer should report the focus state of its relevant
   * DOM element using this method.
   */
  @action
  reportFocus() {
    this.focus();
  }

  /**
   * The presentational layer should report the blurred state of its relevant
   * DOM element using this method.
   */
  @action
  reportBlur() {
    this.blur();
  }
}
