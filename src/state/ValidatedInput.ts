import Validator, { ValidatorOptions } from "./Validator";
import Input, { InputOptions } from "./Input";

export default class ValidatedInput<
  TValue extends BaseInputValue,
  TFormatError,
  TDomainError
> extends Input<TValue> {
  constructor(
    readonly defaultValue: TValue,
    readonly options?: ValidatedInputOptions<TValue, TFormatError, TDomainError>
  ) {
    super(defaultValue, options);
  }
  validator = new Validator<Input<TValue>, TFormatError, TDomainError>(this, {
    format: this.options && this.options.formatValidation,
    domain: this.options && this.options.domainValidation
  });
}

export interface ValidatedInputOptions<
  TValue extends BaseInputValue,
  TFormat,
  TDomain
> extends InputOptions<TValue> {
  formatValidation?: ValidatorOptions<
    Input<TValue>,
    TFormat,
    TDomain
  >["format"];
  domainValidation?: ValidatorOptions<
    Input<TValue>,
    TFormat,
    TDomain
  >["domain"];
}

export type BaseInputValue = string | number | boolean;
export type InputValue<T extends Input<any>> = T extends Input<infer V>
  ? V
  : never;
