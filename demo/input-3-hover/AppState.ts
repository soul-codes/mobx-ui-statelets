import { Input } from "mobx-ui-statelets";

export default class AppState {
  name = new Input<string>("");
  email = new Input<string>("");
  flightNumber = new Input<string>("");

  get activeInput() {
    const inputs = [this.email, this.flightNumber, this.name];
    return (
      inputs.find(input => input.focusState.isFocused) ||
      inputs.find(input => input.hoverState.isHovered)
    );
  }
}
