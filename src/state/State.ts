/**
 * Represents any generic UI state. Other specialized UI states such as inputs
 * and tasks derive from this state.
 */
export default class State {
  /**
   * Instantiates a generic UI state.
   * @param devOptions Development-time settings
   */
  constructor(readonly devOptions?: StateDevOptions) {}

  /**
   * Returns the UI state's debug name.
   */
  get name() {
    return (this.devOptions && this.devOptions.name) || null;
  }
}

/**
 * Development-only options for any state instance.
 */
export interface StateDevOptions {
  /**
   * Debug-friendly name that can be back-queried from the state instance.
   */
  name?: string;
}
