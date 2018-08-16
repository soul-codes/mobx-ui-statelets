import State from "../state/State";
import { Falsy } from "../utils/types";

export interface ElementProjections {
  element?(): HTMLElement | Falsy;
}

export default function withElement<
  TState extends new (...args: any[]) => State<ElementProjections>
>(State: TState) {
  class WithElement extends State {
    get elements(): HTMLElement[] {
      return this.project("element")
        .map(el => el())
        .filter(Boolean) as HTMLElement[];
    }
  }
  return WithElement;
}
