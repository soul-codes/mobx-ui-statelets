import React, { Component } from "react";
import { observer } from "mobx-react";
import AppState from "./AppState";

@observer
export default class App extends Component<{ appState: AppState }> {
  render() {
    const { appState } = this.props;
    const { myInputState } = appState;
    return (
      <div>
        Last confirmed value: <pre>{JSON.stringify(myInputState.value)}</pre>
        <input
          type="text"
          value={myInputState.inputValue}
          onChange={ev => myInputState.input(ev.target.value)}
          onBlur={() => myInputState.confirm()}
          onKeyPress={ev => {
            if (ev.which === 13) {
              myInputState.confirm();
            }
          }}
        />
      </div>
    );
  }
}
