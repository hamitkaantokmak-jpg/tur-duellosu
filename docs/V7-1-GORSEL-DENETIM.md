# V7.1 — bağımsız araç görsel denetimi ve halosuz revizyon

**Sonuç: 63/63 birim ve 36/36 Chromium testi geçti. Kullanıcı isteğiyle halo üç GLB LOD'undan ve prosedürel yedekten kaldırıldı. Yedek motor kapağındaki kokpit kesilmesi düzeltildi. Kamera, PBR, pist verisi, telemetri ve V8 hareket/lastik temas katmanı korunur. Yeni PR üzerinden bağımsız incelemeye bırakılır; main'e birleştirme yapılmadı. Fiziksel NVIDIA FPS kabulü verilmedi.**

## 1. Gerçek başlangıç ve teslim kararı

İstenen V7 başı `257520db3ae8747153011f06cb7e81ddf3819e16` doğrulandı; PR #11 zaten birleştirilmişti. Güncel main `ad35d61f5b26ed1d5ff6d82a3ee43b91478cee94`, V8'i de içeriyordu. Kullanıcı **V8 korunarak yeni inceleme PR'ı** seçti. Bu nedenle çalışma `feat/v7-1-visual-audit` dalında güncel main'den başladı; eski V7 dalı değiştirilmedi ve birleştirilmiş PR yeniden açılmaya çalışılmadı.

Tam test edilen yerel commit: `3a6628bf15f6a3cb819f3db869e30e16ffdecfb5`; ağaç `05bd9c798933a62a27341131667ad68fdc0d20f3`. GitHub'daki aynı kaynak ağacı `ea937639939fd68578bffdf0b920240368f82a8c` commit'indedir. Git Data API commit metadata'sı farklıdır; ağaç kimlikleri tek tek karşılaştırılır. [Commit eşlemesi](performance/v71/publication.json), [test edilen kaynaklar](performance/v71/tested-source.json). Sonraki teslim commit'i yalnız belge/ölçüm/görsel ekler.

## 2. Bağımsız gözlem ve önem sırası

V7 raporu, görsel galerisi, ham bütçeleri, Blender üretimi, gerçek GLB'ler ve Three.js yükleyicisi incelendi. Chromium'da özgün V7 commit'i yeniden çalıştırılıp 11 referans kare üretildi. **11 dosyanın tamamı mevcut V7 son görselleriyle byte düzeyinde eşit** çıktı: [taze referans metadata/hash](performance/v71/v7-reference.json), [orijinal galeri](visual/v7/README.md). Bu denetim yalnız önceki rapora güvenerek yapılmadı.

| Öncelik | Yeniden üretilen bulgu | Düzeltme / karar |
|---|---|---|
| P1 | Kokpitte halo kirişi görüşü kapatıyor ve near düzleminde kesiliyordu. V8 main'de Meksika 66, COTA 14, Spa 11 görünür üçgen/düzlem kesişmesi ölçüldü. | Kullanıcı haloyu kaldırmaya izin verdi. Blender'da `HaloRing`/`HaloPillar` export öncesi kaldırıldı; bütün LOD'lar ve düzenlenebilir kaynak aynı. Kamera ayarları korunur. |
| P2 | Yeni testte prosedürel yedeğin büyük motor kapağı near düzlemini 14 üçgende kesiyordu. Halo kaldırmak tek başına bunu çözmedi. | Motor kapağı kısaltılıp alçaltıldı ve kokpit arkasında bitirildi. Aynı SphereGeometry segmentleri/materyal kullanılır; ek prim yok. Son kesişme 0. |
| Gözlem | Düşük LOD'da yüzey faceting'i ve ayrıntı kaybı görülür. | Uzak görünüm için mevcut ayrı LOD yaklaşımı korunur; yeni crossfade veya poligon eklenmedi. Üç LOD aynı tekerlek/pivot sözleşmesini kullanır. |
| Gözlem | Kanat/burun/sidepod/difüzör silüeti, lastik-jant ve PBR yüzeylerinde bu karelerde ayrı belirgin bir kopma veya yeni gölgelenme hatası yeniden üretilemedi. | Bu parçalar ve materyaller yeniden tasarlanmadı. Gerçek araç veya takım tasarımının doğruluğu iddia edilmez. |

