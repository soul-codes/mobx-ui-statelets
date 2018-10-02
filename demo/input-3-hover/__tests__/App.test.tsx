import React from "react";
import TextInput from "../TextInput";
import App from "../App";
import AppState from "../AppState";
import { mount } from "enzyme";

test("presents name, email, and flight number inputs", () => {
  const appState = new AppState();
  const wrapper = mount(<App appState={appState} />);
  const inputs = wrapper.find(TextInput);

  expect(
    inputs.filterWhere(n => n.prop("inputState") === appState.name)
  ).toHaveLength(1);

  expect(
    inputs.filterWhere(n => n.prop("inputState") === appState.email)
  ).toHaveLength(1);

  expect(
    inputs.filterWhere(n => n.prop("inputState") === appState.flightNumber)
  ).toHaveLength(1);
});
