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
 * @typeparam TArg the task's argument type
 * @typeparam TResult the task's result type
 * @typeparam TProgress the task's progress readout type
 */
export default class Task<TArg, TResult, TProgress = void> extends State {
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

    const invokeInstance = (this._invokeInstance = new InvokeInstance());
    const reportProgress = (progress: TProgress) => {
      if (this._invokeInstance === invokeInstance) {
        this._progress = progress;
      }
    };

    let result: MaybePromise<TResult>;

    this._isPending = false;
    this._progress = void 0;
    result = (this.action || 0)(
      args,
      invokeInstance.addCancelHandler,
      reportProgress
    );

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
  addCancelHandler: AddCancelHandler,
  reportProgress: (progress: TProgress) => void
) => MaybePromise<TResult>;

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