Süspansiyon bağlantıları V8'in mevcut görsel yaklaşımıyla hareket eder; bağlantı uçları için yeni kinematik çözücü eklenmedi. Statik görüntüler bütün olası hareketlerde bağlantı kusursuzluğunun garantisi değildir. V8'in sınırları [mevcut raporda](ARAC-HAREKET-V8.md) korunur.

## 3. Teslim edilen değişiklikler

- Üç araç GLB'sinden ve `vehicle-v7.blend` kaynağından halo kaldırıldı. Kaynak gerçekten Blender 4.3.2'de yeniden açıldı: 200 nesne, 0 halo nesnesi, 4 tekerlek pivotu. [Reopen](performance/v71/blender-reopen.txt).
- Prosedürel fallback halo tüpü kaldırıldı. Motor kapağı ölçeği `(0.43,0.47,1.65)`→`(0.43,0.38,1.15)`, merkezi `(0,0.56,−0.6)`→`(0,0.56,−0.95)` oldu. Burun, sidepod, tekerlekler ve hareket bağlantıları korunur.
- Kamera ileri ofseti 0.1 m, yüksekliği 0.98 m, kokpit near 0.5 m olarak aynıdır. Denenen alternatif göz/near ayarları teslim edilmedi; baş/vizör gizleme veya yeni kamera sistemi yoktur.
- Meshopt/UV/normal, materyal ayarları, ışık ve kalite profilleri korunur. Üretim provenance'ı `halo:false` ve kullanıcı isteğini açıkça kaydeder; üç araç SHA256'ı yenilenir.

Halosuz görünüm kullanıcıya özel özgün bir görsel tercihtir; güncel düzenlemelere uygun bir F1 güvenlik modeli veya doğrulanmış takım kopyası olarak sunulmaz. Yeni dış model/doku ve yeni lisans gerektiren varlık yoktur. Çevre/HDRI lisans kayıtları değişmedi.

## 4. Aynı kamera ve ışıkla gerçek görüntüler

[15 eş çift / 30 gerçek uygulama ekran görüntüsü](visual/v71/README.md): ön üç çeyrek, yan, arka üç çeyrek, lastik/süspansiyon, takip, üç LOD, COTA yokuşu, Spa Raidillon, üç pistin kokpiti ve iki prosedürel yedek görünümü. Önce gerçek V8 main arşivi, sonra V7.1 çalıştırılır; V8 efekti kapatılıp sahte 'önce' üretilmedi. Her pist tam sayfa yüklenir, event ve kaynak metadata'sı doğrulanır.

13 GLB çiftinde zaman, kamera konumu, projeksiyon, güneş, exposure, çizim tamponu, LOD, kalite, hareket örneği, tur süreleri ve arazi kaynağı JSON'da **birebir eşittir**. Ultra, 1440×1000 viewport, DPR 1, adaptif çözünürlük kapalı; Chromium `156.0.8078.79`. Yedek çiftlerinde kamera/ışık/zaman/tampon da aynıdır; GLB istekleri bilerek engellenmiştir. Yapay/generatif görüntü veya rötuş kullanılmadı. [Eş görüntü kayıtları](performance/v71/matched-views.json), [fallback kayıtları](performance/v71/fallback-views.json), [JPEG SHA256](visual/v71/image-sha256.json).

Near ölçümü, görünür araç mesh'lerinin viewport içindeki near-plane kesişen üçgenlerini sayar. Görünür ebeveyn, layer, indeks/drawRange ve dünya dönüşümü hesaba katılır. Bu bir piksel görünürlük, gölge, FPS veya bütün kamera hareketlerinde kusursuzluk garantisi değildir. Analiz görüntüden sonra yapılır; uygulama runtime'ına eklenmedi. Ölçüm yardımcı fonksiyonu bilinen kesişme, viewport dışı, gizli ebeveyn, layer, indeks ve dönüşüm örnekleriyle iki birim testinde sınandı.

