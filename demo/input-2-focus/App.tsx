import { observer } from "mobx-react";
import React, { Component } from "react";
import AppState from "./AppState";
import TextInput from "./TextInput";

@observer
export default class App extends Component<{ appState: AppState }> {
  render() {
    const { appState } = this.props;
    const { myInputState } = appState;
    return (
      <div>
        Last confirmed value: <pre>{JSON.stringify(myInputState.value)}</pre>
        <TextInput inputState={appState.myInputState} />
        <button type="button" onClick={() => myInputState.focusState.focus()}>
          Focus
        </button>
      </div>
    );
  }
}
