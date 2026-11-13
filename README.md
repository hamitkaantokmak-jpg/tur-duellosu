# Tur Düellosu

HTML/CSS/JavaScript ile gerçek F1 telemetrisi, veri stüdyosu, yarış analizi ve Three.js ghost lap karşılaştırması. Framework veya uygulama derlemesi gerekmez.

```sh
npm run serve
```

`http://localhost:4173` adresini açın. İnternet; telemetri arşivi, Three.js ve decoder modülleri için gereklidir. Yerel görsel varlıklar depoya dahildir. Kayıtlı tercih yoksa 2024 Meksika sıralama HAM/RUS seçilir. **Hayalet tur** 3D görünümü, **Düelloya dön** ayrıntılı analizi açar.

- **Veri stüdyosu:** düello hikâyeleri, sürüş profilleri, yarış dosyası, arşiv, analiz laboratuvarı ve paylaşılabilir notlar. Oyun içermez; 3D açılmadan çalışır.
- Oynatma: boşluk; ← / → ile zaman; zaman çizelgesi; 0.25×–4×. Gizlenen sekmede duraklar, otomatik devam etmez.
- Kameralar: A/B takip, yayın, alçak açı, iki araç, üstten, serbest. Serbest kamerada sürükle/tekerlek; Shift+sürükle veya sağ tuşla pan; WASD; R ile sıfırla.
- Görsel: Performans/Dengeli/Ultra; isteğe bağlı Ultra AO; dinamik çözünürlük; B saydamlığı ve tam ekran.
- Performans paneli: gerçek render boyutu, FPS, CPU çizim ve destekleniyorsa GPU süresi, draw calls ve kaynak sayaçları. **Ölçümü indir** JSON raporu verir.

Meksika çevre tabanları ve ağaç konumları © OpenStreetMap contributors (ODbL 1.0) kaynağındandır. Sabit pist çizgisi yaklaşık referanstır; pist genişliği, eğim, kerbler, yapılar ve araç modeli ölçülmüş/resmî varlık değildir. Ortak sürüş çizgisi tahmin olarak etiketlidir. Delta yaklaşık pist ilerlemesinde karşılaştırılır; milisaniye hassasiyetinde fiziksel konum eşlemesi iddiası yoktur.

## Test ve varlık hazırlama

```sh
npm ci
npm test
npm run assets:build # yalnız Blender 4.3+ ile yeni araç/çevre üretimi
```

`npm test`: saf çekirdek testleri + gerçek arşiv verisi kullanan Playwright senaryoları. Chromium gerekir; `CHROMIUM_PATH` ile yol seçilebilir. Test çizimi SwiftShader kullanır, fiziksel GPU performansı sayılmaz. Proxy CA'sı için gerekirse `CHROMIUM_PROXY_SPKI` tanımlanabilir; genel TLS denetimi kapatılmaz. Encoder uygulamayı çalıştırmak için gerekmez; varlık yeniden üretimi ve lisanslar aşağıdadır.

- [V5 pist topografyası, veri doğruluğu ve doğrulama](docs/PIST-TOPOGRAFYASI.md)
- [Takılma ve Brave grafik hızlandırma kontrolü](docs/TAKILMA-DUZELTMESI.md)
- [Veri stüdyosu: 25 fikir, yöntemler ve testler](docs/VERI-STUDYOSU.md)
- [Main entegrasyonu ve son regresyon](docs/MAIN-ENTEGRASYON.md)
- [V4 Blender kaynakları ve görsel/performance raporu](docs/GELISTIRME-V4.md)
- [V3 görsel karşılaştırma ve teknik rapor](docs/GELISTIRME-V3.md)
- [V2 kapsamı ve sınırlar](docs/GELISTIRME-V2.md)
- [Teknik yapı](docs/TEKNIK-INCELEME.md)
- [Varlıklar ve lisanslar](docs/VARLIKLAR.md)
- [Test/ölçüm raporu](docs/TEST-RAPORU.md)

Uygulama hazır Blender GLB varlıklarını kullanır. Bu inceleme dalında kullanıcı isteğiyle halosuz V7.1 araçları, V8 görsel hareketi ve V4 çevre varlıkları birlikte korunur. `npm run assets:build` yalnız araçları yeniden üretir; normal kullanımda Blender gerekmez. Üretim ve CC0 kaynak açıklamaları: [art/blender](art/blender/README.md). Tarihsel tam pist üretimi `npm run assets:build:v3` içinde korunur (Shapely gerekir).

Güncel main, Veri Stüdyosu ve kamera optimizasyonu doğrulaması: [Performans entegrasyon raporu](docs/PERFORMANS-ENTEGRASYON.md).

V5 son denetim, Ultra/1080p/1440p ölçümleri ve entegrasyon kanıtları: [V5 son denetim](docs/V5-SON-DENETIM.md).

V6 inceleme dalındaki COTA/Spa arazi verileri, lisanslar ve doğruluk sınırları: [Gerçek pist topografyası](docs/GERCEK-PIST-TOPOGRAFYASI.md). Bu profiller asfalt ölçümü veya ölçülmüş banking değildir; Meksika düz referansı korunur.

V6.1 bariyer çizim optimizasyonu, regresyon kanıtları ve eş ayarlı görseller: [V6.1 raporu](docs/V6-1-PERFORMANS-OPTIMIZASYONU.md). V7 başlangıç main'i V6.1 merge commit'i `e5ffd2224bb3ee2dceed9ee2470bc6f6da33fc74` içerir; bu birleştirme aynı fiziksel NVIDIA üzerinde FPS kabulünün doğrulandığı anlamına gelmez. Tarihsel rapordaki kabul borcu açık kalır.

V7 özgün araç silüeti, lastikler, PBR, üç LOD ve gerçek önce/sonra görselleri: [V7 araç raporu](docs/V7-ARAC-GORSELLERI.md) · [Galeri](docs/visual/v7/README.md). PR #11 birleştirilmiştir; tarihsel raporları korunur. V8 hareket ve temas sınırları: [V8 raporu](docs/ARAC-HAREKET-V8.md).

V7.1 bağımsız görsel denetimi, halosuz GLB/fallback modelleri ve kesilme düzeltmesi: [V7.1 raporu](docs/V7-1-GORSEL-DENETIM.md) · [15 önce/sonra çifti](docs/visual/v71/README.md). `feat/v7-1-visual-audit` dalı V8 main `ad35d61` üzerine kuruludur; bu çalışma main'e birleştirilmedi. NVIDIA performans kabul borcu açık kalır.
