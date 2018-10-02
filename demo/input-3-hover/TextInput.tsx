import { observer } from "mobx-react";
import { syncFocusState, Input } from "mobx-ui-statelets";
import React, { Component } from "react";

@observer
@syncFocusState((component: TextInput) => ({
  el: component.el,
  state: component.props.inputState.focusState
}))
export default class TextInput extends Component<{
  inputState: Input;
  name: string;
}> {
  el: HTMLInputElement | null = null;
  render() {
    const { inputState, name } = this.props;
    return (
      <div
        onMouseEnter={() => inputState.hoverState.reportHover()}
        onMouseLeave={() => inputState.hoverState.reportUnhover()}
      >
        <label htmlFor={name}>{name}</label>
        <input
          ref={el => (this.el = el)}
          id={name}
          type="text"
          value={inputState.inputValue}
          onChange={ev => inputState.input(ev.target.value)}
          onFocus={() => inputState.focusState.reportFocus()}
          onBlur={() => {
            inputState.confirm();
            inputState.focusState.reportBlur();
          }}
          onKeyPress={ev => {
            if (ev.which === 13) {
              inputState.confirm();
            }
          }}
          onKeyDown={ev => {
            if (ev.which === 27) {
              inputState.clear();
              inputState.focusState.blur();
            }
          }}
        />
      </div>
    );
  }
}
