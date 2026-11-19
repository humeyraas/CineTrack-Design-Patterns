import { MediaDetails, MediaKind } from "../core/models.js";

/** Adapter - Target: uygulamanın dış veri kaynağından beklediği sözleşme. */
export interface CatalogPage { items: MediaDetails[]; page: number; totalPages: number; }
export interface CastMember { name: string; character: string; profilePath: string | null; }
export interface IMediaCatalog {
  search(query: string): Promise<MediaDetails[]>;
  searchPage(query: string, page?: number): Promise<CatalogPage>;
  getCast(kind: MediaKind, id: number): Promise<string[]>;
  getCastMembers(kind: MediaKind, id: number): Promise<CastMember[]>;
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
interface TmdbSearchResponse { results: TmdbResult[]; page?: number; total_pages?: number; }
interface TmdbCreditsResponse { cast: Array<{ name: string; character?: string; profile_path?: string | null }> }

/** Adapter - Adaptee: ham dış JSON'u sunan sınıf. */
export class RawTmdbClient {
  async searchMulti(query: string, page = 1): Promise<TmdbSearchResponse> {
    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&page=${page}`);
    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: "Arama servisine ulaşılamadı." })) as { error?: string };
      throw new Error(body.error || `Arama servisi hatası (${response.status})`);
    }
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
    return (await this.searchPage(query)).items;
  }
  public async searchPage(query: string, page = 1): Promise<CatalogPage> {
    const raw = await this.adaptee.searchMulti(query, page);
    const items = raw.results
      .filter(record => (record.media_type === "movie" || record.media_type === "tv") && Number.isInteger(record.id))
      .map(record => this.convert(record));
    return { items, page: raw.page ?? page, totalPages: raw.total_pages ?? 1 };
  }
  public async getCast(kind: MediaKind, id: number): Promise<string[]> {
    return (await this.getCastMembers(kind, id)).slice(0, 7).map(actor => actor.name);
  }
  public async getCastMembers(kind: MediaKind, id: number): Promise<CastMember[]> {
    const response = await this.adaptee.credits(kind, id);
    return response.cast.slice(0, 12).map(actor => ({
      name: actor.name,
      character: actor.character ?? "",
      profilePath: actor.profile_path ?? null
    }));
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
