import InputGroup, {
  InputGroupContent,
  InferInputGroupValue
} from "./InputGroup";
import { MaybeConstant } from "../utils/types";
import Task, { TaskAction } from "./Task";
import createLookup from "../utils/lookup";
import Input from "./Input";
import { computed } from "mobx";
import Validator from "./Validator";
import { StateDevOptions, currentFocus } from "./State";

/**
 * Represents a form state. A form is essentially an input group that validates
 * over its member inputs before performing a form-specific action.
 */
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

  /**
   * Return true if the form is submitting.
   */
  get isSubmitting() {
    return this._task.isPending;
  }

  /**
   * Return the last submit result.
   */
  get submitResult() {
    return this._task.result;
  }

  /**
   * Returns the subset of inputs specified at instantiation time that still
   * have not be confirmed.
   */
  @computed
  get unconfirmedInputs() {
    return this.flattedInputs.filter(input => !input.isConfirmed);
  }

  /**
   * Returns the subset of inputs specified at instantiation time that is
   * currently undergoing asynchronous domain validation.
   */
  @computed
  get inputsPendingValidation() {
    return this.flattedInputs.filter(input =>
      input.validators.some(validator => validator.isValidationPending)
    );
  }

  /**
   * Returns the validators of inputs specified at instantiation time that are
   * currently in invalid state (doesn't have to be conclusively invalid).
   */
  @computed
  get inputErrors() {
    return this.flattedInputs.filter(input =>
      input.validators.some(validator => validator.error !== null)
    );
  }

  /**
   * Returns the next input that the form should advance to. This is defined
   * as the next input that contains an error. If that doesn't exist, it is
   * the next input that the user has not yet confirmed.
   */
  get nextInput() {
    return [...this.inputErrors, ...this.unconfirmedInputs][0] || null;
  }

  /**
   * Submits the form.
   */
  submit() {
    return this._task.invoke(null);
  }

  /**
   * Returns the task state that represents the submit action.
   */
  get submitTask() {
    return this._task;
  }

  private _task: Task<null, SubmitResult<TActionResult> | FormValidationError>;
}

/**
 * Guards the form's submit by performing validation of the inputs and focusing
 * on any invalid input. In case of (and if only) everything is conclusively valid,
 * proceed to invoking the form's action.
 * @param submitAction
 * @param form
 */
function guardSubmit<TInputs extends InputGroupContent, TActionResult>(
  submitAction: TaskAction<InferInputGroupValue<TInputs>, TActionResult>,
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

/**
 * Finds an input that has validation error requests that it be focused.
 * @param form
 */
function findAndFocusErrors(form: Form<any, any>): null | FormValidationError {
  const { inputErrors } = form;
  if (!inputErrors.length) return null;
  inputErrors[0].focus();
  return {
    outcome: "validation-error" as "validation-error",
    errors: inputErrors
  };
}

/**
 * Extracts the validators of the set of inputs.
 * @param inputs
 */
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

/**
 * Describes a submit result whose outcome was execution of the submit action.
 */
export interface SubmitResult<TActionResult> {
  outcome: "submit";
  result: TActionResult;
}

/**
 * Describes a submit result whose outcome was that the form couldn't be submitted
 * because of validation error.
 */
export interface FormValidationError {
  outcome: "validation-error";
  errors: Input<any>[];
}

/**
 * Describes the form's customization.
 */
export interface FormOptions<TInputs extends InputGroupContent, TActionResult>
  extends StateDevOptions {
  /**
   * Specify the submit action. The outcome of this action will be saved in
   * the submit result state.
   */
  action: TaskAction<InferInputGroupValue<TInputs>, TActionResult>;

  /**
   * If true, confirming an input within this form will cause focusing in the
   * next input.
   */
  autoNext?: boolean;

  /**
   * If true, confirming an input within this form when all other confirms are
   * confirmed and conclusively valid will result in the form being submitted.
   */
  autoSubmit?: boolean;

  /**
   * If true, an attempt to submit the form will cause all of the form's inputs
   * to be marked as confirmed. The presentataional layer can then act on this
   * information accordingly by e.g. showing all invalid inputs in invalid state.
   */
  autoConfirm?: boolean;
}

/**
 * Converts a form state type as a task state type by extracting the task
 * representing the submit action. Yields the provided task state as is. This
 * is useful in normalizing a form and a task for presentations that interacts
 * with task states like buttons.
 */
export type AsTask<T extends FormOrTask> = T extends Form<any, any>
  ? T["submitTask"]
  : T;

/**
 * Describes a form or a task.
 */
export type FormOrTask = Form<any, any> | Task<any, any>;
