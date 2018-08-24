import Validator, { ValidatorOptions } from "./Validator";
import Input, { InputOptions } from "./Input";
import { computed } from "mobx";

export default class ValidatedInput<
  TValue extends BaseInputValue,
  TDomainValue = TValue,
  TParseError = true,
  TDomainError = true
> extends Input<TValue> {
  constructor(
    readonly defaultValue: TValue,
    readonly options?: ValidatedInputOptions<
      TValue,
      TDomainValue,
      TParseError,
      TDomainError
    >
  ) {
    super(defaultValue, options);
  }
  validator = new Validator<
    Input<TValue>,
    TDomainValue,
    TParseError,
    TDomainError
  >(this, {
    parse: this.options && this.options.parse,
    format: this.options && this.options.format,
    domain: this.options && this.options.validateDomain,
    enabled: this.options && this.options.enableValidation
  });

  @computed
  get normalizedInputValueFormatResult() {
    return this.validator.parse(this.normalizedInputValue);
  }
}

export interface ValidatedInputOptions<
  TValue extends BaseInputValue,
  TDomainValue,
  TParseError,
  TDomainError
> extends InputOptions<TValue> {
  parse?: ValidatorOptions<
    Input<TValue>,
    TDomainValue,
    TParseError,
    TDomainError
  >["parse"];
  format?: ValidatorOptions<
    Input<TValue>,
    TDomainValue,
    TParseError,
    TDomainError
  >["format"];
  validateDomain?: ValidatorOptions<
    Input<TValue>,
    TDomainValue,
    TParseError,
    TDomainError
  >["domain"];
  enableValidation?: ValidatorOptions<
    Input<TValue>,
    TDomainValue,
    TParseError,
    TDomainError
  >["enabled"];
}

export type BaseInputValue = string | number | boolean;
export type InputValue<T extends Input<any>> = T extends Input<infer V>
  ? V
  : never;
