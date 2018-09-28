import State from "../state/State";
import { action, observable } from "mobx";

export default class HoverState extends State {
  @observable
  private _isHovered = false;

  /**
   * Returns true if the presentational layer has reported that the corresponding
   * element representing this state is being hovered on.
   */
  get isHovered(): boolean {
    return this._isHovered;
  }

  /**
   * The presentational layer should report the corresponding state that the
   * element is being hovered.
   */
  @action
  reportHover() {
    this._isHovered = true;
  }

  /**
   * The presentational layer should report to the corresponding state that
   * the element is no longer being hovered.
   */
  @action
  reportUnhover() {
    this._isHovered = false;
  }
}
