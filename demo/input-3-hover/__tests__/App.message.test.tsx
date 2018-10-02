import React from "react";
import App from "../App";
import AppState from "../AppState";
import { mount } from "enzyme";

test("presents correct help depending on active input", () => {
  const appState = new AppState();
  const wrapper = mount(<App appState={appState} />);

  appState.name.focusState.focus();
  expect(wrapper.find("#help").text()).toBe("Your last name");

  appState.email.focusState.focus();
  expect(wrapper.find("#help").text()).toBe(
    "The e-mail you used to book the flight"
  );

  appState.flightNumber.focusState.focus();
  expect(wrapper.find("#help").text()).toBe("The flight you want to check-in");

  appState.flightNumber.focusState.blur();
  expect(wrapper.find("#help").text()).toBe("");
});
