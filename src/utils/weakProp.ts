export default function createWeakProperty<TProperty, TInstance extends Object>(
  newProperty: (instance: TInstance) => TProperty
) {
  const weakMap = new WeakMap<TInstance, TProperty>();
  return {
    get(instance: TInstance) {
      let entry = weakMap.get(instance);
      if (entry) return entry;

      entry = newProperty(instance);
      weakMap.set(instance, entry);
      return entry;
    }
  };
}
