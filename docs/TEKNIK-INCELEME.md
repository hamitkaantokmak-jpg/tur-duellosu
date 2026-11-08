# Teknik yapı

Başlangıç uygulaması yaklaşık 238 KB `index.html` içinde Canvas analizleri, telemetri yükleme/ön işleme, yarış analizleri ve yalnız Bakü'de etkin Three.js prototipi içeriyordu. PR #1'in ilk aşaması WebGL'i Meksika'ya açtı, renderer'ı ayırdı ve kalite/kamera kontrolleri ekledi. V2 mevcut analiz uygulamasını yeniden yazmadan aşağıdaki katmanları ekler:

- `index.html`: veri yükleme, seçim, karşılaştırma, saat ve mevcut analiz ekranları; sahne/HUD entegrasyonu.
- `src/replay-core.js`: saf saat, hız değişimi, coğrafi koordinat dönüşümü, kayıt/projeksiyon ve özgün mesafe örnekleme fonksiyonları. Node testleriyle aynı kod kullanılır.
- `assets/tracks/mexico.js`: MIT kaynak verisinden üretilmiş sabit coğrafi referans.
- `src/visual-assets.js`: GLTF/Meshopt/KTX2/HDR yükleme, LOD şablonları, ortak kaynak havuzu ve yedekler.
- `src/ghost-webgl.js`: Three.js sahnesi, yol/çevre/araç çizimi, görünürlük, gölgeler ve render profilleri.
- `src/ghost-world.js`: coğrafi sabit yol referansı, temsili pit/stadyum, temas gölgesi, varlık uygulama, çözünürlük ve kamera engel kontrolü.
- `src/ghost-director.js`: kamera geçişleri, isteğe bağlı Ultra AO/OutputPass ve CPU/GPU/percentile ölçümü.
- `src/ghost.css`: HUD, tam ekran ve mobil düzen.

`loadSession`, `loadTel` ve `prepTel` veri alma/temizleme yaklaşımı korunur. V2'de `resampleTel`, uygun Meksika hizalamasında özgün normalize mesafe yerine yaklaşık pist istasyon oranını kullanır. `setGeometry` referans uzunluğu/ızgarasıyla çalışır; delta hâlâ ortak ızgarada B.t − A.t olarak hesaplanır. Özgün kaynak dizilerinin içeriği değiştirilmez. Oturum/tur önbellekleri, lastik ve temiz tur filtreleri, detaylı grafikler ve yarış analizleri korunur.

Canvas perspektif oynatıcı WebGL yüklenemediğinde yedek olarak kalır. Varlık hatası tek başına oynatmayı durdurmaz: GLB yerine önceki prosedürel araçlar, KTX2 yerine JPEG kullanılır.

Gerçek yarış çizgisi iddiası yoktur. Tahmini ortak yol, kaynak konumlarının yumuşatılması, coğrafi referansın yaklaşık oluşu ve temsili çevre arayüzde açıklanır. Ayrıntılı kapsam, performans riskleri ve karşılanmamış fiziksel ölçüm hedefleri için [V2 geliştirme raporu](GELISTIRME-V2.md), varlık lisansları için [kaynak listesi](VARLIKLAR.md) okunmalıdır.
