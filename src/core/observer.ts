import { WatchlistChange, WatchlistItem, WatchStatus } from "./models.js";

/** GoF Observer: Observer rolü. */
export interface IWatchlistObserver {
  update(change: WatchlistChange, items: readonly WatchlistItem[]): void;
}

/** Subject rolü: bunların tamamı öğrenci kodu, hazır event sistemi kullanılmıyor. */
export interface IWatchlistSubject {
  attach(observer: IWatchlistObserver): void;
  detach(observer: IWatchlistObserver): void;
}

export interface WatchlistStatistics {
  total: number;
  planned: number;
  watching: number;
  completed: number;
}

/** ConcreteObserver 1: liste değişince istatistik hesaplar. */
export class StatisticsObserver implements IWatchlistObserver {
  private stats: WatchlistStatistics = { total: 0, planned: 0, watching: 0, completed: 0 };
  constructor(private onChanged?: (stats: WatchlistStatistics) => void) {}
  update(_change: WatchlistChange, items: readonly WatchlistItem[]): void {
    this.recalculate(items);
  }
  recalculate(items: readonly WatchlistItem[]): void {
    const count = (status: WatchStatus) => items.filter(item => item.status === status).length;
    this.stats = { total: items.length, planned: count("planned"), watching: count("watching"), completed: count("completed") };
    this.onChanged?.(this.stats);
  }
  getStats(): WatchlistStatistics { return { ...this.stats }; }
}

export interface ActivityEntry { message: string; createdAt: string; }
/** ConcreteObserver 2: liste değişikliklerinden işlem geçmişi oluşturur. */
export class ActivityLogObserver implements IWatchlistObserver {
  private entries: ActivityEntry[] = [];
  constructor(private onChanged?: (entries: readonly ActivityEntry[]) => void) {}
  update(change: WatchlistChange, _items: readonly WatchlistItem[]): void {
    this.entries.unshift({ message: `${change.title} — ${change.info}`, createdAt: new Date().toLocaleString("tr-TR") });
    if (this.entries.length > 15) this.entries.pop();
    this.onChanged?.(this.entries);
  }
  getEntries(): readonly ActivityEntry[] { return [...this.entries]; }
}
