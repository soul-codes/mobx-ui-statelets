import Validator, { ValidatorOptions } from "./Validator";
import Input, { InputOptions, BaseInputValue } from "./Input";
import { computed } from "mobx";

/**
 * A shorthand for an input with a single validator validating the input value.
 * @template TInputValue the input value
 * @template TDomainValue the input validator's domain value.
 * @template TParseError the input's parse error.
 * @template TDomainError the input's domain error.
 */
export default class ValidatedInput<
  TInputValue extends BaseInputValue,
  TDomainValue = TInputValue,
  TParseError = true,
  TDomainError = true
> extends Input<TInputValue> {
  /**
   * Instantiates a validated input.
   *
   * @param defaultValue The input's default value. If using TypeScript,
   * you can type this value exactly instead of parameterizing the generics
   * fully.
   *
   * @param options The validated input options, which is a combination of the
   * input options and the validator options.
   */
  constructor(
    readonly defaultValue: TInputValue,
    readonly options?: ValidatedInputOptions<
      TInputValue,
      TDomainValue,
      TParseError,
      TDomainError
    >
  ) {
    super(defaultValue, options);
  }
  validator = new Validator<
    Input<TInputValue>,
    TDomainValue,
    TParseError,
    TDomainError
  >(this, this.options);

  @computed
  get normalizedInputValueFormatResult() {
    return this.validator.parse(this.normalizedInputValue);
  }

  requireDomainValue() {
    return this.validator.requireDomainValue();
  }

  formatDomainValue(value: TDomainValue) {
    return this.validator.formatDomainValue(value);
  }
}

/**
 * Describes a validated input options, which is a combination of the input
 * options and the validator options.
 *
 * @see ValidatorOptions
 * @see InputOptions
 */
export type ValidatedInputOptions<
  TInputValue extends BaseInputValue,
  TDomainValue,
  TParseError,
  TDomainError
> = InputOptions<TInputValue> &
  ValidatorOptions<Input<TInputValue>, TDomainValue, TParseError, TDomainError>;