| Kokpit | Main near kesişmesi | V7.1 |
|---|---:|---:|
| Meksika GLB |66|0|
| COTA GLB |14|0|
| Spa GLB |11|0|
| Prosedürel yedek |14|0|

13 karede 52 son araç-A destek noktası gerçek çizilen asfalt üzerinde 1.999562…2.000642 mm aralığında; önce/sonra en büyük fark 0.000000000000 m. Bunlar V8'in dört destek proxy'sidir, dönen lastiğin her vertex'i veya fiziksel temas yaması değildir. COTA başlangıcında ghost araçlar birbirine yakın olduğundan örtüşebilir. Arazi/merkez çizgisi/banking belirsizliği değişmedi.

## 5. V7 bütçesiyle karşılaştırma

V8, V7 GLB'lerini değiştirmediği için bu tablo V7 ve güncel V8 main varlıklarına aynı referansı kullanır:

| LOD | Üçgen önce → sonra | Accessor byte önce → sonra | GLB byte önce → sonra | Mesh primi |
|---|---:|---:|---:|---:|
| high | 32264 → 31068 | 448580 → 427264 | 276916 → 266280 | 22 → 22 |
| medium | 27264 → 26068 | 406092 → 384776 | 255352 → 244884 | 22 → 22 |
| low | 12524 → 11640 | 179540 → 163496 | 132232 → 123776 | 22 → 22 |

[Ham bütçe](performance/v71/asset-budgets.json). Accessor byte typed-array toplamıdır; fiziksel GPU VRAM ölçümü değildir. Yakın LOD için poligon veya shader geçişi eklenmedi. Fallback gövdesi aynı segment sayısını korur; halo tüpünün üçgenleri çıkarıldı.

| Eş kare | Çağrı önce → sonra | Çizilen üçgen önce → sonra | Near kesişmesi önce → sonra |
|---|---:|---:|---:|
| 01-front-three-quarter | 360 → 360 | 1415283 → 1411695 | 0 → 0 |
| 02-side-profile | 304 → 304 | 1280850 → 1277262 | 0 → 0 |
| 03-rear-three-quarter | 443 → 443 | 1764200 → 1759416 | 0 → 0 |
| 04-tyre-suspension | 357 → 357 | 1424641 → 1421053 | 0 → 0 |
| 05-cockpit | 404 → 404 | 1790824 → 1786040 | 66 → 0 |
| 06-cota-climb | 112 → 112 | 303350 → 298566 | 0 → 0 |
| 12-cota-cockpit | 92 → 92 | 288262 → 283478 | 14 → 0 |
| 07-spa-raidillon | 154 → 154 | 400066 → 395282 | 0 → 0 |
| 13-spa-cockpit | 159 → 159 | 404862 → 400078 | 11 → 0 |
| 08-lod-low | 280 → 280 | 841582 → 840698 | 0 → 0 |
| 09-lod-medium | 280 → 280 | 856322 → 855126 | 0 → 0 |
| 10-lod-high | 280 → 280 | 861322 → 860126 | 0 → 0 |
| 11-follow | 416 → 416 | 1712812 → 1708028 | 0 → 0 |

Tam sahne çağrı/üçgen değerleri gölge ve görünürlüğü içerir. Eş GLB karelerinde çağrı sayısı artmadı, üçgenler azaldı. Fallback kokpitte çağrı 204→204, üçgen 303828→303108; aynı native kamera kullanılır. Bu sabit sahne sayaçları FPS kazancı veya p95 kabulü değildir.

## 6. Korunan veriler ve V8

