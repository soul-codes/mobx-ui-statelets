import { observer } from "mobx-react";
import React, { Component } from "react";
import AppState from "./AppState";
import TextInput from "./TextInput";

@observer
export default class App extends Component<{ appState: AppState }> {
  render() {
    const { appState } = this.props;
    return (
      <div>
        <h1>Check into your flight</h1>
        <TextInput name="name" inputState={appState.name} />
        <TextInput name="email" inputState={appState.email} />
        <TextInput name="flight" inputState={appState.flightNumber} />
        <div id="help">{getHelp(appState)}</div>
      </div>
    );
  }
}

function getHelp(appState: AppState) {
  const { activeInput } = appState;
  if (activeInput === appState.email) {
    return "The e-mail you used to book the flight";
  }
  if (activeInput === appState.name) {
    return "Your last name";
  }
  if (activeInput === appState.flightNumber) {
    return "The flight you want to check-in";
  }
  return "";
}
