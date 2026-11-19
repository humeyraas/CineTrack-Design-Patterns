import { Media, MediaDetails, Movie, Series } from "./models.js";

/** GoF Factory Method - Creator. Ürün yaratma adımı soyut; genel iş akışı burada. */
export abstract class MediaFactory {
  public create(details: MediaDetails): Media {
    if (!details.title.trim() || !Number.isInteger(details.id) || details.id < 0) {
      throw new Error("Yapım bilgileri geçerli değil.");
    }
    return this.createProduct(details);
  }
  protected abstract createProduct(details: MediaDetails): Media;
}

/** ConcreteCreator 1 */
export class MovieFactory extends MediaFactory {
  protected createProduct(details: MediaDetails): Media {
    if (details.kind !== "movie") throw new Error("MovieFactory yalnızca film üretir.");
    return new Movie(details);
  }
}

/** ConcreteCreator 2 */
export class SeriesFactory extends MediaFactory {
  protected createProduct(details: MediaDetails): Media {
    if (details.kind !== "tv") throw new Error("SeriesFactory yalnızca dizi üretir.");
    return new Series(details);
  }
}

export class MediaFactorySelector {
  constructor(private movieFactory: MediaFactory, private seriesFactory: MediaFactory) {}
  create(details: MediaDetails): Media {
    return (details.kind === "movie" ? this.movieFactory : this.seriesFactory).create(details);
  }
}
