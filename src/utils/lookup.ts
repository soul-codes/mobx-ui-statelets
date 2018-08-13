import { reaction } from "mobx";

export default function createLookup<TDest, TSrc>(
  src: TSrc,
  query: () => TDest[],
  set: (dest: TDest) => Set<TSrc>
) {
  let lastTargets = new Set<TDest>();
  return reaction(
    query,
    targets => {
      const currentTargets = new Set<TDest>();
      targets.forEach(target => {
        set(target).add(src);
        currentTargets.add(target);
      });
      lastTargets.forEach(
        target => !currentTargets.has(target) && set(target).delete(src)
      );
      lastTargets = currentTargets;
    },
    { fireImmediately: true }
  );
}
