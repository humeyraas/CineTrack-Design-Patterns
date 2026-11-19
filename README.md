# CineTrack 🎬

CineTrack, film ve dizileri keşfetmeyi ve kişisel izleme listesinde takip etmeyi sağlayan bir web uygulamasıdır. Yapım bilgilerini demo kataloğundan veya isteğe bağlı olarak TMDB API üzerinden alır.

## Özellikler

- Film ve dizi arama, yapım detaylarını ve oyuncu bilgilerini görüntüleme
- Kişisel izleme listesine ekleme ve listeden çıkarma
- İzleme durumlarını takip etme ve kişisel puanlama
- Listeyi eklenme tarihi, kişisel puan veya isme göre sıralama
- İzleme istatistikleri ve işlem geçmişi
- Tarayıcıda yerel veri saklama (`localStorage`)
- API anahtarı olmadan örnek verilerle çalışabilen demo modu

> İlk sürümde sınırlı sayıda örnek yapım bulunmaktadır. TMDB API bağlantısı ve izleme listesi deneyimi sonraki sürümlerde geliştirilebilir.

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

**TMDB kullanımı (isteğe bağlı):** `.env.example` dosyasını `.env` adıyla kopyalayın ve `TMDB_TOKEN` alanına kendi TMDB Read Access Token değerinizi yazın. `.env` dosyasını depoya yüklemeyin; `.gitignore` içinde tutulur.

## Test

Otomatik testleri çalıştırmak için:

```bash
npm test
```

Bu komut TypeScript projesini derler ve `tests/patterns.test.mjs` testlerini çalıştırır. Derlemeyi ayrı kontrol etmek için `npm run build` kullanılabilir.

**Elle kontrol edilebilecek senaryolar:**

1. Uygulamayı açın; demo kataloğundaki yapımları arayın.
2. Bir yapımı izleme listesine ekleyin ve listeden kaldırın.
3. Liste sıralamasını değiştirin; kartların seçilen kurala göre sıralandığını kontrol edin.
4. Liste değiştiğinde istatistik ve işlem geçmişi alanlarını inceleyin.
5. Sayfayı yenileyin; izleme listesindeki kaydın korunup korunmadığını kontrol edin.

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

Film ve dizi verileri için isteğe bağlı olarak [TMDB API](https://developer.themoviedb.org/docs/getting-started) kullanılır. TMDB bağlantısı etkinse: *This product uses the TMDB API but is not endorsed or certified by TMDB.*
