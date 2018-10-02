import React from "react";
import { render } from "react-dom";
import App from "./App";
import AppState from "./AppState";

render(
  <App appState={new AppState()} />,
  document.getElementById("react-root")
);
