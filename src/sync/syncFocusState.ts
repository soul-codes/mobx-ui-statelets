import { syncDOMState } from "./syncDOMState";
import { Component } from "react";
import FocusState from "../state/Focus";
import { Falsy } from "../utils/types";

/**
 * Creates a React component decorator that syncs a HTML element's focus state to
 * the headless focus state.
 * @param syncInfo
 */
export function syncFocusState<TComponent extends Component>(
  syncInfo: (component: TComponent) => FocusStateSync | Falsy
) {
  return syncDOMState((component: TComponent) => {
    const { el = null, focusState = null, isFocused = null } =
      syncInfo(component) || {};
    if (!el) return;

    const focusValue =
      typeof isFocused === "boolean"
        ? isFocused
        : focusState
          ? focusState.isFocused
          : null;

    if (focusValue === true) {
      el.focus();
    } else if (focusValue === false) {
      el.blur();
    }
  });
}

interface FocusStateSync {
  /**
   * The target HTML element to sync with the focus state. This should be
   * observable by MobX.
   */
  el?: HTMLElement | Falsy;

  /**
   * Specifies the focus state to sync the HTML element with
   */
  focusState?: FocusState | Falsy;

  /**
   * Specifies the exact focus state
   */
  isFocused?: boolean;
}
