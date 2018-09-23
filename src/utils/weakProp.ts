import { observable, IObservableValue } from "mobx";

export default function createWeakProperty<TProperty, TInstance extends Object>(
  newProperty: (instance: TInstance) => TProperty
) {
  const weakMap = new WeakMap<TInstance, IObservableValue<TProperty>>();
  return {
    get(instance: TInstance): TProperty {
      let entry = weakMap.get(instance);
      if (entry) return entry.get();

      const newEntry = newProperty(instance);
      weakMap.set(instance, observable.box(newEntry));
      return newEntry;
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
