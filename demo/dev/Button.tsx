import React, { Component } from "react";
import { observer } from "mobx-react";
import { Actuator, ActuatorArg } from "../../src";
import { Form, FormOrActuator, AsActuator } from "../../src";

interface BaseDevButtonProps<TActuator extends FormOrActuator> {
  actuator: TActuator;
}

type Arg<TActuator extends FormOrActuator> = ActuatorArg<AsActuator<TActuator>>;
type ArgProp<TActuator extends FormOrActuator> = Arg<TActuator> extends
  | void
  | null
  ? {}
  : void extends Arg<TActuator>
    ? { arg?: Arg<TActuator> }
    : { arg: Arg<TActuator> };

type DevButtonProps<TActuator extends FormOrActuator> = BaseDevButtonProps<
  TActuator
> &
  ArgProp<TActuator>;

@observer
export default class DevValidationLabel<
  TActuator extends FormOrActuator
> extends Component<DevButtonProps<TActuator>> {
  render() {
    const actuatorOrForm = this.props.actuator;
    const arg = (this.props as { arg?: Arg<TActuator> }).arg as any;
    const actuator = (actuatorOrForm instanceof Form
      ? actuatorOrForm.submitActuator
      : actuatorOrForm) as Actuator<any, any>;
    return (
      <div
        style={{
          border: "1px solid black",
          margin: "1em",
          padding: "0em 1em 0em 1em",
          boxSizing: "border-box",
          display: "inline-block",
          backgroundColor: actuator.isPending ? "#bdf" : "white"
        }}
      >
        <button type="button" onClick={() => actuator.invoke(arg)}>
          {actuator.name || "(actuator)"}
        </button>
      </div>
    );
  }
}
