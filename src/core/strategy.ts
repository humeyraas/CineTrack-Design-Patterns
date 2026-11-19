import { WatchlistItem } from "./models.js";

/** GoF Strategy - Strategy arayüzü */
export interface ISortStrategy {
  readonly name: string;
  sort(items: readonly WatchlistItem[]): WatchlistItem[];
}

/** ConcreteStrategy 1: son eklenen önce */
export class NewestFirstStrategy implements ISortStrategy {
  readonly name = "En son eklenen";
  sort(items: readonly WatchlistItem[]): WatchlistItem[] {
    return [...items].sort((a, b) => b.addedAt.localeCompare(a.addedAt));
  }
}

/** ConcreteStrategy 2: kişisel puanı yüksek olan önce */
export class PersonalRatingStrategy implements ISortStrategy {
  readonly name = "Puanım (yüksekten düşüğe)";
  sort(items: readonly WatchlistItem[]): WatchlistItem[] {
    return [...items].sort((a, b) => (b.personalRating ?? -1) - (a.personalRating ?? -1));
  }
}

/** ConcreteStrategy 3: alfabetik */
export class TitleAZStrategy implements ISortStrategy {
  readonly name = "İsme göre A-Z";
  sort(items: readonly WatchlistItem[]): WatchlistItem[] {
    return [...items].sort((a, b) => a.media.title.localeCompare(b.media.title, "tr"));
  }
}

/** Context: Seçili stratejiyi tutar, değiştirir ve kullanır. */
export class WatchlistSorter {
  constructor(private strategy: ISortStrategy) {}
  setStrategy(strategy: ISortStrategy): void { this.strategy = strategy; }
  getStrategyName(): string { return this.strategy.name; }
  sort(items: readonly WatchlistItem[]): WatchlistItem[] { return this.strategy.sort(items); }
}
