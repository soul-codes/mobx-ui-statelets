import { MaybePromise, Falsy, MaybeConstant } from "../utils/types";
import Task, { AddCancelhandler, TaskAction } from "./Task";
import { observable, action, reaction } from "mobx";
import InputGroup, { InputGroupContent, InputGroupValue } from "./InputGroup";
import createLookup from "../utils/lookup";
import { StateDevOptions } from "./State";
import withHover from "../partials/withHover";
import Input from "./Input";

export default class Validator<
  TInputs extends InputGroupContent = any,
  TDomainValue = InputGroupValue<TInputs>,
  TParseError = any,
  TDomainError = any
> extends withHover(InputGroup)<TInputs> {
  constructor(
    inputs: MaybeConstant<() => TInputs>,
    private readonly _options?: ValidatorOptions<
      TInputs,
      TDomainValue,
      TParseError,
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
    this._hasEverValidated = true;
    if (this.parseResult.isError) return;

    const disposeReaction = reaction(
      () => this.parseResult.isError,
      isError => isError && this._task.cancel()
    );
    const promise = this._task.invoke(this.parseResult.domain);
    await promise;
    disposeReaction();
  }

  get parseResult(): ParseResult<
    InputGroupValue<TInputs>,
    TParseError,
    TDomainValue
  > {
    return this.parse(this.value);
  }

  get domainValue(): TDomainValue | void {
    const { parseResult } = this;
    return parseResult.isError ? void 0 : parseResult.domain;
  }

  parse(
    value: InputGroupValue<TInputs>
  ): ParseResult<InputGroupValue<TInputs>, TParseError, TDomainValue> {
    const rule = (this._options && this._options.parse) || noopValidator;
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

  requireDomainValue() {
    const { parseResult } = this;
    if (parseResult.isError) throw Error("Cannot parse the input value.");
    return parseResult.domain;
  }

  formatDomainValue(value: TDomainValue): InputGroupValue<TInputs> {
    const formatter = this._options && this._options.format;
    if (!formatter) return (value as any) as InputGroupValue<TInputs>;
    return formatter(value);
  }

  get domainResult(): DomainResult<TDomainValue, TDomainError> {
    const result = this._task.result;
    if (!result) return { isError: false };
    return result.error
      ? { isError: true, error: result.error, correction: result.correction }
      : { isError: false, correction: result.correction };
  }

  get error(): ValidationError<
    InputGroupValue<TInputs>,
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

  get correction(): InputGroupValue<TInputs> | void {
    if (!this.isEnabled) return void 0;
    if (this.parseResult.isError) return this.parseResult.correction;

    const { correction } = this.domainResult;
    if (!correction) return void 0;

    const formatter = this._options && this._options.format;
    if (!formatter && this.parseResult.isParsed) {
      throw Error(
        "A validator that specifies a parser must specify a formatter in order to get a domain correction."
      );
    }

    return formatter
      ? formatter(correction)
      : ((correction as any) as InputGroupValue<TInputs>);
  }

  get isValidationPending() {
    return Boolean(this._task.isPending);
  }

  get isConclusivelyValid() {
    return this.isConclusive && !this.error;
  }

  get isConclusivelyInvalid() {
    return this.isConclusive && Boolean(this.error);
  }

  get isVirgin() {
    return !this.hasEverValidated || this.hasUnconfirmedInput;
  }

  get isConclusive() {
    return (
      !this._task.isPending &&
      this._hasEverValidated &&
      !this.hasUnconfirmedInput
    );
  }

  get hasEverValidated() {
    return this._hasEverValidated;
  }

  get hasUnconfirmedInput() {
    return this.flattedInputs.some(input => !input.isConfirmed);
  }

  get isEnabled() {
    const fn = this._options && this._options.enabled;
    return fn ? fn.call(this, this) : true;
  }

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
    DomainPredicateSuccess | DomainPredicateFailure<TDomainValue, TDomainError>
  >((this._options && this._options.domain) || noopValidator);
}

function noopValidator() {
  return null;
}

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

export type ParsePredicate<TValue, TParseError> = (
  value: TValue
) => ParsePredicateSuccess | ParsePredicateFailure<TValue, TParseError>;

export type ParsePredicateWithDomain<TValue, TDomainValue, TParseError> = (
  value: TValue
) =>
  | ParsePredicateDomainSuccess<TDomainValue>
  | ParsePredicateFailure<TValue, TParseError>;

export type ParsePredicateSuccess = Falsy;
export interface ParsePredicateDomainSuccess<TDomainValue> {
  domain: TDomainValue;
}

export interface ParsePredicateFailure<TValue, TParseError> {
  error: TParseError;
  correction?: TValue;
}

export type DomainPredicate<TDomainValue, TDomainError> = TaskAction<
  TDomainValue,
  DomainPredicateSuccess | DomainPredicateFailure<TDomainValue, TDomainError>
>;

export type DomainPredicateSuccess = Falsy;

export interface DomainPredicateFailure<TDomainValue, TDomainError> {
  error: TDomainError;
  correction?: TDomainValue;
}

export type ParseResult<TValue, TParseError, TDomainValue> =
  | ParseFailure<TValue, TParseError>
  | ParseSuccess<TDomainValue, TValue>;

export interface ParseSuccess<TDomainValue, TValue> {
  isError: false;
  isParsed: boolean;
  domain: TDomainValue;
  correction?: TValue;
}

export interface ParseFailure<TValue, TParseError> {
  isError: true;
  error: TParseError;
  correction?: TValue;
}

export type DomainResult<TDomainValue, TDomainError> =
  | DomainFailure<TDomainValue, TDomainError>
  | DomainSuccess<TDomainValue>;

export interface DomainSuccess<TDomainValue> {
  isError: false;
  correction?: TDomainValue;
}

export interface DomainFailure<TDomainValue, TDomainError> {
  isError: true;
  error: TDomainError;
  correction?: TDomainValue;
}

export type ValidationError<TValue, TDomainValue, TParseError, TDomainError> =
  | DomainValidationError<TDomainValue, TDomainError>
  | ParseValidationError<TValue, TParseError>;

export interface ParseValidationError<TValue, TParseError> {
  errorType: "parse";
  error: TParseError;
  correction?: TValue;
}

export interface DomainValidationError<TDomainValue, TDomainError> {
  errorType: "domain";
  error: TDomainError;
  correction?: TDomainValue;
}

export interface DomainFormatter<TValue, TDomainValue> {
  (domainValue: TDomainValue): TValue;
}

export interface ValidatorOptions<
  TInputs extends InputGroupContent,
  TDomainValue,
  TParseError,
  TDomainError
> extends StateDevOptions {
  parse?:
    | ParsePredicate<InputGroupValue<TInputs>, TParseError>
    | ParsePredicateWithDomain<
        InputGroupValue<TInputs>,
        TDomainValue,
        TParseError
      >;
  format?: DomainFormatter<InputGroupValue<TInputs>, TDomainValue>;
  domain?: DomainPredicate<TDomainValue, TDomainError>;
  enabled?(
    this: Validator<TInputs, TDomainValue, TParseError, TDomainError>,
    self: Validator<TInputs, TDomainValue, TParseError, TDomainError>
  ): boolean;
}
