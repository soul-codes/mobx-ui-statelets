import { observable, action } from "mobx";
import Validator from "./Validator";
import State, { StateDevOptions } from "./State";
import Form from "./Form";
import { Falsy } from "../utils/types";
import withHover from "../partials/withHover";

let confirmCounter = 0;

export default class Input<TValue extends BaseInputValue> extends withHover(
  State
) {
  constructor(
    readonly defaultValue: TValue,
    readonly normalizer?: ((value: TValue) => TValue) | Falsy,
    devOptions?: StateDevOptions
  ) {
    super(devOptions);
    this._value = defaultValue === void 0 ? ("" as TValue) : defaultValue;
  }

  @action
  input(value: TValue) {
    if (this.isBeingSubmitted) return;
    this._inputValue = value;
  }

  @action
  async confirm(args?: { value?: TValue; next?: boolean }) {
    if (this.isBeingSubmitted) return;

    let { value = void 0, next = false } = args || {};
    const confirmId = (this._confirmId = ++confirmCounter);
    const lastValue = this.inputValue;

    if (value === void 0) value = lastValue;
    value = this.normalizer ? (this.normalizer || 0)(value) : value;
    this._hasEverBeenConfirmed = true;

    const isDifferent = value !== this.value;
    this._value = value;
    this._inputValue = void 0;

    if (isDifferent) {
      await this.validate();
    }

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

  get isValidated() {
    for (let validator of this.__$$private_validators) {
      if (!validator.isValidated) return false;
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

  get hasEverBeenConfirmed() {
    return this._hasEverBeenConfirmed;
  }

  @observable
  private _value: TValue;

  @observable
  private _inputValue?: TValue;

  @observable
  private _hasEverBeenConfirmed = false;

  @observable
  __$$private_validators = new Set<Validator<any, any, any>>();

  @observable
  __$$private_forms = new Set<Form<any, any>>();

  private _confirmId = 0;
}

export type BaseInputValue = string | number | boolean;
export type InputValue<T extends Input<any>> = T extends Input<infer V>
  ? V
  : never;
