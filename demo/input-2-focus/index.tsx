import React from "react";
import { render } from "react-dom";
import App from "./App";
import AppState from "./AppState";

const appState = new AppState();
appState.myInputState.focusState.focus();
render(<App appState={appState} />, document.getElementById("react-root"));

Object.assign(window, { appState });
