import React from "react";
import { Input } from "mobx-ui-statelets";
import TextInput from "../TextInput";
import { mount } from "enzyme";

test("focusing on input should report focus state", () => {
  const input = new Input<string>("");
  const wrapper = mount(<TextInput name="" inputState={input} />);
  wrapper.find("input").simulate("focus");
  expect(input.focusState.isFocused).toBe(true);

  wrapper.find("input").simulate("blur");
  expect(input.focusState.isFocused).toBe(false);
});

test("focus state should be correct projected", () => {
  const input = new Input<string>("");
  const wrapper = mount(<TextInput name="" inputState={input} />);
  const el = (wrapper.instance() as TextInput).el as HTMLInputElement;
  expect(el).not.toBe(document.activeElement);

  input.focusState.focus();
  expect(el).toBe(document.activeElement);

  input.focusState.blur();
  expect(el).not.toBe(document.activeElement);
});
