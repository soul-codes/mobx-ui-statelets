import { observable, action } from "mobx";
import Validator from "./Validator";
import State, { StateDevOptions } from "./State";
import Form from "./Form";
import { Falsy, MaybeConstant, MaybePromise } from "../utils/types";
import withHover from "../partials/withHover";
import Actuator from "./Actuator";

let confirmCounter = 0;
let confirmStack: Input<any>[] = [];
let validationCandidates: Input<any>[] = [];

export default class Input<
  TValue extends BaseInputValue,
  TChoiceEvaluation = any
> extends withHover(State) {
  constructor(
    readonly defaultValue: TValue,
    readonly options?: InputOptions<TValue, TChoiceEvaluation>
  ) {
    super(options);
    this._value = defaultValue === void 0 ? ("" as TValue) : defaultValue;

    const choices = options && options.choices;
    if (typeof choices === "function") {
      this._choiceActuator = new Actuator(choices);
    } else {
      this._choices = choices || [];
    }
  }

  @action
  input(value: TValue) {
    if (this.isBeingSubmitted) return;
    this._inputValue = value;
    this.queryChoices();
  }

  normalizeValue(value: TValue) {
    const normalizer = this.options && this.options.normalizer;
    return normalizer ? (normalizer || 0)(value) : value;
  }

  get normalizedInputValue() {
    return this.normalizeValue(this.inputValue);
  }

  @action
  async confirm(args?: { value?: TValue; next?: boolean }) {
    if (this.isBeingSubmitted) return;

    let { value = void 0, next = false } = args || {};
    const confirmId = (this._confirmId = ++confirmCounter);
    const lastValue = this.inputValue;

    if (value === void 0) value = lastValue;
    if (value === this.value && !this.isConfirmed) return;

    value = this.normalizeValue(value);
    this._isConfirmed = true;

    const shouldValidate = ((this.options && this.options.revalidate) ||
      defaultShouldValidate)(value, this.value);
    this._value = value;
    this._inputValue = void 0;

    const isRootConfirm = !confirmStack.length;
    shouldValidate && validationCandidates.push(this);
    const confirmCascade = this.options && this.options.confirmCascade;
    if (confirmCascade) {
      confirmStack.push(this);
      confirmCascade.call(this, value, this);
      confirmStack.pop();
    }

    if (!isRootConfirm) return;
    const inputsToValidate = validationCandidates;
    validationCandidates = [];
    await Promise.all(inputsToValidate.map(input => input.validate()));

    if (!next) return;
    if (confirmId !== confirmCounter) return;

    const { form } = this;
    if (!form) return;
    if (!this.isValidated) return;
    if (!((this as any) as Input<any>).isFocused) return;

    const { nextInput } = form;
    if (nextInput) {
      form.options.autoNext && nextInput.focus();
    } else {
      form.options.autoSubmit && form.submit();
    }
  }

  @action
  reset(args?: { value?: TValue }) {
    const valueToSet = args && args.value !== void 0 ? args.value : this._value;
    this._value = this.normalizeValue(valueToSet);
    this._isConfirmed = false;
  }

  @action
  async queryChoices() {
    const choiceActuator = this._choiceActuator;
    if (!choiceActuator) return;

    const { options, inputValue } = this;
    const choiceQueryLimit = options && options.choiceQueryLimit;
    this._lastQuery = inputValue;
    await choiceActuator.invoke({
      inputValue: this.inputValue,
      limit: choiceQueryLimit === void 0 ? Infinity : choiceQueryLimit,
      offset: 0
    });
    this._choices = choiceActuator.result ? choiceActuator.result.choices : [];
  }

  @action
  async queryMoreChoices() {
    const choiceActuator = this._choiceActuator;
    if (!choiceActuator) return;
    if (choiceActuator.isPending)
      return choiceActuator.promise as Promise<void>;
    if (!choiceActuator.result) return this.queryChoices();

    const { inputValue } = this;
    if (inputValue !== this._lastQuery) return this.queryChoices();
    if (choiceActuator.result.stats.isDone) return;

    const { options } = this;
    const choiceQueryLimit = options && options.choiceQueryLimit;
    await choiceActuator.invoke({
      inputValue: this.inputValue,
      limit: choiceQueryLimit === void 0 ? Infinity : choiceQueryLimit,
      offset: this._choices.length
    });
    this._choices.push(...choiceActuator.result.choices);
  }

  @action
  async validate() {
    const confirmId = this._confirmId;
    const set = new Set<Validator<any, any, any>>();
    while (true) {
      if (confirmId !== this._confirmId) return;
      const result = await Promise.all(
        this.validators.map(async validator => {
          const hasChanged = set.has(validator) !== validator.isEnabled;
          if (validator.isEnabled) {
            set.add(validator);
            hasChanged && (await validator.validate());
          } else {
            set.delete(validator);
          }
          return hasChanged;
        })
      );
      if (!result.some(Boolean)) break;
    }
  }

  get inputValue() {
    const { _inputValue } = this;
    return _inputValue !== void 0 ? _inputValue : this._value;
  }

  get value() {
    return this._value;
  }

  get choices() {
    return this._choices;
  }

  get hasMoreChoices() {
    const choiceActuator = this._choiceActuator;
    if (!choiceActuator) return false;
    if (!choiceActuator.result) return true;
    return !choiceActuator.result.stats.isDone;
  }

  get totalChoices() {
    const choiceActuator = this._choiceActuator;
    if (!choiceActuator) return this._choices.length;
    if (!choiceActuator.result) return null;
    const total = choiceActuator.result.stats.total;
    return total === void 0 ? null : total;
  }

  get isQueryingChoices() {
    return Boolean(this._choiceActuator && this._choiceActuator.isPending);
  }

  get isValidated() {
    for (let validator of this.__$$private_validators) {
      if (!validator.isConclusivelyValid) return false;
    }
    return true;
  }

  get validators() {
    return [...this.__$$private_validators];
  }

  get forms() {
    return [...this.__$$private_forms];
  }

  get form() {
    return this.__$$private_forms.size === 1
      ? this.__$$private_forms.values().next().value
      : null;
  }

  get isBeingSubmitted() {
    for (let form of this.__$$private_forms) {
      if (form.isSubmitting) return true;
    }
    return false;
  }

  get isConfirmed() {
    return this._isConfirmed;
  }

  @observable
  private _value: TValue;

  @observable
  private _inputValue?: TValue;

  @observable
  private _isConfirmed = false;

  @observable
  __$$private_validators = new Set<Validator<any, any, any>>();

  @observable
  __$$private_forms = new Set<Form<any, any>>();

  private _confirmId = 0;

  private _choiceActuator: Actuator<
    InputChoiceQuery<TValue>,
    InputChoiceQueryResult<TValue, TChoiceEvaluation>
  > | null = null;

  @observable.shallow
  private _choices: InputChoice<TValue, TChoiceEvaluation>[] = [];
  private _lastQuery: TValue | null = null;
}

