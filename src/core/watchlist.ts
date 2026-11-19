import { MediaDetails, WatchlistChange, WatchlistItem, WatchStatus } from "./models.js";
import { IWatchlistObserver, IWatchlistSubject } from "./observer.js";

/** GoF Observer - ConcreteSubject; izleme listesi durumunu yönetir. */
export class WatchlistStore implements IWatchlistSubject {
  private readonly observers = new Set<IWatchlistObserver>();
  private items: WatchlistItem[] = [];
  private readonly storageKey = "cinetrack-watchlist-v1";

  constructor(private readonly storage: Pick<Storage, "getItem" | "setItem">) {
    try {
      const parsed: unknown = JSON.parse(storage.getItem(this.storageKey) ?? "[]");
      if (Array.isArray(parsed)) {
        this.items = parsed.filter((item): item is WatchlistItem => this.isValidItem(item));
      }
    } catch { this.items = []; }
  }
  private isValidItem(value: unknown): value is WatchlistItem {
    if (!value || typeof value !== "object") return false;
    const item = value as Partial<WatchlistItem>;
    return !!item.media && typeof item.media.id === "number" &&
      (item.media.kind === "movie" || item.media.kind === "tv") &&
      typeof item.media.title === "string" &&
      ["planned", "watching", "completed"].includes(item.status ?? "") &&
      typeof item.addedAt === "string" &&
      (item.personalRating === null || (typeof item.personalRating === "number" && item.personalRating >= 1 && item.personalRating <= 10));
  }
  attach(observer: IWatchlistObserver): void { this.observers.add(observer); }
  detach(observer: IWatchlistObserver): void { this.observers.delete(observer); }
  private notify(change: WatchlistChange): void {
    this.storage.setItem(this.storageKey, JSON.stringify(this.items));
    const snapshot = this.getItems();
    for (const observer of this.observers) observer.update(change, snapshot);
  }
  getItems(): WatchlistItem[] { return this.items.map(item => ({ ...item, media: { ...item.media } })); }
  getByKey(key: string): WatchlistItem | undefined {
    return this.getItems().find(item => `${item.media.kind}:${item.media.id}` === key);
  }
  add(media: MediaDetails): boolean {
    const key = `${media.kind}:${media.id}`;
    if (this.getByKey(key)) return false;
    this.items.push({ media: { ...media }, status: "planned", personalRating: null, addedAt: new Date().toISOString() });
    this.notify({ type: "added", title: media.title, key, info: "izleme listesine eklendi" });
    return true;
  }
  remove(key: string): boolean {
    const existing = this.getByKey(key);
    if (!existing) return false;
    this.items = this.items.filter(item => `${item.media.kind}:${item.media.id}` !== key);
    this.notify({ type: "removed", title: existing.media.title, key, info: "listeden kaldırıldı" });
    return true;
  }
  setStatus(key: string, status: WatchStatus): boolean {
    if (!["planned", "watching", "completed"].includes(status)) return false;
    const item = this.items.find(item => `${item.media.kind}:${item.media.id}` === key);
    if (!item || item.status === status) return false;
    item.status = status;
    const text = { planned: "İzleyeceğim", watching: "İzliyorum", completed: "Tamamladım" }[status];
    this.notify({ type: "status", title: item.media.title, key, info: `durumu '${text}' yapıldı` });
    return true;
  }
  setRating(key: string, rating: number | null): boolean {
    if (rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 10)) return false;
    const item = this.items.find(item => `${item.media.kind}:${item.media.id}` === key);
    if (!item || item.personalRating === rating) return false;
    item.personalRating = rating;
    this.notify({ type: "rating", title: item.media.title, key, info: rating === null ? "puanı temizlendi" : `${rating}/10 puan verildi` });
    return true;
  }
}
