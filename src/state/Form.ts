import InputGroup, { InputGroupContent, InputGroupValue } from "./InputGroup";
import { MaybeConstant } from "../utils/types";
import Task, { TaskAction } from "./Task";
import createLookup from "../utils/lookup";
import Input from "./Input";
import { computed } from "mobx";
import Validator from "./Validator";
import { StateDevOptions, currentFocus } from "./State";

export default class Form<
  TInputs extends InputGroupContent,
  TActionResult
> extends InputGroup<TInputs> {
  constructor(
    inputs: MaybeConstant<() => TInputs>,
    readonly options: FormOptions<TInputs, TActionResult>
  ) {
    super(inputs, options);
    this._task = new Task(
      guardSubmit<TInputs, TActionResult>(options.action, this),
      {
        name:
          options && options.name
            ? `(form "${options.name}" Task)`
            : "(form Task)"
      }
    );
    createLookup(
      this as Form<any, any>,
      () => this.flattedInputs,
      input => input.__$$private_forms
    );
  }

  get isSubmitting() {
    return this._task.isPending;
  }

  get submitResult() {
    return this._task.result;
  }

  @computed
  get unconfirmedInputs() {
    return this.flattedInputs.filter(input => !input.isConfirmed);
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
    return this._task.invoke(null);
  }

  get submitTask() {
    return this._task;
  }

  private _task: Task<null, SubmitResult<TActionResult> | FormValidationError>;
}

function guardSubmit<TInputs extends InputGroupContent, TActionResult>(
  submitAction: TaskAction<InputGroupValue<TInputs>, TActionResult>,
  form: Form<TInputs, TActionResult>
): TaskAction<null, SubmitResult<TActionResult> | FormValidationError> {
  return async (unusedArg, addCancelHandler) => {
    const { unconfirmedInputs } = form;
    if (form.options.autoConfirm) {
      unconfirmedInputs.forEach(input => input.markAsConfirmed());
    }
    getValidators(unconfirmedInputs).forEach(
      validator => validator.isEnabled && validator.validate()
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
    return { outcome: "submit" as "submit", result };
  };
}

function findAndFocusErrors(form: Form<any, any>): null | FormValidationError {
  const { inputErrors } = form;
  if (!inputErrors.length) return null;
  inputErrors[0].focus();
  return {
    outcome: "validation-error" as "validation-error",
    errors: inputErrors
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

export interface SubmitResult<TActionResult> {
  outcome: "submit";
  result: TActionResult;
}

export interface FormValidationError {
  outcome: "validation-error";
  errors: Input<any>[];
}

export interface FormOptions<TInputs extends InputGroupContent, TActionResult>
  extends StateDevOptions {
  /**
   * Specify the submit action. The outcome of this action will be saved in
   * the submit result state.
   */
  action: TaskAction<InputGroupValue<TInputs>, TActionResult>;
  autoNext?: boolean;
  autoSubmit?: boolean;
  autoConfirm?: boolean;
}

export type AsTask<T extends FormOrTask> = T extends Form<any, any>
  ? T["submitTask"]
  : T;

export type FormOrTask = Form<any, any> | Task<any, any>;
