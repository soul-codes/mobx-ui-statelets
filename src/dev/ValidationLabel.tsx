import React, { Component } from "react";
import { observer } from "mobx-react";
import Validator from "../state/Validator";

export interface DevValidationLabelProps {
  validator: Validator<any, any, any>;
}

@observer
export default class DevValidationLabel extends Component<
  DevValidationLabelProps
> {
  render() {
    const { validator } = this.props;
    const isVirgin = !validator.hasValidationEverBeenRequested;
    const isEnabled = validator.isEnabled;
    const bg = !isEnabled
      ? "white"
      : isVirgin
        ? "#ddd"
        : validator.isValidationPending
          ? "#ffd"
          : validator.isValidated
            ? "#dfd"
            : "#fdd";
    const isHoveredInput = validator.flattedInputs.some(
      input => input.isHovered
    );

    return (
      <div
        style={{
          border:
            (isHoveredInput ? 4 : 1) +
            "px solid " +
            (isEnabled ? "black" : "lightgray"),
          backgroundColor: bg,
          margin: "1em",
          padding: isHoveredInput
            ? "0em 1em 0em 1em"
            : "3px calc(1em + 3px) 3px calc(1em + 3px)",
          boxSizing: "border-box",
          display: "inline-block",
          color: isEnabled ? "black" : "lightgray"
        }}
      >
        <pre>Correction: {JSON.stringify(validator.correction, null, 2)}</pre>
        <pre>Error: {JSON.stringify(validator.error, null, 2)}</pre>
      </div>
    );
  }
}
