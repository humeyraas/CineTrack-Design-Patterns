# CineTrack 🎬

CineTrack, film ve dizileri keşfetmeyi ve kişisel izleme listesinde takip etmeyi sağlayan bir web uygulamasıdır. TMDB API üzerinden güncel yapımları, afişleri ve oyuncu kadrolarını görüntüler; API erişimi olmadığında örnek katalogla çalışabilir.

## Özellikler

- TMDB üzerinden film/dizi arama, haftanın öne çıkan yapımlarını görüntüleme ve sayfalar arasında gezinme
- Yapımların afişlerini, özetlerini, puanlarını ve oyuncu fotoğraflarını görüntüleme
- Kişisel izleme listesine ekleme ve listeden çıkarma
- İzleme durumlarını takip etme ve kişisel puanlama
- Listeyi eklenme tarihi, kişisel puan veya isme göre sıralama
- İzleme istatistikleri ve işlem geçmişi
- Tarayıcıda yerel veri saklama (`localStorage`)
- API anahtarı olmadan örnek verilerle çalışabilen demo modu


## Kullanılan teknolojiler

TypeScript, HTML, CSS ve Node.js.

## Kurulum

**Gereksinim:** Node.js 22 veya üzeri ve npm.

1. Projeyi indirin veya klonlayın.
2. Proje klasöründe bir terminal açın.
3. Bağımlılıkları yükleyip uygulamayı başlatın:

```bash
npm install
npm run dev
```

4. Tarayıcıdan **http://localhost:3000** adresini açın.

Demo modu için API anahtarı gerekli değildir.

### TMDB bağlantısını etkinleştirme

1. [TMDB](https://www.themoviedb.org/) hesabı oluşturun ve **Settings → API** sayfasından API erişimi alın.
2. Projenin kökündeki `.env.example` dosyasını kopyalayın; kopyanın adını **`.env`** yapın.
3. `.env` içindeki `TMDB_TOKEN=` satırının sonuna **API Read Access Token** değerinizi yapıştırın. Sadece token metnini girin; `Bearer` yazmayın.
4. Açık sunucuyu terminalde `Ctrl+C` ile durdurup `npm run dev` komutuyla yeniden başlatın.
5. Ana sayfada **TMDB canlı** yazmalıdır. Boş aramada haftanın öne çıkan yapımları; bir kelime aratınca gerçek film/dizi sonuçları gelir.

`.env` dosyasını GitHub'a **yüklemeyin**. Dosya `.gitignore` içinde yok sayılır. Token boş bırakılırsa uygulama otomatik olarak demo moduna geçer. Gerçek TMDB verileri çekilirken internet bağlantısı gerekir.

## Test

Otomatik testleri çalıştırmak için:

```bash
npm test
```

Bu komut TypeScript projesini derler ve `tests/patterns.test.mjs` testlerini çalıştırır. Derlemeyi ayrı kontrol etmek için `npm run build` kullanılabilir.

**Elle kontrol edilebilecek senaryolar:**

1. Uygulamayı açın; token yoksa demo kataloğunda arama yapın, token varsa haftalık öne çıkan yapımları görüntüleyin.
2. Bir yapımı izleme listesine ekleyin ve listeden kaldırın.
3. Liste sıralamasını değiştirin; kartların seçilen kurala göre sıralandığını kontrol edin.
4. Liste değiştiğinde istatistik ve işlem geçmişi alanlarını inceleyin.
5. Sayfayı yenileyin; izleme listesindeki kaydın korunup korunmadığını kontrol edin.
6. TMDB tokenı ile film arayın, afişi ve detay ekranındaki oyuncu fotoğraflarını kontrol edin.
7. Arama sonuçlarında **Sonraki** ve **Önceki** sayfa düğmelerini deneyin.

## Tasarım kalıpları

Uygulamada dört GoF tasarım kalıbı kendi arayüz ve sınıflarıyla uygulanmıştır.

| Kategori | Kalıp | Kullanım amacı | Kod |
| --- | --- | --- | --- |
| Yaratımsal | **Factory Method** | Film ve dizi nesnelerini ayrı oluşturucularla üretmek | [`src/core/factory.ts`](src/core/factory.ts) |
| Yapısal | **Adapter** | Dış kaynak verilerini ortak bir katalog arayüzüne uyarlamak | [`src/services/tmdb-adapter.ts`](src/services/tmdb-adapter.ts) |
| Davranışsal | **Strategy** | Farklı liste sıralama algoritmalarını değiştirebilmek | [`src/core/strategy.ts`](src/core/strategy.ts) |
| Davranışsal | **Observer** | Liste değişikliklerini istatistik ve işlem geçmişine bildirmek | [`src/core/observer.ts`](src/core/observer.ts), [`src/core/watchlist.ts`](src/core/watchlist.ts) |

## Proje yapısı

```text
CineTrack/
├── data/        # Örnek katalog
├── public/      # HTML ve CSS
├── server/      # HTTP sunucusu ve veri erişimi
├── src/         # TypeScript uygulama kodu
│   ├── core/    # Modeller ve tasarım kalıpları
│   └── services/# Dış veri kaynağı adaptörü
├── tests/       # Otomatik testler
└── README.md
```

## Veri kaynağı

Film, dizi, afiş ve oyuncu verileri [TMDB API](https://developer.themoviedb.org/docs/getting-started) üzerinden sağlanır. *This product uses the TMDB API but is not endorsed or certified by TMDB.*
