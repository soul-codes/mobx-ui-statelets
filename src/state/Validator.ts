import { Falsy, MaybeConstant } from "../utils/types";
import Task, { TaskAction } from "./Task";
import { observable, action, reaction } from "mobx";
import InputGroup, {
  InputGroupContent,
  InferInputGroupValue
} from "./InputGroup";
import createLookup from "../utils/lookup";
import { StateDevOptions } from "./State";
import Input from "./Input";
import createWeakProperty from "../utils/weakProp";
import HoverState from "../state/Hover";

/**
 * @ignore
 */
export const privateInputValidators = createWeakProperty(
  (instance: Input<any>) => new Set<Validator<any, any, any, any>>()
);

/**
 * Represents a state for form input validation. This includes bookkeeping of whether
 * the validation has ever happened, what the most recent validation result was,
 * and whether asynchronous validation is happening on right now.
 *
 * @typeparam TInputs the type of the "input shape". This can be an input type,
 * an object of inputs, an array of inputs, or a nested structure thereof, or
 * a function returning such a structure.
 *
 * @typeparam TDomainValue the type of the domain value that is extracted from the
 * input value for domain validation.
 *
 * @typeparam TParseError the type that describes the error when trying to parse
 * the input value into a domain value.
 *
 * @typeparam TDomainError the type that describes the error resulting from
 * validating the domain value.
 */
export default class Validator<
  TInputs extends InputGroupContent = any,
  TDomainValue = InferInputGroupValue<TInputs>,
  TParseError = any,
  TDomainError = any
