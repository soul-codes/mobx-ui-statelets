import { MaybePromise, Falsy, MaybeConstant } from "../utils/types";
import Actuator, { AddCancelhandler } from "./Actuator";
import { observable, action } from "mobx";
import InputGroup, { InputGroupContent, InputGroupValue } from "./InputGroup";
import createLookup from "../utils/lookup";
import { StateDevOptions } from "./State";
import withHover from "../partials/withHover";

export default class Validator<
  TInputs extends InputGroupContent,
  TFormatError = null,
  TDomainError = null
> extends withHover(InputGroup)<TInputs> {
  constructor(
    inputs: MaybeConstant<() => TInputs>,
    private readonly _options?: ValidatorOptions<
      TInputs,
      TFormatError,
      TDomainError
    >
  ) {
    super(inputs, _options);
    createLookup(
      this,
      () => this.flattedInputs,
      input => input.__$$private_validators as any
    );
  }

  @action
  async validate() {
    this._hasValidationEverBeenRequested = true;
    if (this.formatResult.error) return;
    const promise = this._actuator.invoke(this.value);
    await promise;
  }

  get formatResult(): BaseValidationResult<
    InputGroupValue<TInputs>,
    TFormatError
  > {
    return this.validateFormat(this.value);
  }

  validateFormat(
    value: InputGroupValue<TInputs>
  ): BaseValidationResult<InputGroupValue<TInputs>, TFormatError> {
    const rule = (this._options && this._options.format) || noopValidator;
    const result = rule(value) || null;
    return result === true ? { error: true as any } : result || {};
  }

  get domainResult(): BaseValidationResult<
    InputGroupValue<TInputs>,
    TDomainError
  > {
    const result = this._actuator.result;
    return result === true ? { error: true as any } : result || {};
  }

  get error(): ValidationError<
    InputGroupValue<TInputs>,
    TFormatError,
    TDomainError
  > | null {
    if (this.formatResult.error)
      return { errorType: "format", ...this.formatResult };
    if (this.domainResult.error)
      return { errorType: "domain", ...this.domainResult };
    return null;
  }

  get correction(): InputGroupValue<TInputs> | void {
    if (!this.isEnabled) return void 0;
    if (this.formatResult.error) return this.formatResult.correction;
    return this.domainResult.correction;
  }

  get isValidationPending() {
    return Boolean(this._actuator.isPending);
  }

  get isValidated() {
    return (
      !this._actuator.isPending &&
      this._hasValidationEverBeenRequested &&
      !this.error
    );
  }

  get hasValidationEverBeenRequested() {
    return this._hasValidationEverBeenRequested;
  }

  get isEnabled() {
    const fn = this._options && this._options.enabled;
    return fn ? fn(this.value) : true;
  }

  @observable
  private _hasValidationEverBeenRequested = false;
  private _actuator = new Actuator<
    InputGroupValue<TInputs>,
    true | BaseValidationResult<InputGroupValue<TInputs>, TDomainError> | Falsy
  >((this._options && this._options.domain) || noopValidator);
}

export function noopValidator(value: any) {
  return null;
}

export type FormatValidationFunction<TValue, TFormatError> = (
  value: TValue
) => true | BaseValidationResult<TValue, TFormatError> | Falsy;

export interface BaseValidationResult<TValue, ErrorData> {
  error?: ErrorData;
  correction?: TValue;
}

export interface FormatValidationError<TValue, TFormatError>
  extends BaseValidationResult<TValue, TFormatError> {
  errorType: "format";
}

export type DomainValidationFunction<TValue, TDomainError> = (
  value: TValue,
  addCancelHandler: AddCancelhandler
) => MaybePromise<true | BaseValidationResult<TValue, TDomainError> | Falsy>;

export interface DomainValidationError<TValue, TDomainError>
  extends BaseValidationResult<TValue, TDomainError> {
  errorType: "domain";
}

export type ValidationError<TValue, TFormatError, TDomainError> =
  | FormatValidationError<TValue, TFormatError>
  | DomainValidationError<TValue, TDomainError>;

export interface ValidatorOptions<
  TInputs extends InputGroupContent,
  TFormatError,
  TDomainError
> extends StateDevOptions {
  format?: FormatValidationFunction<InputGroupValue<TInputs>, TFormatError>;
  domain?: DomainValidationFunction<InputGroupValue<TInputs>, TDomainError>;
  enabled?(value: InputGroupValue<TInputs>): boolean;
}
