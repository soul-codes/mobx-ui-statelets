import React, { Component } from "react";
import { observer } from "mobx-react";
import { Task, TaskArg } from "../../src";
import { Form, FormOrTask, AsTask } from "../../src";

interface BaseDevButtonProps<TTask extends FormOrTask> {
  Task: TTask;
}

type Arg<TTask extends FormOrTask> = TaskArg<AsTask<TTask>>;
type ArgProp<TTask extends FormOrTask> = Arg<TTask> extends
  | void
  | null
  ? {}
  : void extends Arg<TTask>
    ? { arg?: Arg<TTask> }
    : { arg: Arg<TTask> };

type DevButtonProps<TTask extends FormOrTask> = BaseDevButtonProps<
  TTask
> &
  ArgProp<TTask>;

@observer
export default class DevValidationLabel<
  TTask extends FormOrTask
> extends Component<DevButtonProps<TTask>> {
  render() {
    const TaskOrForm = this.props.Task;
    const arg = (this.props as { arg?: Arg<TTask> }).arg as any;
    const Task = (TaskOrForm instanceof Form
      ? TaskOrForm.submitTask
      : TaskOrForm) as Task<any, any>;
    return (
      <div
        style={{
          border: "1px solid black",
          margin: "1em",
          padding: "0em 1em 0em 1em",
          boxSizing: "border-box",
          display: "inline-block",
          backgroundColor: Task.isPending ? "#bdf" : "white"
        }}
      >
        <button type="button" onClick={() => Task.invoke(arg)}>
          {Task.name || "(Task)"}
        </button>
      </div>
    );
  }
}
