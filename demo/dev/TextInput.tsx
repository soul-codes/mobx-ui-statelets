import React, { Component } from "react";
import randomId from "./utils/randomId";
import { observable } from "mobx";
import { syncFocusState, Input, resolveDOMQuery } from "../../src";

export interface DevTextInputProps {
  input: Input<string>;
}

@resolveDOMQuery((component: DevTextInput, resolve) => {
  return [
    resolve(component.props.input.boundsQuery, {
      bounds() {
        return component.el && component.el.getBoundingClientRect();
      }
    })
  ];
})
@syncFocusState((component: DevTextInput) => ({
  el: component.el,
  focusState: component.props.input.focusState
}))
export default class DevTextInput extends Component<DevTextInputProps> {
  render() {
    const { input } = this.props;
    const id = randomId();
    const isHoveredValidator = input.validators.some(
      validator => validator.hoverState.isHovered
    );

    return (
      <div
        style={{
          border: (isHoveredValidator ? 4 : 1) + "px solid black",
          margin: "1em",
          padding: isHoveredValidator
            ? "0em 1em 0em 1em"
            : "3px calc(1em + 3px) 3px calc(1em + 3px)",
          boxSizing: "border-box",
          display: "inline-block"
        }}
        onMouseOver={() => input.hoverState.reportHover()}
        onMouseOut={() => input.hoverState.reportUnhover()}
      >
        <p>
          <label htmlFor={id}>{input.name}</label>
        </p>
        <input
          id={id}
          type="text"
          value={input.inputValue}
          onChange={ev => input.input(ev.target.value)}
          onBlur={() => {
            input.focusState.reportBlur();
            input.confirm();
          }}
          onFocus={() => input.focusState.reportFocus()}
          onKeyPress={ev => ev.which === 13 && input.confirm({ next: true })}
          ref={el => {
            this.el = el;
          }}
        />
        <p>Stable value: {input.value}</p>
        <p>{input.validators.length} validators</p>
      </div>
    );
  }

  @observable
  el: HTMLInputElement | null = null;
}
