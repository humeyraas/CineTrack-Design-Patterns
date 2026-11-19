import { MediaDetails, MediaKind } from "../core/models.js";

/** Adapter - Target: uygulamanın dış veri kaynağından beklediği sözleşme. */
export interface IMediaCatalog {
  search(query: string): Promise<MediaDetails[]>;
  getCast(kind: MediaKind, id: number): Promise<string[]>;
  getMode(): Promise<"demo" | "tmdb">;
}

/** TMDB'nin karma movie/tv JSON'unu temsil eden dış kaynak veri tipi. */
export interface TmdbResult {
  id: number;
  media_type: string;
  title?: string;
  name?: string;
  overview?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  genre_ids?: number[];
}
interface TmdbSearchResponse { results: TmdbResult[]; }
interface TmdbCreditsResponse { cast: Array<{ name: string }> }

/** Adapter - Adaptee: ham dış JSON'u sunan sınıf. */
export class RawTmdbClient {
  async searchMulti(query: string): Promise<TmdbSearchResponse> {
    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error(`Arama servisi hatası (${response.status})`);
    return await response.json() as TmdbSearchResponse;
  }
  async credits(mediaType: MediaKind, id: number): Promise<TmdbCreditsResponse> {
    const response = await fetch(`/api/credits?type=${mediaType}&id=${id}`);
    if (!response.ok) throw new Error(`Oyuncu servisi hatası (${response.status})`);
    return await response.json() as TmdbCreditsResponse;
  }
  async mode(): Promise<"demo" | "tmdb"> {
    const response = await fetch("/api/config");
    const result = await response.json() as { mode: "demo" | "tmdb" };
    return result.mode;
  }
}

/** Adapter - ConcreteAdapter: TMDB adlarını CineTrack'in ortak modeline çevirir. */
export class TmdbCatalogAdapter implements IMediaCatalog {
  constructor(private readonly adaptee: RawTmdbClient) {}
  public async search(query: string): Promise<MediaDetails[]> {
    const raw = await this.adaptee.searchMulti(query);
    return raw.results
      .filter(record => (record.media_type === "movie" || record.media_type === "tv") && Number.isInteger(record.id))
      .map(record => this.convert(record));
  }
  public async getCast(kind: MediaKind, id: number): Promise<string[]> {
    const response = await this.adaptee.credits(kind, id);
    return response.cast.slice(0, 7).map(actor => actor.name);
  }
  public getMode(): Promise<"demo" | "tmdb"> { return this.adaptee.mode(); }
  private convert(raw: TmdbResult): MediaDetails {
    return {
      id: raw.id,
      kind: raw.media_type as MediaKind,
      title: raw.media_type === "movie" ? (raw.title ?? "İsimsiz film") : (raw.name ?? "İsimsiz dizi"),
      overview: raw.overview ?? "Açıklama bulunamadı.",
      releaseDate: raw.media_type === "movie" ? (raw.release_date ?? "") : (raw.first_air_date ?? ""),
      posterPath: raw.poster_path ?? null,
      backdropPath: raw.backdrop_path ?? null,
      voteAverage: raw.vote_average ?? 0,
      genreIds: raw.genre_ids ?? []
    };
  }
}
