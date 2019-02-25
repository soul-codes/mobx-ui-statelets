import { isObservableArray } from "mobx";

const hasOwnProperty = (obj: Object, prop: string) =>
  Object.prototype.hasOwnProperty.call(obj, prop);

/**
 * Performs a deep-equal comparison for pure JSON-encodable objects (primitives,
 * arrays, objects).
 * @param a
 * @param b
 */
export default function deepEqual(a: any, b: any): boolean {
  if (isEffectivelyArray(a)) {
    if (!isEffectivelyArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  if (typeof a === "object" && a !== null && b !== null) {
    if (!(typeof b === "object")) return false;
    const keys = Object.keys(a);
    if (keys.length !== Object.keys(b).length) return false;
    for (const key in a) {
      if (!hasOwnProperty(b, key)) return false;
      if (!deepEqual(a[key], b[key])) return false;
    }
    return true;
  }
  return a === b;
}

function isEffectivelyArray(a: any): a is Array<any> {
  return Array.isArray(a) || isObservableArray(a);
}
