import { observable, IObservableValue } from "mobx";

/**
 * Creates a weak property getter/setter. Use this to establish "friend" property
 * relationships between TypeScript objects as an alternative to shared private
 * property between classes, which is not possible otherwise. The implementation
 * uses a WeakMap to accomplish the weak property.
 *
 * @param initializer Initializes the property. Is called lazily on the first get.
 * @ignore
 */
export default function createWeakProperty<TProperty, TInstance extends Object>(
  initializer: (instance: TInstance) => TProperty
) {
  const weakMap = new WeakMap<TInstance, IObservableValue<TProperty>>();
  return {
    get(instance: TInstance): TProperty {
      let entry = weakMap.get(instance);
      if (entry) return entry.get();

      const newEntry = initializer(instance);
      weakMap.set(instance, observable.box(newEntry));
      return this.get(instance);
    },

    set(instance: TInstance, value: TProperty) {
      let entry = weakMap.get(instance);
      if (entry) {
        entry.set(value);
      } else {
        weakMap.set(instance, observable.box(value));
      }
    }
  };
}
