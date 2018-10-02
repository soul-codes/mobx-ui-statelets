import React, { Component } from "react";
import { observer } from "mobx-react";
import AppState from "./AppState";
import Button from "./Button";

const style = `
button:focus {
  color:red;
  border:1px solid red;
}
`;

@observer
export default class App extends Component<{ appState: AppState }> {
  render() {
    const { appState } = this.props;
    const styleContent = { __html: style };
    return (
      <div>
        <Button
          focusState={appState.myFocusState}
          onClick={() => appState.myFocusState.blur()}
        >
          Click to blur myself
        </Button>
        <button type="button" onClick={() => appState.myFocusState.focus()}>
          Focus on my neighbour
        </button>
        <p>{appState.myFocusState.isFocused ? "(focused)" : "(blurred)"}</p>
        <style dangerouslySetInnerHTML={styleContent} />
      </div>
    );
  }
}