> extends InputGroup<TInputs> {
  /**
   * Instantiates a validator.
   *
   * @param inputs The input whose values will be needed in validation. This can
   * be any arbitrary structure of input states.
   *
   * @param validatorOptions Specifies additional options for the validator.
   *
   * @see Input
   * @see InputGroup
   */
  constructor(
    inputs: MaybeConstant<() => TInputs>,
    readonly validatorOptions: ValidatorOptions<
      TInputs,
      TDomainValue,
      TParseError,
      TDomainError
    > = {}
  ) {
    super(inputs, validatorOptions);
    createLookup(
      this,
      () => this.flattedInputs,
      input => privateInputValidators.get(input) as any
    );
  }

  /**
   * Triggers validation.
   *
   * If the input cannot be parsed, this is no-op. If there is pending
   * validation from the previous trigger, that previous validation is canceled.
   * While validation is going on, if the input value has changed such that it
   * now cannot be parsed, the pending validation is canceled.
   */
  @action
  async validate() {
    this._hasEverValidated = true;
    if (this.parseResult.isError) return;

    const disposeReaction = reaction(
      () => this.parseResult.isError || !this.isEnabled,
      shouldCancel => {
        if (shouldCancel) {
          this._task.cancel();
          disposeReaction();
        }
      }
    );
    const promise = this._task.invoke(this.parseResult.domain);
    await promise;
    disposeReaction();
  }

  /**
   * Returns the promise that resolves when the validation task is complete.
   */
  get promise() {
    return this._task.promise;
  }

  /**
   * Gets validator's input parsing result. Use the "isError" key to discriminate
   * between a successful parse (which will give you the domain value) and a
   * failed parse (which will give you the parse error).
   */
  get parseResult(): ParseResult<
    InferInputGroupValue<TInputs>,
    TParseError,
    TDomainValue
  > {
    return this.parse(
      this.validatorOptions.validateOnInput
        ? this.normalizedInputValue
        : this.value
    );
  }

  /**
   * Gets the validator's domain value. This value is undefined if the input
   * value cannot be parsed.
   */
  get domainValue(): TDomainValue | void {
    const { parseResult } = this;
    return parseResult.isError ? void 0 : parseResult.domain;
  }

  /**
   * Try parsing an input value.
   * @param value value to parse. This must match the value structure implied
   * by the input structure.
   */
  parse(
    value: InferInputGroupValue<TInputs>
  ): ParseResult<InferInputGroupValue<TInputs>, TParseError, TDomainValue> {
    const rule = this.validatorOptions.parse || noopValidator;
    const result = rule(value) || null;
    if (!result) {
      return {
        isError: false,
        isParsed: false,
        domain: (value as any) as TDomainValue
      };
    }

    if ("domain" in result) {
      return {
        isError: false,
        isParsed: Boolean(result),
        domain: result.domain
      };
    }

    return {
      isError: true,
      error: result.error,
      correction: result.correction
    };
  }

  /**
   * Gets the validator's domain value, assuming that the parsing has succeeded.
   * Use this to bypass checking for successful parse, but it will throw an error
   * if the parse has actually failed.
   */
  requireDomainValue() {
    const { parseResult } = this;
    if (parseResult.isError) throw Error("Cannot parse the input value.");
    return parseResult.domain;
  }

  /**
   * Format a domain value into an input value. This can be used to turn the
   * domain correction into meaningful input values.
   * @param domainValue Domain value to format.
   */
  formatDomainValue(domainValue: TDomainValue): InferInputGroupValue<TInputs> {
    const formatter = this.validatorOptions.format;
    if (!formatter)
      return (domainValue as any) as InferInputGroupValue<TInputs>;
    return formatter(domainValue);
  }

  /**
   * Gets the validator's latest domain validation result. Note that if domain
   * validation has never been triggered, this returns a success.
   *
   * For a more conclusive check for input validity, use isConclusivelyValid
   * and isConclusivelyInvalid.
   * @see isConclusivelyInvalid
   * @see isConclusivelyValid
   */
  get domainResult(): DomainResult<TDomainValue, TDomainError> {
    const result = this._task.result;
    if (!result) return { isError: false };
    return result.error
      ? { isError: true, error: result.error, correction: result.correction }
      : { isError: false };
  }

  /**
   * Gets the validator's most recent error result. This maybe a domain error
   * or a parse error. Use the key "errorType" to discriminate the kind of error.
   * When there is no error encountered, null is returned.
   *
   * Note that if the input value can be parsed and the domain validation has
   * never been triggered, this returns null also. For a more conclusive check
   * for input validity, use isConclusivelyValid and isConclusivelyInvalid.
   * @see isConclusivelyInvalid
   * @see isConclusivelyValid
   */
  get error(): ValidationError<
    InferInputGroupValue<TInputs>,
    TDomainValue,
    TParseError,
    TDomainError
  > | null {
    if (this.parseResult.isError)
      return {
        errorType: "parse",
        error: this.parseResult.error,
        correction: this.parseResult.correction
      };
    if (this.domainResult.isError)
      return {
        errorType: "domain",
        error: this.domainResult.error,
        correction: this.domainResult.correction
      };
    return null;
  }

  /**
   * Returns the correctional input value. This correction may arise from the
   * parsing or from the domain validation (the former is favoured). If there
   * is no correctional value (either because the domain validator/parser didn't
   * give any or because the validation succeeded), this returns void.
   */
  get correction(): InferInputGroupValue<TInputs> | void {
    if (!this.isEnabled) return void 0;
    if (this.parseResult.isError) return this.parseResult.correction;

    const correction = this.domainResult.isError
      ? this.domainResult.correction
      : void 0;
    if (correction === void 0) return void 0;

    const formatter = this.validatorOptions.format;
    if (!formatter && this.parseResult.isParsed) {
      throw Error(
        "A validator that specifies a parser must specify a formatter in order to get a domain correction."
      );
    }

    return formatter
      ? formatter(correction)
      : ((correction as any) as InferInputGroupValue<TInputs>);
  }

  /**
   * Returns true if asynchronous domain validation is currently happening.
   */
  get isValidationPending() {
    return Boolean(this._task.isPending);
  }

  /**
   * Returns true if the input can be taken to be conclusively valid. That is,
   * it is in all of these states:
   * - All inputs contributing to the validator have been confirmed.
   * - There is no parsing error.
   * - It has been domain-validated at least once.
   * - Domain validation is not pending.
   * - There is no domain error.
   */
  get isConclusivelyValid() {
    return this.isConclusive && !this.error;
  }

  /**
   * Returns true if the input can be taken to be conclusively invalid. That is,
   * it has either failed the parser, or it is in all of these states:
   * - All inputs contributing to the validator have been confirmed.
   * - It has been domain-validated at least once.
   * - Domain validation is not pending.
   * - There is some domain error.
   */
  get isConclusivelyInvalid() {
    return this.isConclusive && Boolean(this.error);
  }

  /**
   * Returns true if the validator is "virgin": this is defined as follows:
   *
   * - For a validator validating on confirmed inputs: this should
   */
  get isVirgin() {
    return this.validatorOptions.validateOnInput
      ? !this.hasChangedInput && this.hasUnconfirmedInput
      : this.hasUnconfirmedInput;
  }

  /**
   * Returns true if the validator is in a "conclusive" state: that is defined
   * to mean that:
   * - domain validation has happened
   * - domain validation is not pending
   * - the inputs the validator depend on have been confirmed.
   */
  get isConclusive() {
    return (
      !this._task.isPending &&
      this._hasEverValidated &&
      !this.hasUnconfirmedInput
    );
  }

  /**
   * Returns true if domain validation has ever fully happened.
   */
  get hasEverValidated() {
    return this._hasEverValidated;
  }

  /**
   * Returns true if any of the inputs that the validator depends on has not
   * been confirmed by the user.
   * @see [[Input.isConfirmed]]
   */
  get hasUnconfirmedInput() {
    return this.flattedInputs.some(input => !input.isConfirmed);
  }

  /**
   * Returns true if any of the inputs that the validator depends on is in a
   * "changed" state. Shorthand for checking that at least one input's `hasChanged`
   * is true.
   * @see [[Input.hasChanged]]
   */
  get hasChangedInput() {
    return this.flattedInputs.some(input => input.hasChanged);
  }

  /**
   * Returns true if the validator is enabled for automatic validation. When this
   * value is true,
   */
  get isEnabled() {
    const fn = this.validatorOptions.enabled;
    return fn ? fn.call(this, this) : true;
  }

  /**
   * Returns the "nested" validators: these are the other validators that also
   * depend on one of the inputs this validator is depending on.
   */
  get nestedValidators(): Validator[] {
    const result = new Set<Validator<any, any, any, any>>();
    collectNestedValidators(
      this as Validator<any, any, any, any>,
      new Set(),
      result
    );
    result.delete(this);
    return [...result];
  }

  @observable
  private _hasEverValidated = false;
  private _task = new Task<
    TDomainValue,
    Falsy | ValidationFailure<TDomainError, TDomainValue>
  >(this.validatorOptions.domain || noopValidator);

  readonly hoverState = new HoverState();
}

