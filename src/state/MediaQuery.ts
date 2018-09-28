import { action, observable, IObservableValue } from "mobx";
import State, { StateDevOptions } from "../state/State";

/**
 * Contains reactive state that changes depending on the match of the media
 * queries of your choice.
 */
export default class MediaQueryState<
  TQuery extends { [key: string]: string }
> extends State {
  /**
   * Sets up a media query state.
   * @param queries The set of queries to watch.
   * @param options Passed to the logical state.
   */
  constructor(queries: TQuery, options?: StateDevOptions) {
    super(options);
    this._queryValues = Object.create(null);
    Object.keys(queries).forEach(key => {
      const query = queries[key];
      const mediaQueryList = window.matchMedia(query);
      const queryObservable = (this._queryValues[key] = observable.box(
        mediaQueryList.matches
      ));
      mediaQueryList.addListener(
        action((ev: MediaQueryList) => queryObservable.set(ev.matches))
      );
    });
  }

  /**
   * Returns true if the media query specified the key is matched.
   * @param key Should be one of the keys given to the constructor.
   */
  query(key: keyof TQuery): boolean {
    return this._queryValues[key].get();
  }

  private _queryValues: { [key in keyof TQuery]: IObservableValue<boolean> };
}
