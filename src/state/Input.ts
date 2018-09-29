import { observable, action } from "mobx";
import Validator, { privateInputValidators } from "./Validator";
import State, { StateDevOptions } from "./State";
import Form, { privateInputForms } from "./Form";
import { Falsy } from "../utils/types";
import InputGroup, { privateInputGroup } from "./InputGroup";
import FocusState from "../state/Focus";
import HoverState from "../state/Hover";
import BoundsQuery from "../domQuery/Bounds";
import deepEqual from "../utils/deepEqual";

let confirmCounter = 0;
let confirmStack: Input<any>[] = [];
let validationCandidates: Input<any>[] = [];

/**
 * Represents an input UI state. It acts as a domain store but also provides
 * a separate input value state and state for querying assistive input choices.
 *
 * @typeparam TValue the input's value type.
 */
export default class Input<TValue = any> extends State {
  /**
   * Instantiates the input state.
   * @param defaultValue Specifies the input's initial value.
   * @param options Customizes normalization and general responses to user
   * interactions.
   */
  constructor(
    readonly defaultValue: TValue,
    readonly options?: InputOptions<TValue>
  ) {
    super(options);
    this._value = defaultValue;
  }

  /**
   * Sets the input value as a consequence of the user inputting a value.
   *
   * For input with choices, inputting a value will start a new query for possible
   * choices.
   *
   * An input that is being submitted by a form will not respond to this method.
   * @param value
   */
  @action
  input(value: TValue) {
    if (this.isBeingSubmitted) return;
    this._inputValue = value;
    this.validate("input");
  }

  /**
   * Normalizes an input value using the normalizer provided in the input options.
   * @param value
   *
   * @see [[InputOptions.normalizer]]
   * @see [[normalizedInputValue]]
   */
  normalizeValue(value: TValue) {
    const normalizer = this.options && this.options.normalizer;
    return normalizer ? (normalizer || 0)(value) : value;
  }

  /**
   * Returns the input value, but normalized by the normalizer provided in the
   * input options.
   */
  get normalizedInputValue() {
    return this.normalizeValue(this.inputValue);
  }

  /**
   * Commits the input value into the store as a consequence of a user action
   * that confirms an input. For instance, this method should be called when
   * the user blurs out of an input or hits enter on a single-line input.
   *
   * The value to confirm is the normalized by the normalizer provided in the
   * input options.
   *
   * The method is no-op if the value to confirm is exactly the same as the
   * value of the store and the input has been confirmed already.
   *
   * The input will ask its validators to (re-)trigger validation if the value is
   * different from the store value. If the "revalidate" option is configured,
   * the decision whether or not to validate completely depends on this predicate.
   *
   * @param args Customizes the nature of the confirm interaction.
   *
   * @see [[InputOptions.normalizer]]
   * @see [[InputOptions.revalidate]]
   * @see [[InputOptions.confirmCascade]]
   */
  @action
  async confirm(args?: {
    /**
     * The value to confirm into the store. If none is provided, the current
     * input value will be confirmed into the store.
     */
    value?: TValue;

    /**
     * If true, the input will try to automatically "advance" the form's progress
     * either by focusing the next input in the form or by attempting to submit
     * the form. Note that for this to work, the input must be associated with
     * a form and the form must configure autoNext and/or autoSubmit.
     * @see [[FormOptions.autoNext]]
     * @see [[FormOptions.autoSubmit]]
     */
    next?: boolean;
  }) {
    if (this.isBeingSubmitted) return;

    let { value = void 0, next = false } = args || {};
    const confirmId = (this._confirmId = ++confirmCounter);
    const lastValue = this.inputValue;
    this._inputValue = void 0;

    if (value === void 0) value = lastValue;
    if (deepEqual(value, this._inputValue) && !this.isConfirmed) return;

    value = this.normalizeValue(value);
    this._isConfirmed = true;

    const shouldValidate = ((this.options && this.options.revalidate) ||
      defaultShouldValidate)(value, this.value);
    this._value = value;

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

    const buffer = new Set<InputGroup<any>>();
    inputsToValidate.forEach(input =>
      privateInputGroup
        .get(input)
        .forEach((group: InputGroup<any>) => buffer.add(group))
    );
    buffer.forEach(group => {
      const { handleInputConfirm = void 0 } = group.options || {};
      handleInputConfirm && handleInputConfirm(this);
    });
    await Promise.all(inputsToValidate.map(input => input.validate("confirm")));

    if (!next) return;
    if (confirmId !== confirmCounter) return;

    const { form } = this;
    if (!form) return;
    if (!this.isValidated) return;
    if (!((this as any) as Input<any>).focusState.isFocused) return;

    const { nextInput } = form;
    if (nextInput) {
      form.options.autoNext && nextInput.focusState.focus();
    } else {
      form.options.autoSubmit && form.submit();
    }
  }

  /**
   * Arbitrarily flag the input as having confirmed by the user.
   */
  @action
  markAsConfirmed() {
    this._isConfirmed = true;
  }

  /**
   * Resets the user-confirmed flag. Optionally resets the input value to any
   * arbitrary value.
   * @param args
   */
  @action
  reset(args?: { value?: TValue }) {
    const valueToSet = args && args.value !== void 0 ? args.value : this._value;
    this._value = this.normalizeValue(valueToSet);
    this._isConfirmed = false;
  }

