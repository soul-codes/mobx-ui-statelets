import { MaybeConstant, ArrayItem } from "../utils/types";
import Input, { InferInputValue } from "./Input";
import State, { StateDevOptions, StateProjections } from "./State";
import { computed, action } from "mobx";
import createLookup from "../utils/lookup";

/**
 * Represents any arbitrary structural grouping of inputs.
 *
 * This is the base for validator state (which can validate multiple inputs) and
 * forms (whose action can depend on several inputs).
 */
export default class InputGroup<
  TInputs extends InputGroupContent,
  TProjection extends StateProjections = {}
> extends State<TProjection> {
  /**
   * Instantiates an input group
   * @param inputs The structure of inputs. This maybe a single input, an object
   * of inputs or input groups, an array of inputs or input groups, or a nested
   * structure thereof, or a function returning such a structure.
   *
   * @param options Customizes input group behavior.
   */
  constructor(
    inputs: MaybeConstant<() => TInputs>,
    readonly options?: InputGroupOptions
  ) {
    super(options);
    this._inputs = inputs;
    createLookup(
      this,
      () => this.flattedInputs,
      input => input.__$$private_groups as any
    );
  }

  /**
   * Reflects the structure of inputs as provided in the constructor. If a function
   * was passed in the constructor, it is evaluated here. Subgroups in the
   * structures are collapsed into their structures.
   *
   * Use `structure` if you need the subgroups preserved.
   * Use `flattenedInputs` if you don't care about the structure and just want
   * the inputs in an array.
   *
   * @see structure
   * @see flattenedInputs
   */
  @computed
  get inputs(): InputGroupShape<TInputs> {
    return unwrapGroups(this.structure);
  }

  /**
   * Returns a structure of input value that corresponds to the input structure
   * passed to the constructor. For instance, if the constructor was instantiated
   * with `{ a : someInput, b: someOuterInput }`, the value here will also have the
   * keys `a` and `b` whose value are the respective input values.
   */
  @computed
  get value(): InferInputGroupValue<TInputs> {
    return getValueFromShape(this.inputs);
  }

  /**
   * Batch-reset the inputs using the value that is provided in the group.
   * This is the same as calling reset on the individual input instances.
   * @param args
   */
  @action
  reset(args?: {
    /**
     * The value to reset to. This should match the structure of the inputs.
     * If not provided, the inputs will reset to their defaults recursively.
     */
    value?: InferInputGroupValue<TInputs>;
  }) {
    resetShape(this.structure, args && args.value);
  }

  /**
   * Returns a flattened array of inputs. The order of inputs is not guaranteed.
   *
   * Use `structure` to get the input structure as specified in the constructor
   * including the subgroups, or `inputs` without the subgroups.
   *
   * @see structure
   * @see inputs
   */
  @computed
  get flattedInputs() {
    return flattenInputs(this.inputs);
  }

  /**
   * Returns the structure of the input group. If the input structure contains
   * subgroups, the subgroups are preserved here.
   *
   * Use `inputs` to get the input structure without subgroups.
   *
   * Use `flattenedInputs` to get an array of inputs whose order does not matter.
   * @see flattedInputs
   * @see inputs
   */
  @computed
  get structure() {
    const { _inputs } = this;
    return typeof _inputs === "function" ? _inputs() : _inputs;
  }

  /**
   * Returns an array of the input group's structural items. Unlike `flattenedInputs`,
   * the subgroups are not broken down into inputs here.
   */
  @computed
  get flattenedStructure() {
    return flattenStructure(this.structure);
  }

  private _inputs: MaybeConstant<() => TInputs>;

  __$$private__receiveInputEvent(input: Input<any>, kind: "confirm") {
    const { handleInputConfirm = void 0 } = this.options || {};
    kind === "confirm" && handleInputConfirm && handleInputConfirm(input);
  }
}

/**
 * Describe customization of an input group.
 */
interface InputGroupOptions extends StateDevOptions {
  /**
   * Extra hooks that listens to when one of the inputs belonging to the group
   * was confirmed by the user.
   */
  handleInputConfirm?: (input: Input<any>) => void;
}

/**
 * Extracts a structure of input values from a corresponding structure of inputs.
 * @param inputs
 */
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

/**
 * Recursively resets a structure of input based on a corresponding structure
 * of input values.
 * @param inputs
 * @param value
 */
function resetShape<TInputs extends InputGroupContent>(
  inputs: TInputs,
  value?: InferInputGroupValue<TInputs>
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

/**
 * Extracts nested inputs from the input structures into a neat array. Does
 * collapse input groups into inputs.
 * @param inputs
 * @param buffer
 */
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

/**
 * Extract nested inputs and input groups from the input structures into a
 * neat array. Does not collapse input groups.
 * @param inputs
 * @param buffer
 */
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

/**
 * Recursively unwraps an input group until we obtain a structure of inputs.
 * @param inputs
 */
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

/**
 * Describes the valid structure for an input group content, which is:
 * - an input
 * - an input group
 * - an array of inputs or input groups
 * - an object of inputs or input groups
 * - a nested structure of values above.
 */
export type InputGroupContent =
  | Input<any>
  | InputGroup<any>
  | $InputGroupContentObject
  | $InputGroupContentArray;

interface $InputGroupContentObject {
  [key: string]: InputGroupContent;
}
interface $InputGroupContentArray extends Array<InputGroupContent> {}

/**
 * Infer the shape of inputs (with subgroups collapsed) from an input group
 * content type.
 */
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

type InputShape = Input<any> | $InputShapeObject | $InputShapeArray;
interface $InputShapeObject {
  [key: string]: InputShape;
}
interface $InputShapeArray extends Array<InputShape> {}

/**
 * Infers the structure of input values from a structure of input group content.
 */
export type InferInputGroupValue<
  T extends InputGroupContent
> = ValueOfInputShape<InputGroupShape<T>>;

type ValueOfInputShape<T extends InputShape> = T extends Input<any>
  ? InferInputValue<T>
  : T extends $InputShapeObject
    ? { [key in keyof T]: ValueOfInputShape<T[key]> }
    : T extends Array<InputShape> ? $InputShapeArrayValue<T> : never;

interface $InputShapeArrayValue<T extends Array<InputShape>>
  extends Array<ValueOfInputShape<ArrayItem<T>>> {}
