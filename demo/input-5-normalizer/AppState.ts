import { Input } from "mobx-ui-statelets";

export default class AppState {
  myInputState = new Input<string>("", {
    normalizer: value => value.trim().toLowerCase()
  });
}
