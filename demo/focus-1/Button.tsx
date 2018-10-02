import { observer } from "mobx-react";
import { syncFocusState, FocusState } from "mobx-ui-statelets";
import React, { Component } from "react";

@observer
@syncFocusState((component: Button) => ({
  el: component.el,
  state: component.props.focusState
}))
export default class Button extends Component<{
  focusState: FocusState;
  onClick: () => void;
}> {
  el: HTMLButtonElement | null = null;
  render() {
    const { focusState, onClick, children } = this.props;
    return (
      <button
        ref={el => (this.el = el)}
        type="button"
        onFocus={() => focusState.reportFocus()}
        onBlur={() => focusState.reportBlur()}
        onClick={onClick}
      >
        {children}
      </button>
    );
  }
}
