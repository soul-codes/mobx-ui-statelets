import DOMQuery from "./DomQuery";
import { Falsy } from "../utils/types";

export default class BoundsQuery extends DOMQuery<BoundsResolution> {
  getBounds(): ClientRect[] {
    return this.domQuery("bounds")
      .map(bounds => bounds())
      .filter(Boolean) as ClientRect[];
  }
}

export interface BoundsResolution {
  bounds?(): ClientRect | Falsy;
}