/**
 * A validator function that returns success always.
 */
function noopValidator() {
  return null;
}

/**
 * Traverses the input-validator graph and collecting all validators that can
 * be reached from the input validator.
 *
 * @param validator validator whose nested validators we are collecting
 * @param buffer the mutable set of inputs that we have already visited, to
 * prevent circular dependency
 * @param result the mutable set of validators that will become the nested
 * validators.
 */
function collectNestedValidators(
  validator: Validator,
  buffer: Set<Input>,
  result: Set<Validator>
) {
  const { flattedInputs } = validator;
  for (let i = 0, iLength = flattedInputs.length; i < iLength; i++) {
    const input = flattedInputs[i];
    if (buffer.has(input)) continue;

    const { validators } = input;
    for (let j = 0, jLength = validators.length; j < jLength; j++) {
      const validator = validators[j];
      if (result.has(validator)) continue;
      result.add(validator);
      collectNestedValidators(validator, buffer, result);
    }
  }
}

/**
 * Describes a validation error, both for parsing and for domain logic.
 */
export interface ValidationFailure<TError, TCorrection> {
  /**
   * Describes the error.
   */
  error: TError;

  /**
   * Optionally provides the correction of the error.
   */
  correction?: TCorrection;
}

/**
 * Describes the result of parsing an input value.
 * @typeparam TInputValue the input value
 * @typeparam TParseError the parse error
 * @typeparam TDomainValue the resulting domain value the from parsing
 */
export type ParseResult<TInputValue, TParseError, TDomainValue> =
  | ParseFailure<TInputValue, TParseError>
  | ParseSuccess<TDomainValue>;

/**
 * Describes a successful input value parsing
 */
export interface ParseSuccess<TDomainValue> {
  /**
   * True for a failed parsing, false otherwise.
   */
  isError: false;

  /**
   * True if the parse function returned a specific domain value. False if the
   * parse function returned falsy, implying that the input value is the same
   * as the domain value.
   */
  isParsed: boolean;

  /**
   * The resulting domain value. This is the same as the value of the "domain"
   * key in the parse function's return value
   * @see ValidatorOptions.parse
   */
  domain: TDomainValue;
}

/**
 * Describes a failed input value parsing
 */
