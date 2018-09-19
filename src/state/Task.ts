import { observable, action } from "mobx";
import { MaybePromise } from "../utils/types";
import State, { StateDevOptions } from "./State";
import Disposer, { AddDisposeHandler } from "../utils/disposer";

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
 */
export default class Task<TArg, TResult> extends State {
  /**
   * Instantiates the task state with an action.
   * @param action the task's action.
   * @param options
   */
  constructor(
    readonly action: TaskAction<TArg, TResult>,
    options?: StateDevOptions
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
    let result: MaybePromise<TResult>;

    this._isPending = false;
    result = (this.action || 0)(args, invokeInstance.addCancelHandler);
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

  @observable
  private _promise: Promise<void> | null = null;

  @observable
  private _isPending = false;

  @observable
  private _result: TResult | void = void 0;

  private _invokeInstance: InvokeInstance | null = null;

  @action
  private _settle(invokeInstance: InvokeInstance, result: TResult) {
    invokeInstance.settle();
    this._isPending = false;
    this._result = result;
    this._promise = null;
    this._invokeInstance = null;
  }
}

/**
 * Describes a function where you can register a cancel handler.
 */
export type AddCancelHandler = AddDisposeHandler;

/**
 * Describes a task function.
 * @param arg the arbitrary argument the task is invoked with.
 * @param addCancelHandler Call this method to register an arbitrary cancel handler
 * that is invoked when this particular instance of the task gets canceled.
 */
export type TaskAction<TArg, TResult> = (
  arg: TArg,
  addCancelHandler: AddCancelHandler
) => MaybePromise<TResult>;

/**
 * Infers the argument type from a task state type.
 */
export type InferTaskArg<T extends Task<any, any>> = T extends Task<
  infer TArg,
  any
>
  ? TArg
  : never;
