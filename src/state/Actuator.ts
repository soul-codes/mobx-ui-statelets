import { observable, action } from "mobx";
import { MaybePromise } from "../utils/types";
import State, { StateDevOptions } from "./State";
import Disposer, { DisposeHandler, AddDisposeHandler } from "../utils/disposer";

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

export default class Actuator<TArg, TResult> extends State<ActuatorProjection> {
  constructor(
    readonly action: ActuatorAction<TArg, TResult>,
    options?: StateDevOptions
  ) {
    super(options);
  }

  get isPending() {
    return this._isPending;
  }

  get result() {
    return this._result;
  }

  get promise() {
    return this._promise;
  }

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

export type AddCancelhandler = AddDisposeHandler;

export interface ActuatorProjection {
  element?: Element;
}

export type ActuatorAction<TArg, TResult> = (
  arg: TArg,
  addCancelHandler: AddCancelhandler
) => MaybePromise<TResult>;

export type ActuatorArg<T extends Actuator<any, any>> = T extends Actuator<
  infer TArg,
  any
>
  ? TArg
  : never;