  /**
   * Request validation on the input. This goes through all validators that
   * are associated with the input.
   *
   * If a validator is not enabled (see the "enabled" validator option) initially,
   * it is not validated but will be checked again after the first set of
   * enabled validators have completed. You can exploit this behavior to write
   * validators that are only enabled based on validity of other validators.
   *
   * @see [[ValidatorOptions.enabled]]
   */
  @action
  async validate(filter: "input" | "confirm" | null = null) {
    const validationId = ++this._validationId;
    const set = new Set<Validator<any, any, any>>();
    while (true) {
      if (validationId !== this._validationId) return;
      const result = await Promise.all(
        this.validators.map(async validator => {
          if (validator.isValidationPending) {
            await validator.promise;
            return true;
          }

          const isCandidateValidator =
            !filter ||
            (filter === "input" &&
              validator.validatorOptions.validateOnInput) ||
            (filter === "confirm" &&
              !validator.validatorOptions.validateOnInput);
          if (!isCandidateValidator) return false;

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

  /**
   * Gets the current input value. If the user has not touched the input, this
   * is the same as the store value.
   */
  get inputValue() {
    const { _inputValue } = this;
    return _inputValue !== void 0 ? _inputValue : this._value;
  }

  /**
   * Returns true if the input has put content without confirming it. Essentially
   * means input() has been called without calling confirm().
   */
  get isPending() {
    return this._inputValue !== void 0;
  }

  /**
   * Returns true if the input value is different from the last confirmed value.
   */
  get hasChanged() {
    return this.isPending && this._inputValue !== this._value;
  }

  /**
   * Gets the store value. If the user has pending input, that value is not
   * reflected here.
   */
  get value() {
    return this._value;
  }

  /**
   * Returns true if all validators on this input are conclusively valid.
   * @see [[Validator.isConclusivelyValid]]
   */
  get isValidated() {
    for (let validator of privateInputValidators.get(this)) {
      if (!validator.isConclusivelyValid) return false;
    }
    return true;
  }

  /**
   * Returns all validators associated with this input.
   */
  get validators(): Validator<any, any, any, any>[] {
    return [...privateInputValidators.get(this)];
  }

  /**
   * Returns all forms associated with this input.
   */
  get forms(): Form<any, any, any>[] {
    return [...privateInputForms.get(this)];
  }

  /**
   * Return the singleton form that this input is associated to, only in the case
   * where this input is indeed associated to that single form. Returns null
   * if the input is not associated to any form or is associated to multiple forms.
   */
  get form() {
    const forms = privateInputForms.get(this);
    return forms.size === 1 ? forms.values().next().value : null;
  }

  /**
   * Returns true if any of the forms that this input belongs is being submitted.
   */
  get isBeingSubmitted() {
    for (let form of privateInputForms.get(this)) {
      if (form.isSubmitting) return true;
    }
    return false;
  }

  /**
   * Returns true if the user has ever confirmed the input.
   */
  get isConfirmed() {
    return this._isConfirmed;
  }

  readonly focusState = new FocusState();
  readonly hoverState = new HoverState();
  readonly boundsQuery = new BoundsQuery();

  @observable.shallow
  private _value: TValue;

  @observable.shallow
  private _inputValue?: TValue;

  @observable
  private _isConfirmed = false;

  private _confirmId = 0;
  private _validationId = 0;
}

/**
 * Default re-validation predicate, which is to re-validate if the input value
 * has changed.
 * @param value
 * @param oldValue
 */
function defaultShouldValidate<TValue>(value: TValue, oldValue: TValue) {
  return !deepEqual(value, oldValue);
}

/**
 * Describes options customizing an input UI state.
 * @typeparam TValue the input's value type
 */
export interface InputOptions<TValue = any> extends StateDevOptions {
  /**
   * Specifies how the input value should be normalized before it gets parsed
   * into a domain value. You can use this hook to e.g. remove extra spaces
   * from inputs or converting separating characters into a standardized form.
   *
   * Unlike parsing, normalization should never fail: At worst case the input
   * value should be returned as is.
   *
   * @param value input value to normalize
   */
  readonly normalizer?: ((value: TValue) => TValue) | Falsy;

  /**
   * specifies if an input should re-validate on confirm. This defaults to
   * true if the two values are the same.
   *
   * @param value the current input value to confirm
   * @param oldValue the previously confirmed input value
   */
  revalidate?: (value: TValue, oldValue: TValue) => boolean;

  /**
   * Specifies how confirming this input will synchronously confirm the other
   * inputs.
   *
   * Using cascading over separate confirm() calls make sure that domain validation
   * depending on either or both inputs are triggered in the same validation
   * cycle.
   *
   * If using an arrow function, the input itself is given back as second argument
   * for convenience.
   *
   * @param value The input value to confirm.
   * @param self Handy reference to the input itself.
   */
  confirmCascade?(
    this: Input<TValue>,
    value: TValue,
    self: Input<TValue>
  ): void;
}

/**
 * Infers the input value type from the input type.
 * @ignore
 */
export type InferInputValue<T extends Input<any>> = T extends Input<infer V>
  ? V
  : never;
