import { observable, action } from "mobx";
import Validator from "./Validator";
import State, { StateDevOptions } from "./State";
import Form from "./Form";
import { Falsy, MaybePromise } from "../utils/types";
import withHover from "../partials/withHover";
import Task from "./Task";
import InputGroup from "./InputGroup";

let confirmCounter = 0;
let confirmStack: Input<any>[] = [];
let validationCandidates: Input<any>[] = [];

/**
 * Represents an input UI state. It acts as a domain store but also provides
 * a separate input value state and state for querying assistive input choices.
 *
 * @template TValue the input's value type.
 * @template TChoiceMetadata optional type for the metadata of input choices.
 */
export default class Input<
  TValue extends BaseInputValue = string,
  TChoiceMetadata = any
> extends withHover(State) {
  /**
   * Instantiates the input state.
   * @param defaultValue Specifies the input's initial value.
   * @param options Customizes normalization and general responses to user
   * interactions.
   */
  constructor(
    readonly defaultValue: TValue,
    readonly options?: InputOptions<TValue, TChoiceMetadata>
  ) {
    super(options);
    this._value = defaultValue === void 0 ? ("" as TValue) : defaultValue;

    const choices = options && options.choices;
    if (typeof choices === "function") {
      this._choiceTask = new Task(choices);
    } else {
      this._choices = choices || [];
    }
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
    this.queryChoices();
  }

  /**
   * Normalizes an input value using the normalizer provided in the input options.
   * @param value
   *
   * @see InputOptions.normalizer
   * @see normalizedInputValue
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
   * @see InputOptions.normalizer
   * @see InputOptions.revalidate
   * @see InputOptions.confirmCascade
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
     * @see FormOptions.autoNext
     * @see FormOptions.autoSubmit
     */
    next?: boolean;
  }) {
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

    const buffer = new Set<InputGroup<any>>();
    inputsToValidate.forEach(input =>
      input.__$$private_groups.forEach(group => buffer.add(group))
    );
    buffer.forEach(group =>
      group.__$$private__receiveInputEvent(this, "confirm")
    );
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
   * Force querying of input choices.
   */
  @action
  async queryChoices() {
    const choiceTask = this._choiceTask;
    if (!choiceTask) return;

    const { options, inputValue } = this;
    const choiceQueryLimit = options && options.choiceQueryLimit;
    this._lastQuery = inputValue;
    await choiceTask.invoke({
      inputValue: this.inputValue,
      limit: choiceQueryLimit === void 0 ? Infinity : choiceQueryLimit,
      offset: 0
    });
    this._choices = choiceTask.result ? choiceTask.result.choices : [];
  }

  /**
   * Query more choices based on the current input value.
   */
  @action
  async queryMoreChoices() {
    const choiceTask = this._choiceTask;
    if (!choiceTask) return;
    if (choiceTask.isPending) return choiceTask.promise as Promise<void>;
    if (!choiceTask.result) return this.queryChoices();

    const { inputValue } = this;
    if (inputValue !== this._lastQuery) return this.queryChoices();
    if (choiceTask.result.stats.isDone) return;

    const { options } = this;
    const choiceQueryLimit = options && options.choiceQueryLimit;
    await choiceTask.invoke({
      inputValue: this.inputValue,
      limit: choiceQueryLimit === void 0 ? Infinity : choiceQueryLimit,
      offset: this._choices.length
    });
    this._choices.push(...choiceTask.result.choices);
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
   * @see ValidatorOptions.enabled
   */
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

  /**
   * Gets the current input value. If the user has not touched the input, this
   * is the same as the store value.
   */
  get inputValue() {
    const { _inputValue } = this;
    return _inputValue !== void 0 ? _inputValue : this._value;
  }

  /**
   * Gets the store value. If the user has pending input, that value is not
   * reflected here.
   */
  get value() {
    return this._value;
  }

  /**
   * Gets the current set of available choices.
   */
  get choices() {
    return this._choices;
  }

  /**
   * Returns true if it is possible to load more choices.
   */
  get hasMoreChoices() {
    const choiceTask = this._choiceTask;
    if (!choiceTask) return false;
    if (!choiceTask.result) return true;
    return !choiceTask.result.stats.isDone;
  }

  /**
   * Returns the total number of choices.
   */
  get totalChoices() {
    const choiceTask = this._choiceTask;
    if (!choiceTask) return this._choices.length;
    if (!choiceTask.result) return null;
    const total = choiceTask.result.stats.total;
    return total === void 0 ? null : total;
  }

  /**
   * Returns true if the choices are being asynchronously fetched.
   */
  get isQueryingChoices() {
    return Boolean(this._choiceTask && this._choiceTask.isPending);
  }

  /**
   * Returns true if all validators on this input are conclusively valid.
   * @see Validator~isConclusivelyValid
   */
  get isValidated() {
    for (let validator of this.__$$private_validators) {
      if (!validator.isConclusivelyValid) return false;
    }
    return true;
  }

  /**
   * Returns all validators associated with this input.
   */
  get validators() {
    return [...this.__$$private_validators];
  }

  /**
   * Returns all forms associated with this input.
   */
  get forms() {
    return [...this.__$$private_forms];
  }

  /**
   * Return the singleton form that this input is associated to, only in the case
   * where this input is indeed associated to that single form. Returns null
   * if the input is not associated to any form or is associated to multiple forms.
   */
  get form() {
    return this.__$$private_forms.size === 1
      ? this.__$$private_forms.values().next().value
      : null;
  }

  /**
   * Returns true if any of the forms that this input belongs is being submitted.
   */
  get isBeingSubmitted() {
    for (let form of this.__$$private_forms) {
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

  __$$private_groups = new Set<InputGroup<any>>();

  private _confirmId = 0;

  private _choiceTask: Task<
    InputChoiceQuery<TValue>,
    InputChoiceQueryResult<TValue, TChoiceMetadata>
  > | null = null;

  @observable.shallow
  private _choices: InputChoice<TValue, TChoiceMetadata>[] = [];
  private _lastQuery: TValue | null = null;
}

/**
 * Default re-validation predicate, which is to re-validate if the input value
 * has changed.
 * @param value
 * @param oldValue
 */
function defaultShouldValidate<TValue>(value: TValue, oldValue: TValue) {
  return value !== oldValue;
}

/**
 * Describes options customizing an input UI state.
 * @template TValue the input's value type
 * @template TChoiceMetadata the input's choice metadata type.
 */
export interface InputOptions<
  TValue extends BaseInputValue,
  TChoiceMetadata = any
> extends StateDevOptions {
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
   * Specifies the assitive choices that should be made available to the input.
   * This can be used for inputs that show themselves as dropdowns, radios,
   * or inputs with autocompletion feature.
   *
   * Two forms are allowed:
   * - The constant form should simply enumerate all choices statically.
   * - The function form depends on the current input value, and should return
   *   (or async resolve to) the choices along with stat information that
   *   indicates in some way how many choices we are anticipating.
   *
   * @param query contains extra contextual information that you should use to
   * determine what choices to fetch.
   */
  choices?:
    | ((
        query: InputChoiceQuery<TValue>
      ) => MaybePromise<InputChoiceQueryResult<TValue, TChoiceMetadata>>)
    | InputChoice<TValue, TChoiceMetadata>[];

  /**
   * Specifies an upper limit on how many choices should ever be queried given
   * any input value.
   */
  choiceQueryLimit?: number;

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
  confirmCascade?: (
    this: Input<TValue>,
    value: TValue,
    self: Input<TValue>
  ) => void;
}

/**
 * Specifies the constraints of an input value.
 */
export type BaseInputValue = string | number | boolean;

/**
 * Infers the input value type from the input type.
 */
export type InferInputValue<T extends Input<any>> = T extends Input<infer V>
  ? V
  : never;

/**
 * Describes an input choice
 * @template TValue the input's value type
 * @template TChoiceMetadata the input's choice metadata type.
 */
export interface InputChoice<TValue extends BaseInputValue, TChoiceMetadata> {
  /**
   * The choice value
   */
  value: TValue;

  /**
   * The choice metadata describing, for example, presentational properties or
   * sorting properties.
   */
  metadata?: TChoiceMetadata;
}

/**
 * Describes the input choice query
 */
export interface InputChoiceQuery<TValue extends BaseInputValue> {
  /**
   * The input value from which the choices should be queried
   */
  inputValue: TValue;

  /**
   * The start index where the choices should be queried
   */
  offset: number;

  /**
   * How many choices should be obtained within this round.
   */
  limit: number;
}

/**
 * Describes input's choice query result.
 * @template TValue the input's value type
 * @template TChoiceMetadata the input's choice metadata type.
 */
export interface InputChoiceQueryResult<
  TValue extends BaseInputValue,
  TChoiceMetadata
> {
  /**
   * The choices that were found in the query.
   */
  choices: InputChoice<TValue, TChoiceMetadata>[];

  /**
   * Describes the query statistics (if the total number of choices is known,
   * or if there are no more choices). When either of the stats is fullfilled
   * then the input will not query any more choices for that input value.
   */
  stats: {
    /**
     * Specifies true if there are no more choices to query.
     */
    isDone?: boolean;

    /**
     * Specifies a total number of choices.
     */
    total?: number;
  };
}