function defaultShouldValidate<TValue>(value: TValue, oldValue: TValue) {
  return value !== oldValue;
}

export interface InputOptions<
  TValue extends BaseInputValue,
  TChoiceEvaluation = any
> extends StateDevOptions {
  readonly normalizer?: ((value: TValue) => TValue) | Falsy;
  revalidate?: (value: TValue, oldValue: TValue) => boolean;
  choices?:
    | ((
        query: InputChoiceQuery<TValue>
      ) => MaybePromise<InputChoiceQueryResult<TValue, TChoiceEvaluation>>)
    | InputChoice<TValue, TChoiceEvaluation>[];
  choiceQueryLimit?: number;
  confirmCascade?: (
    this: Input<TValue>,
    value: TValue,
    self: Input<TValue>
  ) => void;
}

export type BaseInputValue = string | number | boolean;
export type InputValue<T extends Input<any>> = T extends Input<infer V>
  ? V
  : never;

export interface InputChoice<TValue extends BaseInputValue, TChoiceEvaluation> {
  value: TValue;
  evaluation: TChoiceEvaluation;
}

export interface InputChoiceQuery<TValue extends BaseInputValue> {
  inputValue: TValue;
  offset: number;
  limit: number;
}

export interface InputChoiceQueryResult<
  TValue extends BaseInputValue,
  TChoiceEvaluation
> {
  choices: InputChoice<TValue, TChoiceEvaluation>[];
  stats: {
    isDone?: boolean;
    total?: number;
  };
}
