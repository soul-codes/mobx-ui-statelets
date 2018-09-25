/**
 * @ignore
 */
export default class Disposer {
  private _handlers: DisposeHandler[] = [];
  addDisposeHandler: AddDisposeHandler;
  dispose: () => void;

  constructor() {
    this.addDisposeHandler = fn => this._handlers.push(fn);
    this.dispose = () => this._handlers.forEach(fn => fn());
  }
}

/**
 * @ignore
 */
export interface DisposeHandler {
  (): any;
}

/**
 * @ignore
 */
export interface AddDisposeHandler {
  (handler: DisposeHandler): void;
}
