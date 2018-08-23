import { MaybeConstant, ArrayItem } from "../utils/types";
import Input, { InputValue } from "./Input";
import State, { StateDevOptions, StateProjections } from "./State";
import { computed, action } from "mobx";

export default class InputGroup<
  TInputs extends InputGroupContent,
  TProjection extends StateProjections = {}
> extends State<TProjection> {
  constructor(inputs: MaybeConstant<() => TInputs>, options?: StateDevOptions) {
    super(options);
    this._inputs = inputs;
  }

  @computed
  get inputs(): InputGroupShape<TInputs> {
    return unwrapGroups(this.structure);
  }

  @computed
  get value(): InputGroupValue<TInputs> {
    return getValueFromShape(this.inputs);
  }

  @action
  reset(args?: { value?: InputGroupValue<TInputs> }) {
    resetShape(this.structure, args && args.value);
  }

  @computed
  get flattedInputs() {
    return flattenInputs(this.inputs);
  }

  @computed
  get structure() {
    const { _inputs } = this;
    return typeof _inputs === "function" ? _inputs() : _inputs;
  }

  @computed
  get flattenedStructure() {
    return flattenStructure(this.structure);
  }

  private _inputs: MaybeConstant<() => TInputs>;
}

function getValueFromShape<TInputs extends InputShape>(
  inputs: TInputs
): ValueOfInputShape<TInputs> {
  if (inputs instanceof Input) return inputs.value;
  if (Array.isArray(inputs)) return inputs.map(getValueFromShape) as any;

  const result = Object.create(null);
  for (let key in inputs) {
    result[key] = getValueFromShape((inputs as any)[key]);
  }
  return result;
}

function resetShape<TInputs extends InputGroupContent>(
  inputs: TInputs,
  value?: InputGroupValue<TInputs>
) {
  if (inputs instanceof Input) inputs.reset({ value });
  else if (inputs instanceof InputGroup) resetShape(inputs.structure, value);
  else if (Array.isArray(inputs))
    inputs.map((input, index) =>
      resetShape(input, value && (value as Array<any>)[index])
    );
  else {
    for (let key in inputs) {
      resetShape((inputs as any)[key], value && (value as any)[key]);
    }
  }
}

function flattenInputs<TInputs extends InputShape>(
  inputs: TInputs,
  buffer: Input<any>[] = []
) {
  if (inputs instanceof Input) buffer.push(inputs as any);
  else if (Array.isArray(inputs))
    inputs.forEach(inputs => flattenInputs(inputs, buffer));
  else {
    for (let key in inputs as any) {
      flattenInputs((inputs as any)[key], buffer);
    }
  }
  return buffer;
}

function flattenStructure<TInputs extends InputGroupContent>(
  inputs: TInputs,
  buffer: (Input<any> | InputGroup<any>)[] = []
) {
  if (inputs instanceof InputGroup || inputs instanceof Input)
    buffer.push(inputs as any);
  else if (Array.isArray(inputs))
    inputs.forEach(inputs => flattenStructure(inputs, buffer));
  else {
    for (let key in inputs as any) {
      flattenStructure((inputs as any)[key], buffer);
    }
  }
  return buffer;
}

function unwrapGroups<TInputs extends InputGroupContent>(
  inputs: TInputs
): InputGroupShape<TInputs> {
  if (inputs instanceof InputGroup) return unwrapGroups(inputs.inputs);
  else if (inputs instanceof Input) return inputs as any;
  else if (Array.isArray(inputs)) return inputs.map(unwrapGroups) as any;
  else {
    const result = Object.create(null);
    for (let key in inputs as any) {
      result[key] = unwrapGroups((inputs as any)[key]);
    }
    return result;
  }
}

export type InputGroupContent =
  | Input<any>
  | InputGroup<any>
  | $InputGroupContentObject
  | $InputGroupContentArray;

interface $InputGroupContentObject {
  [key: string]: InputGroupContent;
}
interface $InputGroupContentArray extends Array<InputGroupContent> {}

export type InputGroupShape<T extends InputGroupContent> = T extends Input<any>
  ? T
  : T extends InputGroup<any>
    ? T["inputs"]
    : T extends $InputGroupContentObject
      ? { [key in keyof T]: InputGroupShape<T[key]> }
      : T extends $InputGroupContentArray
        ? $InputShapeOfGroupContentArray<T>
        : never;
interface $InputShapeOfGroupContentArray<T extends $InputGroupContentArray>
  extends Array<InputGroupShape<ArrayItem<T>>> {}

export type InputShape = Input<any> | $InputShapeObject | $InputShapeArray;
interface $InputShapeObject {
  [key: string]: InputShape;
}
interface $InputShapeArray extends Array<InputShape> {}

export type InputGroupValue<T extends InputGroupContent> = ValueOfInputShape<
  InputGroupShape<T>
>;

type ValueOfInputShape<T extends InputShape> = T extends Input<any>
  ? InputValue<T>
  : T extends $InputShapeObject
    ? { [key in keyof T]: ValueOfInputShape<T[key]> }
    : T extends Array<InputShape> ? $InputShapeArrayValue<T> : never;

interface $InputShapeArrayValue<T extends Array<InputShape>>
  extends Array<ValueOfInputShape<ArrayItem<T>>> {}