22 dosyanın SHA256'ı başlangıçla aynı: kaynak topografya/provenance, replay/analiz çekirdekleri ve ayrıca `vehicle-motion.js`, `ghost-vehicle-motion.js`, yüzey adaptörü, varlık yükleyicisi, kamera çarpışması ve bariyer gruplaması. [Hash kayıtları](performance/v71/protected-sha256.json). Mevcut test dosyaları ve eşikleri değiştirilmedi.

V8 hareket tabloları, görsel pitch/roll/direksiyon ve asfalt üçgeni fit sistemi aynen kaldı. Son tam tur V8 testlerinde kök ve tekerlek matris hata değerleri Meksika/COTA/Spa için 0; asfalt indeks miss sayıları 0. Meksika HAM 76.651 / RUS 76.356 / bitiş farkı −0.295 s ve veri fingerprint'leri korunur. Yeni süspansiyon fiziği, pist veya çevre dekorasyonu eklenmedi.

## 7. Son düzeltmeden sonra tam regresyon

Temiz `npm ci`, ardından `npm run test:unit` ve `TEST_PORT=4396 npx playwright test --config=docs/performance/v71/isolated-browser.config.cjs`: **63/63 birim, 36/36 Chromium, sıfır atlama/retry/başarısızlık**. Başlangıç main'deki 60+34 test korunur; ek 3 birim +2 tarayıcı testi var. [Tam kayıt](performance/v71/regression.txt), [test edilen kaynak/hash](performance/v71/tested-source.json).

İlk ortak-tarayıcı tam koşusu **33/36 geçti, 3 başarısız oldu**: Meksika soak testinde geçici harici font CORS hatası, COTA hareket ve yeni GLB denetiminde test gövdesinden önce context fixture açılış zaman aşımı. [İlk tam koşu](performance/v71/first-full-run.txt), [özet](performance/v71/first-full-summary.json) korunur. Aynı kodla bu üç test ayrı yeni tarayıcılarda **3/3 geçti**: [soak](performance/v71/recheck-soak.txt), [COTA](performance/v71/recheck-cota.txt), [görsel](performance/v71/recheck-visual.txt). Font yeniden isteğinde HTTP200 ve `Access-Control-Allow-Origin: *` döndü; font engelleme, sahte yanıt veya CORS kapatma kullanılmadı. Bir ara yanlış grep ile sıfır test seçen komut hata verdi; [kayıt](performance/v71/recheck-command-error.txt) test sonucu sayılmadı.

Son tam koşuda her senaryo ayrı Playwright proje/worker ve Chromium örneğinde çalıştırıldı. **36 senaryonun tamamı**, özgün test gövdeleri, süre sınırları, eşikler ve beklenen durumlarıyla yeniden koşuldu; retry/atlama yok. [İzolasyon yapılandırması](performance/v71/isolated-browser.config.cjs), [36 test planı](performance/v71/isolated-test-plan.json), [plan eşitliği ve hash](performance/v71/isolated-plan-verification.json). Mevcut `playwright.config.js` değiştirilmedi. Chrome cache/config dizinleri yazılabilir çalışma alanına `XDG_CACHE_HOME` ve `XDG_CONFIG_HOME` ile yönlendirildi. Bu sonuç ortak-tarayıcı koşusundaki hataları gizlemez; son kabulün izolasyon koşulunu açıklar.

Yeni GLB kontrolü üç pistte 10/50 s örneklerinde, üç LOD ve takip dönüşünde near kesişmesini, mevcut kamera planını, görünür baş/vizörü, telemetri fingerprint'ini ve V8 cache varlığını doğrular. Fallback testi gerçek GLB yükleme başarısızlığını kullanır; halo hacminde vertex kalmadığını, near kesişmesinin0 olduğunu ve oynatmanın sürdüğünü denetler. [GLB denetimi](performance/v71/vehicle-visual-audit.json), [fallback](performance/v71/vehicle-visual-fallback.json).