export interface ParseFailure<TValue, TParseError> {
  /**
   * True for a failed parsing, false otherwise.
   */
  isError: true;

  /**
   * Returns the parse error, this is the same as the value of the "error" key
   * in the parse function's return value.
   * @see ValidatorOptions.parse
   */
  error: TParseError;

  /**
   * Returns the parse correction, this is the same as the value of the "correction"
   * key in the parse function's return value.
   * @see ValidatorOptions.parse
   */
  correction?: TValue;
}

/**
 * Describes the result of domain validation on an input.
 */
export type DomainResult<TDomainValue, TDomainError> =
  | DomainFailure<TDomainValue, TDomainError>
  | DomainSuccess;

/**
 * Represents a successful domain validation.
 */
export interface DomainSuccess {
  /**
   * True for a failed validation. False otherwise.
   */
  isError: false;
}

/**
 * Represents a failed domain validation.
 */
export interface DomainFailure<TDomainValue, TDomainError> {
  /**
   * True for a failed validation. False otherwise.
   */
  isError: true;

  /**
   * Returns the domain validation error. This is the same as the value of the
   * "error" key in the domain validation function's return value.
   * @see ValidatorOptions.domain
   */
  error: TDomainError;

  /**
   * Returns the domain validation correction. This is the same as the value of the
   * "correction" key in the domain validation function's return value.
   * @see ValidatorOptions.domain
   */
  correction?: TDomainValue;
}

/**
 * Represents a validation error, both domain and parsing.
 */
export type ValidationError<TValue, TDomainValue, TParseError, TDomainError> =
  | ({ errorType: "parse" } & ValidationFailure<TParseError, TValue>)
  | ({ errorType: "domain" } & ValidationFailure<TDomainError, TDomainValue>);

/**
 * Describes the settings of a validator.
 * @typeparam TInputs the type of the validator's input structure.
 * @typeparam TDomainValue the type of the validator's domain interpretation of the
 * inputs.
 * @typeparam TParseError the type of the validator's description of input format
 * error.
 * @typeparam TDomainError the type of the validator's description of the domain
 * value error.
 */
export interface ValidatorOptions<
  TInputs extends InputGroupContent,
  TDomainValue,
  TParseError,
  TDomainError
> extends StateDevOptions {
  /**
   * Specifies how the input value should be converted to a domain value, as well
   * as any error that is encountered while parsing. This must be a pure,
   * synchronous function returning one of the following:
   * - an arbitrary domain value in an object with the "domain" key, or
   * - an arbitrary error value in an "error" key. Optionally, an additional
   *   "correction" key may be provided to suggest possible correction of the
   *   input.
   * - a falsy value. This will taken to mean successful parsing and that the
   *   domain value should be the same as the input value.
   */
  parse?(
    value: InferInputGroupValue<TInputs>
  ):
    | Falsy
    | {
        /**
         * Specifies the domain value that results from the input value parsing.
         * This implies the parse to be successful.
         */
        domain: TDomainValue;
      }
    | ValidationFailure<TParseError, InferInputGroupValue<TInputs>>;

  /**
   * Specifies how a domain value might be formatted back into the input value
   * given by this validator. This must be a pure, synchronous function returning
   * a corresponding shape of input value from the domain value.
   *
   * @param domainValue The domain value to format as input value.
   */
  format?(domainValue: TDomainValue): InferInputGroupValue<TInputs>;

  /**
   * Specifies validation for the domain value that is obtained by parsing the
   * input value.
   */
  domain?: TaskAction<
    TDomainValue,
    Falsy | ValidationFailure<TDomainError, TDomainValue>,
    void
  >;

  /**
   * Specifies whether the domain validation should take place. This has
   * consequences when automatically validating input as a result of confirming
   * inputs and submitting a form.
   *
   * @param this
   * @param self reflects back the validator instance when specifying an arrow
   * function as predicate.
   *
   * @see [[Input.confirm]]
   * @see [[Form.submit]]
   */
  enabled?(
    this: Validator<TInputs, TDomainValue, TParseError, TDomainError>,
    self: Validator<TInputs, TDomainValue, TParseError, TDomainError>
  ): boolean;

  /**
   * If true, input action on the inputs contributing to this validator will cause
   * the validator to validate. Otherwise, the default behavior is to only validate
   * when a contributing input is confirmed.
   */
  validateOnInput?: boolean;
}
