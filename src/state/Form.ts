import InputGroup, { InputGroupContent, InputGroupValue } from "./InputGroup";
import { MaybeConstant } from "../utils/types";
import Actuator, { ActuatorAction } from "./Actuator";
import createLookup from "../utils/lookup";
import Input from "./Input";
import { computed } from "mobx";
import { currentFocus } from "../partials/withFocus";
import Validator from "./Validator";
import { StateDevOptions } from "./State";

export default class Form<
  TInputs extends InputGroupContent,
  TActionResult extends ActionResultConstraint
> extends InputGroup<TInputs> {
  constructor(
    inputs: MaybeConstant<() => TInputs>,
    submitAction: ActuatorAction<InputGroupValue<TInputs>, TActionResult>,
    readonly options: FormOptions = {}
  ) {
    super(inputs, options);
    this._actuator = new Actuator(
      guardSubmit<TInputs, TActionResult>(submitAction, this),
      {
        name:
          options && options.name
            ? `(form "${options.name}" actuator)`
            : "(form actuator)"
      }
    );
    createLookup(
      this as Form<any, any>,
      () => this.flattedInputs,
      input => input.__$$private_forms
    );
  }

  get isSubmitting() {
    return this._actuator.isPending;
  }

  @computed
  get unconfirmedInputs() {
    return this.flattedInputs.filter(input => !input.hasEverBeenConfirmed);
  }

  @computed
  get inputsPendingValidation() {
    return this.flattedInputs.filter(input =>
      input.validators.some(validator => validator.isValidationPending)
    );
  }

  @computed
  get inputErrors() {
    return this.flattedInputs.filter(input =>
      input.validators.some(validator => validator.error !== null)
    );
  }

  get nextInput() {
    return [...this.inputErrors, ...this.unconfirmedInputs][0] || null;
  }

  submit() {
    return this._actuator.invoke(null);
  }

  get submitActuator() {
    return this._actuator;
  }

  private _actuator: Actuator<null, SubmitResult<TActionResult>>;
}

function guardSubmit<
  TInputs extends InputGroupContent,
  TActionResult extends ActionResultConstraint
>(
  submitAction: ActuatorAction<InputGroupValue<TInputs>, TActionResult>,
  form: Form<TInputs, TActionResult>
): ActuatorAction<null, SubmitResult<TActionResult>> {
  return async (arg, addCancelHandler) => {
    getValidators(form.unconfirmedInputs).forEach(validator =>
      validator.validate()
    );

    await Promise.resolve();
    const immediateErrors = findAndFocusErrors(form);
    if (immediateErrors) return immediateErrors;

    await Promise.all(
      getValidators(form.inputsPendingValidation).map(validator =>
        validator.validate()
      )
    );

    const lateErrors = findAndFocusErrors(form);
    if (lateErrors) return lateErrors;

    const focusedInput = currentFocus.get();
    if (
      focusedInput instanceof Input &&
      focusedInput.__$$private_forms.has(form)
    )
      focusedInput.blur();
    const result = await submitAction(form.value, addCancelHandler);
    return result;
  };
}

function findAndFocusErrors(
  form: Form<any, any>
): null | SubmitValidationFailure {
  const { inputErrors } = form;
  if (!inputErrors.length) return null;
  inputErrors[0].focus();
  return {
    inputErrors,
    errorType: "validation",
    success: false
  };
}

function getValidators(inputs: Input<any>[]): Validator<any, any, any>[] {
  const set = new Set();
  const result: Validator<any, any, any>[] = [];
  inputs.forEach(input =>
    input.validators.forEach(
      validator =>
        !set.has(validator) && (set.add(validator), result.push(validator))
    )
  );
  return result;
}

export type SubmitResult<TActionResult> =
  | SubmitSuccess<TActionResult>
  | SubmitValidationFailure
  | SubmitActionFailure;

export interface SubmitSuccess<TActionResult> {
  success: true;
  result?: TActionResult;
}

export interface SubmitValidationFailure {
  success: false;
  errorType: "validation";
  inputErrors: Input<any>[];
}

export interface SubmitActionFailure {
  success: false;
  errorType?: string;
}

type ActionResultConstraint =
  | { success: true }
  | { success: false; errorType?: string };

export interface FormOptions extends StateDevOptions {
  autoNext?: boolean;
  autoSubmit?: boolean;
}

export type AsActuator<T extends FormOrActuator> = T extends Form<any, any>
  ? T["submitActuator"]
  : T;

export type FormOrActuator = Form<any, any> | Actuator<any, any>;
