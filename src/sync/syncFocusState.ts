import { createDOMStateSync } from "./syncDOMState";
import FocusState from "../state/Focus";

/**
 * Creates a React component decorator that syncs a HTML element's focus state to
 * the headless focus state.
 */
export const syncFocusState = createDOMStateSync(
  (el: HTMLElement, state: FocusState | boolean) => {
    const isFocused =
      typeof state === "boolean" ? state : state ? state.isFocused : null;
    if (isFocused === true) {
      el.focus();
    } else if (isFocused === false) {
      el.blur();
    }
  }
);
