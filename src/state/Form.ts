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
import { StateDevOptions } from "./State";
import createWeakProperty from "../utils/weakProp";
import FocusState from "../state/Focus";

/**
 * @ignore
 */
export const privateInputForms = createWeakProperty(
  (instance: Input<any>) => new Set<Form<any, any, any>>()
);

/**
 * Represents a form state. A form is essentially an [[InputGroup]] that validates
 * over its member inputs before performing a form-specific action.
 *
 * @see [[InputGroup]] Input Group
 * @template TInputs content of an input group. This is typically inferred
 *            at instantiation time from the [[constructor]].
 */
export default class Form<
  TInputs extends InputGroupContent,
  TActionResult = any,
  TActionProgress = any
> extends InputGroup<TInputs> {
  /**
   *
   * @param inputs
   * @param options Form-specific options
   */
  constructor(
    inputs: MaybeConstant<() => TInputs>,
    readonly options: FormOptions<TInputs, TActionResult, TActionProgress>
  ) {
    super(inputs, options);
    this._task = new Task(
      guardSubmit<TInputs, TActionResult, TActionProgress>(
        options.action,
        this
      ),
      {
        initialProgress: { phase: "validation" },
        name:
          options && options.name
            ? `(form "${options.name}" Task)`
            : "(form Task)"
      }
    );
    createLookup(
      this as Form<any, any, TActionProgress>,
      () => this.flattedInputs,
      input => privateInputForms.get(input)
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
   * Submits the form.export type
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

  /**
   * Returns the progress of the submit action. This is null if the submit task
   * is still in validation phase.
   */
  get submitActionProgress() {
    const progress = this._task.progress;
    return progress && progress.phase === "action"
      ? progress.actionProgress
      : void 0;
  }

  private _task: Task<
    null,
    SubmitResult<TActionResult> | FormValidationError,
    SubmitProgress<TActionProgress>
  >;
}

/**
 * Guards the form's submit by performing validation of the inputs and focusing
 * on any invalid input. In case of (and if only) everything is conclusively valid,
 * proceed to invoking the form's action.
 * @param submitAction
 * @param form
 */
function guardSubmit<
  TInputs extends InputGroupContent,
  TActionResult,
  TActionProgress
>(
  submitAction: TaskAction<
    InferInputGroupValue<TInputs>,
    TActionResult,
    TActionProgress
  >,
  form: Form<TInputs, TActionResult, TActionProgress>
): TaskAction<
  null,
  SubmitResult<TActionResult> | FormValidationError,
  SubmitProgress<TActionProgress>
> {
  return async (unusedArg, helpers) => {
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

    const focusedInput = FocusState.currentFocus;
    if (
      focusedInput instanceof Input &&
      privateInputForms.get(focusedInput).has(form)
    )
      focusedInput.focusState.blur();

    const innerReportProgress = (actionProgress: TActionProgress) =>
      void helpers.reportProgress({ phase: "action", actionProgress });

    helpers.reportProgress({
      phase: "action",
      actionProgress: form.options.initialProgress
    });
    const result = await submitAction(form.value, {
      ...helpers,
      reportProgress: innerReportProgress
    });
    return { outcome: "submit" as "submit", result };
  };
}

/**
 * Finds an input that has validation error requests that it be focused.
 * @param form
 */
function findAndFocusErrors(
  form: Form<any, any, any>
): null | FormValidationError {
  const { inputErrors } = form;
  if (!inputErrors.length) return null;
  inputErrors[0].focusState.focus();
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
 * Describes a submit progress, which is divided into the validation phase and
 * the action phase.
 */
export type SubmitProgress<TActionProgress> =
  | { phase: "validation" }
  | { phase: "action"; actionProgress?: TActionProgress };

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
export interface FormOptions<
  TInputs extends InputGroupContent,
  TActionResult,
  TActionProgress
> extends StateDevOptions {
  /**
   * Specify the submit action. The outcome of this action will be saved in
   * the submit result state.
   */
  action: TaskAction<
    InferInputGroupValue<TInputs>,
    TActionResult,
    TActionProgress
  >;

  /**
   * Specify the submit action's initial progress.
   */
  initialProgress?: TActionProgress;

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
export type AsTask<T extends FormOrTask> = T extends Form<any, any, any>
  ? T["submitTask"]
  : T;

/**
 * Describes a form or a task.
 */
export type FormOrTask = Form<any, any, any> | Task<any, any, any>;
