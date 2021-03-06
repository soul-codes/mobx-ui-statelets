import { observable, action } from "mobx";
import { MaybePromise } from "../utils/types";
import State, { StateDevOptions } from "./State";
import Disposer from "../utils/disposer";

const $canceled = Symbol("Canceled");
class InvokeInstance {
  private readonly _disposer = new Disposer();
  private _resolver: null | ((token: typeof $canceled) => void) = null;
  private _isCanceled = false;
  private _isSettled = false;

  readonly killerPromise = new Promise<typeof $canceled>(
    resolve => (this._resolver = resolve)
  );

  get isCanceled() {
    return this._isCanceled;
  }

  get addCancelHandler() {
    return this._disposer.addDisposeHandler;
  }

  cancel() {
    if (!this._isCanceled) {
      this._isCanceled = true;
      if (!this._isSettled) {
        this._resolver && this._resolver($canceled);
        this._disposer.dispose();
      }
    }
  }

  settle() {
    if (!this._isCanceled) this._isSettled = true;
  }
}

/**
 * Represents and manages a state of an asynchronous task.
 *
 * The task itself can accept one arbitrarily-typed argument.
 *
 * @template TArg the task's argument type
 * @template TResult the task's result type
 * @template TProgress the task's progress readout type
 */
export default class Task<
  TArg = any,
  TResult = any,
  TProgress = any
> extends State {
  /**
   * Instantiates the task state with an action.
   * @param action the task's action.
   * @param options
   */
  constructor(
    readonly action: TaskAction<TArg, TResult, TProgress>,
    options?: TaskOptions<TProgress>
  ) {
    super(options);
  }

  /**
   * Returns true if the task is in pending state.
   */
  get isPending() {
    return this._isPending;
  }

  /**
   * Returns the result of the last completed task.
   */
  get result() {
    return this._result;
  }

  /**
   * Returns the argument of the last task, regardless of whether that task
   * actually completed.
   */
  get args() {
    return this._lastArg && this._lastArg.args;
  }

  /**
   * Returns the last reported progress of the pending task. Has no meaning if
   * the task is not in pending state.
   */
  get progress() {
    return this._progress;
  }

  /**
   * Returns the promise that resolves when the task is completed or is canceled.
   */
  get promise() {
    return this._promise;
  }

  /**
   * Runs the task.
   * @param args The arbitrary argument to pass to the task.
   */
  @action
  invoke(args: TArg): Promise<void> {
    if (this._isPending) {
      const invokeInstance = this._invokeInstance as InvokeInstance;
      invokeInstance.cancel();
    }
    this._lastArg = { args };

    const invokeInstance = (this._invokeInstance = new InvokeInstance());
    const reportProgress = (progress: TProgress) => {
      if (this._invokeInstance === invokeInstance) {
        this._progress = progress;
      }
    };

    let result: MaybePromise<TResult>;

    this._isPending = false;
    this._progress = void 0;
    const helpers: TaskHelpers<TProgress> = {
      onCancel: invokeInstance.addCancelHandler,
      get isCanceled() {
        return invokeInstance.isCanceled;
      },
      reportProgress
    };

    result = (this.action || 0)(args, helpers);

    if (result instanceof Promise) {
      this._isPending = true;
      return (this._promise = Promise.race([
        invokeInstance.killerPromise,
        result
      ]).then(
        action((result: TResult | typeof $canceled) => {
          if (result === $canceled || invokeInstance.isCanceled) {
            if (this._invokeInstance === invokeInstance) {
              this._isPending = false;
            }
          } else {
            this._settle(invokeInstance, result);
          }
        })
      ));
    } else {
      this._settle(invokeInstance, result);
      return (this._promise = Promise.resolve());
    }
  }

  @action reinvoke(required: boolean): Promise<void> {
    if (this._lastArg) {
      return this.invoke(this._lastArg.args);
    }
    if (required) {
      throw Error(
        `Attempted to call reinvoke() on action \`${
          this.name
        }\` but it was never invoked and \`required\` flag was on.`
      );
    }
    return Promise.resolve();
  }

  /**
   * Cancels the pending task. If there isn't one, this call is no-op.
   */
  @action
  cancel() {
    this._invokeInstance && this._invokeInstance.cancel();
  }

  @observable.ref
  private _promise: Promise<void> | null = null;

  @observable
  private _isPending = false;

  @observable.ref
  private _result: TResult | void = void 0;

  @observable.ref
  private _lastArg: { args: TArg } | void = void 0;

  @observable.ref
  private _progress?: TProgress;

  private _invokeInstance: InvokeInstance | null = null;

  @action
  private _settle(invokeInstance: InvokeInstance, result: TResult) {
    invokeInstance.settle();
    this._isPending = false;
    this._result = result;
    this._promise = null;
    this._invokeInstance = null;
    this._progress = void 0;
  }
}

/**
 * Describes a function where you can register a cancel handler.
 * @param handler The handler function to be called when a task is canceled.
 */
export type AddCancelHandler = (handler: () => void) => void;

/**
 * Describes a task function.
 * @param arg the arbitrary argument the task is invoked with.
 * @param addCancelHandler Call this method to register an arbitrary cancel handler
 * that is invoked when this particular instance of the task gets canceled.
 */
export type TaskAction<TArg, TResult, TProgress> = (
  arg: TArg,
  helpers: TaskHelpers<TProgress>
) => MaybePromise<TResult>;

export interface TaskHelpers<TProgress> {
  onCancel: AddCancelHandler;
  isCanceled: boolean;
  reportProgress: (progress: TProgress) => void;
}

/**
 * Infers the argument type from a task state type.
 * @ignore
 */
export type InferTaskArg<T extends Task<any, any, any>> = T extends Task<
  infer TArg,
  any,
  any
>
  ? TArg
  : never;

/**
 * Specifies customization of a task state.
 */
export interface TaskOptions<TProgress> extends StateDevOptions {
  /**
   * Specifies the value of the initial progress of the task when it starts. If
   * using TypeScript, specfiying this value has the side effect of TypeScript
   * inferring the progress value type from this value.
   */
  initialProgress?: TProgress;
}