İlk hedefli koşuda GLB testi geçti, fallback testi 14 kesişmeyle başarısız oldu. [İlk hata](performance/v71/initial-fallback-failure.txt) korunur. Motor kapağı düzeltildikten sonra aynı sıfır-kesişme eşiğiyle hedefli test ve tüm suite yeniden geçti: [düzeltilmiş koşu](performance/v71/fallback-fixed.txt). Eşik gevşetilmedi ve başarısız ilk koşu kabul sonucu diye kullanılmadı.

Mevcut GLB/JPEG/prosedürel yedek, WebGL fallback, otomatik LOD, lastik dönüşü/direksiyon, tam Meksika turu, mobil, Veri Stüdyosu, COTA/Spa temas ve kamera testleri geçti. 120 saniye COTA/sentetik/Meksika ve V8 cache/heap testleri dahildir. COTA geometri 133→133, doku 11→11. V8 cache testinde renderer/geometri/doku ve aynı tablo/indeks/fit nesneleri korundu; GC sonrası heap artışı 376196 byte. Bunlar sınırsız süreli sızıntısızlık veya VRAM garantisi değildir. Mevcut soak hızları 0.25/0.5× ve Meksika 4× olarak korunur; FPS karşılaştırması için kullanılmaz.

## 8. Açık kabul maddeleri

| Madde | Durum |
|---|---|
| Halo kaldırma, fallback kesilmesi, veri/V8 korunumu ve tam işlevsel regresyon | Geçti |
| Aynı yapısal geometri/çağrı/indirme bütçesi | Aşılmadı |
| Fiziksel NVIDIA V7.1 FPS/p95/VRAM karşılaştırması | Ölçülemedi; kabul verilmedi |
| V6.1 NVIDIA ≤%10 FPS kaybı hedefi | Ayrı açık borç |
| Öznel silüet/PBR/halosuz görünüm | Bağımsız incelemeye bırakıldı |

Bu ortamda `/dev/dri`, NVIDIA aygıtı ve `nvidia-smi` yok. Gerçek renderer: `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)`. Eski fiziksel NVIDIA işlevsel kayıtları bu çalışmanın FPS ölçümü yerine konmadı. V6.1 tarihsel Spa Ultra takip/kokpit kayıpları %11.65/%19.93 olarak korunur; bunlar V7.1 kaybı değildir. Halo kaldırmak veya V8'in main'e alınmış olması o kabul borcunu kapatmaz. [Donanım/kabul kaydı](performance/v71/hardware-and-acceptance.json), [V6.1 raporu](V6-1-PERFORMANS-OPTIMIZASYONU.md), [V8 sınırları](ARAC-HAREKET-V8.md).

Yeni fiziksel karşılaştırma aynı GPU/driver/güç koşulları, DPR/tampon, kalite, kamera, zaman, hız ve dengeli tekrarlarla güncel baseline ad35d61'e karşı yapılmalıdır. Önceki V5/V6/V6.1 kabul deneyi ayrı tutulmalıdır. Kaynak veriyi veya kaliteyi değiştirerek hedef geçmiş gibi gösterilmedi.

## 9. Çalıştırma / tekrar üretim

```bash
npm ci
npm run serve
# http://localhost:4173
```

Hazır GLB'ler depodadır. Sanat kaynağı için `npm run assets:build` (Blender 4.3.2), standart test komutu `npm test`. Bu teslimin son kabul koşusu yukarıdaki ayrı-tarayıcı yapılandırmasıyla yapılmıştır. Aynı kareleri üretmek için iki sunucuda baseline/V7.1 çalıştırıp `node scripts/capture-v71.cjs URL OUTDIR`; yedek için `node scripts/capture-fallback-v71.cjs URL OUTDIR` kullanılır. [Blender üretim/reopen](performance/v71/blender-build.txt), [üretim açıklaması](../art/blender/README.md), [galeri](visual/v71/README.md).

**Main'e birleştirme veya canlı site dağıtımı yapılmadı. Yeni V7.1 PR'ı bağımsız inceleme içindir; birleştirilmiş PR #11 tarihsel referans olarak korunur.**
