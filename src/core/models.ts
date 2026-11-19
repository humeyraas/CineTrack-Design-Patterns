/** API'den gelen bilgi -> Adapter -> bu ortak modele dönüşür. */
export type MediaKind = "movie" | "tv";
export type WatchStatus = "planned" | "watching" | "completed";

export interface MediaDetails {
  id: number;
  kind: MediaKind;
  title: string;
  overview: string;
  releaseDate: string;
  posterPath: string | null;
  backdropPath: string | null;
  voteAverage: number;
  genreIds: number[];
}

/** Factory Method için Product: iki somut ürünün ortak türü. */
export abstract class Media {
  constructor(public readonly details: MediaDetails) {}
  get id(): number { return this.details.id; }
  get kind(): MediaKind { return this.details.kind; }
  get title(): string { return this.details.title; }
  get key(): string { return `${this.kind}:${this.id}`; }
  abstract getTypeLabel(): string;
  abstract getDateLabel(): string;
}

/** ConcreteProduct 1 */
export class Movie extends Media {
  getTypeLabel(): string { return "Film"; }
  getDateLabel(): string { return "Vizyon"; }
}

/** ConcreteProduct 2 */
export class Series extends Media {
  getTypeLabel(): string { return "Dizi"; }
  getDateLabel(): string { return "İlk yayın"; }
}

export interface WatchlistItem {
  media: MediaDetails;
  status: WatchStatus;
  personalRating: number | null;
  addedAt: string;
}

export type WatchlistChangeType = "added" | "removed" | "status" | "rating";
export interface WatchlistChange {
  type: WatchlistChangeType;
  title: string;
  key: string;
  info: string;
}
