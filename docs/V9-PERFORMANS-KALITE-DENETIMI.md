> Güncel fiziksel NVIDIA devam denetimi: [738 pencerelik rapor](V9-NVIDIA-FIZIKSEL-DOGRULAMA.md). Aşağıdaki önceki yazılımsal denetim ve başarısızlık kayıtları tarihsel kanıt olarak korunur.

# V9 — Performans, görsel kalite ve sistem kararlılığı denetimi

## 1. Yönetici özeti

**Fiziksel NVIDIA performans kabulü: DOĞRULANAMADI. Tarihsel Spa %11,65 / %19,93 kaybının kapandığı doğrulanmadı. PR taslak; main’e birleştirme ve canlı dağıtım yok.**

V9, güncel main `ad35d61f5b26ed1d5ff6d82a3ee43b91478cee94` üzerine `audit/v9-performance-quality` dalında çalışır. PR #13 başlangıçta açık ve birleştirilmemişti; V7.1 **ayrı commit/uygulama olarak** denetlendi. V7.1 GLB, Blender ve kokpit değişiklikleri V9’a taşınmadı. V8 korunur. 79 uygulama/varlık dosyası ve mevcut 23 test dosyası başlangıçla byte düzeyinde aynıdır.

Son birim testleri **70/70**. Main tam Chromium sonucu **BAŞARISIZ**, ayrı V7.1 sonucu **BAŞARISIZ**. Aşağıdaki regresyon bölümü gerçek sayıları ve koşulları açıklar. Fiziksel GPU bulunmadığı için fiziksel FPS/GPU zamanı/VRAM sonucu üretilmedi. 40 gerçek görüntü, öncelikli 12 yazılımsal sahne sayacı ve üç pistte beş tekrarlı CPU tanısı ayrı kanıtlardır.

## 2. İncelenen commit’ler ve sistem envanteri

| Sürüm | Doğrulanan commit | Git konusu |
|---|---|---|
| v5 | `a237ca529b31bd769df90165c62f73cdef54a672` | Merge PR #9: audited V5 topography and surface-aligned replay |
| v6 | `f295c01a8984715334363077fb66ccaad522e246` | docs: publish final V6 benchmark evidence and failed performance gate |
| v61 | `e5ffd2224bb3ee2dceed9ee2470bc6f6da33fc74` | Merge V6.1 derived terrain and barrier optimizations |
| v7 | `0d5deecee432230bb1d84c77cc2bd92553358922` | Merge V7 original car visuals and optimized LOD assets |
| v8 | `ad35d61f5b26ed1d5ff6d82a3ee43b91478cee94` | Merge V8 telemetry-derived vehicle visual motion |
| v71 | `5bb2995e20fe45e6af76a23e997915b3202965da` | Document V7.1 visual audit with matched screenshots and complete isolated regression evidence |

Test edilen son kaynak commit’i yerel `cfd0eb6f3be3f5d8240d58f1128e8b671211ff9e`, eş GitHub commit’i `6aa84d2a9a4b12a7fb6d0aab47e7cf8226b85947`; ağaç `c8ca5dce17a15898c793b4d60bca2c28c4e85f42`. API commit metadata’sı farklıdır, her ağaç birebir karşılaştırıldı: [eşleme](performance/v9/publication.json), [kaynak manifesti](performance/v9/tested-source.json). Son belge commit’i uygulama/test/ölçüm kodunu değiştirmez.

V6 referansı, V6.1 raporu ve Git nesnesinden doğrulanan ilk V6 PR başıdır; V5 ile karıştırılmadı. Main/V7.1 bağımlılıkları birleştirilmedi. [Nesne/ağaç/varlık envanteri](performance/v9/inventory.json), [sabit referanslar](../scripts/v9-versions.json).

| Sistem | İncelenen uygulama / mevcut davranış | Değerlendirme |
|---|---|---|
| Renderer/kalite | `src/ghost-webgl.js`, `src/ghost-director.js`; Performans .85, gölge kapalı; Dengeli 1.25/1024; Ultra 1.5/2048, DPR ile sınırlı | Profiller değiştirilmedi. Gerçek tampon her ölçümde kaydedilir. |
| Pist/topografya | `ghost-topography.js`, `track-topography.js`, `real-topography.js`, `assets/topography/` | COTA USGS/Spa SPW türetilmiş arazi; ölçülmüş asfalt/banking doğruluğu iddiası yok. Meksika gerçek veri kaynağı korunur. |
| Bariyer çizimi/sorgu | `barrier-batching.js`, `camera-collision.js` | Gerçek profillerde 512 m çizim paketleri; 128 m sorgu aralıkları, aynı üçgen dar fazı. |
| GLB/LOD | `visual-assets.js`, `assets/v4/car-*.glb`, `build_v7.py` | Üç LOD, Meshopt, ortak geometri ve araç başına materyal kopyaları. Ultra<35 m yüksek, <80 m orta; Performans düşük. |
| PBR/ışık/gölge | Boya/karbon/kauçuk/metal, yol normal/roughness, PMREM ve yönlü ışık | AO isteğe bağlı. Sabit harita ve profiller korundu; kalite azaltılarak kazanç gösterilmedi. |
| V8 hareket | `vehicle-motion.js`, `ghost-vehicle-motion.js` | Replay zamanı tablosu, görsel pitch/roll/direksiyon; gerçek süspansiyon çözümü değildir. |
| Asfalt indeksi | `VehicleMotion.roadSurface` ve `ghostFitVisualTyres` | Dünya başına 8 m grid; dört destek için iki yükseklik iterasyonu, ±.06 m görsel fit. |
| Kameralar | `ghostPlanCameraPose`, topografya adaptörü, GhostDirector | Takip/kokpit/serbest; kokpit near .5 m korunur. |
| Veri/oynatma | `replay-core.js`, `insight-core.js`, `insight-lab.js`, `index.html` | Gerçek zaman saati, seek/rate ve Veri Stüdyosu; hesap değişikliği yok. |
| Kaynak yaşamı | `ghostDisposeWorld`, `VisualAssets.dispose`, `GhostDirector.dispose` | Dünya ile varlık template/texture yaşamı ayrıdır; pagehide ve bağlam hatası yolları incelendi. |
| Mobil/yüksek DPI | Mevcut mobil ve high-dpi senaryoları | Bu ortamda emülasyon/SwiftShader; fiziksel mobil GPU kabulü değildir. |

## 3. Donanım ve renderer doğrulaması

Linux `6.18.57` / `x64`; Chromium `156.0.8078.79`. **Varsayılan donanım isteği de, açık yazılım seçimi de SwiftShader** döndürdü. Varsayılan renderer: `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)`. `/dev/dri`, `/dev/nvidia0` yok; `nvidia-smi` bulunamadı. `lspci` de kurulu değil; PCI modeli uydurulmadı.

GPU modeli/sürücüsü/güç profili/P-state/sıcaklık/fiziksel ekran çözünürlüğü **DOĞRULANAMADI**. Probdaki1920×1080 `screen`/viewport, başsız tarayıcının emüle ekranıdır; bağlı fiziksel monitör kanıtı değildir. DPR1 açıkça ayarlanır. Sahne kayıtlarında kalite/adaptif/tampon ayrıca doğrulanır. Yazılımsal Vulkan cihazı fiziksel GPU sayılmadı.

[Ham prob](performance/v9/hardware.json). [Gerçek fiziksel ölçüm denemesi](performance/v9/physical-attempt.json) kod 2 ile **FPS toplamadan** durur; bu bir uygulama testi başarısızlığı değil, kabul engelidir. GPU kimliği, sürücü, sanallaştırma modu, tek GPU ve güç profili doğrulanmadan `--run` ölçüme başlamaz.

## 4. Performans test matrisi

Üç pist × iki kamera × iki çözünürlük × iki kalite = **24 koşul**. Altı sürüm × beş tekrar ile **720 fiziksel ölçüm penceresi** planlandı. Minimum 20 s ısınma + 12 s gözlem; sürüm sırası döndürülür. Beş kontrollü tekrar koşulu azaltılmaz.

| Kapsam | Plan | Bu ortamda yapılan | Karar |
|---|---:|---:|---|
| Fiziksel FPS/medyan/p95/p99,1440p/1080p,Ultra/Performans |720 pencere|0|DOĞRULANAMADI|
| Öncelikli Spa1440p Ultra takip/kokpit statik sayaçları |6 sürüm ×2 kamera|12|GEÇTİ — yalnız yazılımsal sayaç toplama|
| Üç pist CPU işlemleri |5×1200 örnek/pist|3 pist|GEÇTİ — tanı, FPS kabulü değil|
| Main/V7.1 eş görsel |20 çift|20 çift /40 JPEG|GEÇTİ — gerçek görüntü üretimi|

[Plan ve bütün kalan koşullar](performance/v9/matrix.json), [120 karşılaştırmanın açık durumu](performance/v9/comparisons.json). Fiziksel matriste tek bir hücre bile tamamlanmış sayılmadı. Öncelik sayaçları tek statik kareden alınır;5 tekrar FPS yerine konmaz. `timing=null`. Diğer pist/kalite/çözünürlüklerin altı sürümlü sayaçları bu çalışmada yeniden ölçülmedi; eski tablolar yeni ölçüm gibi sunulmadı.

Çalıştırıcı yerel profilleri **aynen** korur.1080p/1440p, viewport’u belirtir; gerçek drawing buffer ayrı kaydedilir. DPR1’de Performans .85 nedeniyle daha küçük tampon kullanır. Aynı koşul karşılaştırması tamponlar eşit değilse reddedilir. Bu yerel-profil deneyi, eski renderRatio1/adaptif-AO kapalı/uncapped V6 deneyinin aynısı değildir; tarihsel borcu tek başına kapatamaz. Eski deneyin sabitleri ve aynı fiziksel cihazla ayrı kontrollü tekrar gerekir.

## 5. Önceki sürümlerle karşılaştırma

Aşağıdaki Git nesne ölçümleri GLB üçgen/indirme boyutudur, çizilen sahne bütçesi veya VRAM değildir:

| Sürüm | Yüksek üçgen /byte | Orta üçgen /byte | Düşük üçgen /byte |
|---|---:|---:|---:|
| v5 | 59498 / 492552 | 40586 / 359992 | 14606 / 151832 |
| v6 | 59498 / 492552 | 40586 / 359992 | 14606 / 151832 |
| v61 | 59498 / 492552 | 40586 / 359992 | 14606 / 151832 |
| v7 | 32264 / 276916 | 27264 / 255352 | 12524 / 132232 |
| v8 | 32264 / 276916 | 27264 / 255352 | 12524 / 132232 |
| v71 | 31068 / 266280 | 26068 / 244884 | 11640 / 123776 |

Öncelikli yeni yazılımsal sayaçlar:

| Sürüm | Kamera | Gerçek tampon | Draw call | Çizilen üçgen |
|---|---|---|---:|---:|
| v5 | a | [2560, 1440] | 124 | 223344 |
| v6 | a | [2560, 1440] | 161 | 454412 |
| v61 | a | [2560, 1440] | 135 | 464480 |
| v7 | a | [2560, 1440] | 120 | 372446 |
| v8 | a | [2560, 1440] | 120 | 372446 |
| v71 | a | [2560, 1440] | 120 | 368858 |
| v5 | cockpit | [2560, 1440] | 111 | 209260 |
| v6 | cockpit | [2560, 1440] | 148 | 440328 |
| v61 | cockpit | [2560, 1440] | 122 | 450396 |
| v7 | cockpit | [2560, 1440] | 109 | 364642 |
| v8 | cockpit | [2560, 1440] | 109 | 364642 |
| v71 | cockpit | [2560, 1440] | 109 | 361054 |

[Ham öncelikli sayaçlar](performance/v9/priority-counters.json). V5’in COTA/Spa sahnesi düz, V6 ve sonrası türetilmiş arazidir; araç/çevre sürümleri de değişmiştir. Bu yüzden aynı sahne maliyetinin saf nedensel FPS karşılaştırması iddia edilmez.

Tarihsel RTX5060 Laptop/Windows D3D11/621.14/Chrome157 kaydı: Spa1440p Ultra takip **668.5→590.7 FPS, %11.65 kayıp, p95 1.90→3.85 ms**; kokpit **681.2→545.4 FPS, %19.93 kayıp, p95 2.00→2.65 ms**. Bunlar eski V6 sonuçlarıdır, yeni ölçüm değildir. V6.1/V7/V8/V7.1’de çözüldüğü varsayılmadı. [Tarihsel kaynak](performance/v6/TEKRARLAR.md). Arşivdeki `final-matrix.json` + `rechecks.json` verisinden medyanlar bağımsız yeniden hesaplandı: kayıplar %11.6488698943 ve %19.9332408297, saklanan özetle eşit. Her grupta **dört pencere** var; V9’un en az beş tekrar şartını karşılamıyor. Geçmiş host bugün yeniden doğrulanmadı. [Ham yeniden hesap/hash](performance/v9/historical-recalculation.json), [tekrar betiği](../scripts/check-v9-history.cjs).

## 6. Bulunan darboğazlar ve ölçüm sınırları

Gerçek fiziksel GPU darboğazı bu ortamda izole edilemedi. Yazılımsal sürücü beklemesini NVIDIA süresi diye adlandırmıyoruz. V8 tablo/asfalt indeksinin bilerek soğuk yeniden üretimi, ısınmış iki araçlık CPU işlemleri, kamera çarpışması ve matris güncellemesi ayrı ölçüldü.

| Pist | Hareket | Yüzey desteği | Lastik fit | Matrisler | Kamera sorgu |
|---|---:|---:|---:|---:|---:|
| spa | 2.000 | 93.200 | 48.340 | 80.140 | 48.060 |
| cota | 1.480 | 85.900 | 73.800 | 125.880 | 68.200 |
| mexico | 2.080 | 2.160 | 11.060 | 199.660 | 1127.240 |

Birim:1200 örnekli bir tekrarın beş tekrar üzerindeki ortalama **toplam ms** değeri. Bu sayılar FPS/kare bütçesi değildir. `performance.now` kuantizasyonu ve probe maliyeti nedeniyle sıfırlar korunur. Her işlem farklı kapsamda/iç içe olabilir; toplamlar birleşik frame süresi sayılmaz. Çizim kuyrukları ölçümden önce `gl.finish()` ile boşaltılır; sıcak CPU döngüsünde render çağrılmaz.

[Ham CPU tanısı](performance/v9/cpu-diagnostic.json): zorla soğuk build süreleri, beş tekrarın dağılımları, cache kimlikleri ve misses kaydedilir. Zorla geçersiz kılınan cache’lerin zamanı normal uygulama başlangıcı veya sürekli oynatma gecikmesi değildir. Tablo/index tekrar kurulumunun sürekli oynatmada bir darboğaz olduğu gözlenmedi; mevcut cache soak ayrıca denetler.

## 7. Yapılan düzeltmeler ve optimizasyon kararı

**Uygulama runtime’ında optimizasyon yapılmadı.** Ölçülmüş fiziksel regresyon veya doğrulanmış sıcak CPU düzeltme kazancı yokken çözünürlük, poligon, gölge, ışık ya da PBR azaltmak için gerekçe bulunmadı. Bilinen main kokpit sorunu ayrı PR #13’te ele alınmış olduğundan V9’a kontrolsüz kopyalanmadı.

Ölçüm altyapısı iyileştirildi: fiziksel/sanal/yazılım ayrımı; yanlış/eksik koşullarda karşılaştırmayı reddetme; beş tekrar; GPU/VRAM desteklenmiyorsa `null`; zamanlayıcı destekleniyorsa yalnız yeni sorgular, disjoint filtreleme ve tekrar/önceki pencere sonuçlarını dışlama; gerçek renderer/tampon/telemetri kaydı. Yalnız tamamlanan kare aralıklarını ortalamak son sürücü takılmasını dışarıda bırakabilir. Yeni araç tam gözlem penceresi FPS’ini kullanır, tamamlanan aralık ortalamasını ayrı tutar ve tamamlanmamış kuyruk süresini raporlar. p95/p99 yalnız tamamlanan aralıklardır; sansürlenen son kuyruk gizlenmez.

Bu davranışlar on yeni birim testiyle sınandı. Gerçek Chromium/WebGL üzerinde değişmeyen uygulama query sağlayıcısıyla küçük clear iş yükü entegrasyonu da ayrı kontrol edilir: [ham probe](performance/v9/gpu-sampler-check.json). Bu küçük yazılımsal iş yükü tam sahne veya fiziksel NVIDIA GPU zamanı değildir. Fixture FPS/GPU adları sentetiktir; gerçek ölçüm diye raporlanmaz. FPS kaybı eşiği **%10** olarak korunur. FPS eşiği geçse bile p95/p99, güç/termal/arka plan değerlendirmesi olmadan genel durum GEÇTİ olmaz.

## 8. Önce/sonra ölçümleri

V9 runtime önce/sonra byte’ları aynıdır; bu nedenle yeni uygulama FPS kazancı iddiası yoktur. Yeni sahne sayaçlarında V8/V7.1 karşılaştırması ayrı yapılır; halo farkı aynı kamera/ışıkta gösterilir. Fiziksel FPS öncesi/sonrası **DOĞRULANAMADI**. Test kalitesini veya görsel ayrıntıyı düşüren bir değişiklik yapılmadı.

## 9. Görsel denetim bulguları

[20 eş çift /40 gerçek Chromium görüntüsü](visual/v9/README.md), [ham metadata](visual/v9/captures.json), [SHA256](visual/v9/image-sha256.json). Meksika frenleme/hızlanma/viraj merkezinin ±.25 s çevresi; COTA Turn1 ve Spa Raidillon yokuşu, kokpit/takip; aynı açıyla üç LOD. Zaman, kök poz, destek, V8 hareketi, kamera/projeksiyon, ışık, exposure, gerçek tampon, kaynak ve tur süreleri birebir karşılaştırıldı. V9 runtime değiştirilmediği için bu V9 optimizasyonu öncesi/sonrası değildir; main ile ayrı V7.1’in karşılaştırmasıdır.

- **BAŞARISIZ — Main kokpit yakın düzlem görünümü:** Meksika kokpitinde büyük siyah halo kirişi görüşü kapatıyor; Spa kokpitinin alt merkezinde küçük siyah kesilme görüldü. Üç pistte66/14/11 near kesişmesi kaydedildi. Ayrı PR #13 bu görünümü düzeltir; V9 main uygulamasına taşımadı.
- **GEÇTİ — Ayrı V7.1 halosuz kokpit örnekleri:** Aynı kamera ve ışıkta görüşü kapatan parça/kesilme görünmüyor; üç pistte near kesişmesi0. Kullanıcı isteğine bağlı tasarım; fiziksel güvenlik veya güncel takım replikası kabulü değildir.
- **GEÇTİ — Örneklenen lastik-asfalt desteği:** Yakın planda ve iki yokuş görünümünde belirgin havada kalma görülmedi. İki araçta dört destek proxy’si bütün karelerde1.99956–2.00064 mm aralığında. Dönen lastiğin her vertex’i ve gerçek temas yaması sınanmış sayılmaz. COTA’da iki ghost yakın olduğu için gövdeler örtüşüyor.
- **GEÇTİ — PBR varlık yükleme ve örnek yüzey görünümü:** Kauçuk, boya ve metal yüzey ayrımı ile yansımalar görünüyor; örneklerde yeni belirgin gölgelenme kopması görülmedi. HDR hazır, KTX2 color/normal/roughness,2048 gölge, environmentIntensity0.6, AO ve saydamlık kapalı; iki sürümde eşit, varlık hatası yok. Fotometrik malzeme doğruluğu veya fotogerçekçilik kanıtı değildir.
- **GEÇTİ — Üç LOD sabit açıda hizalama:** Düşük LOD’da beklenen faceting ve detay kaybı var; tekerlek/gövde konumlarında örneklerde belirgin kopma görülmedi. Otomatik seçim testi iki sürümde de geçti.
- **DOĞRULANAMADI — Hareket halinde algısal kamera/LOD akıcılığı:** ±.25 s frenleme/hızlanma/viraj kareleri ve mevcut matematiksel süreklilik testleri vardır; sürekli fiziksel GPU video/FPS kaydı yok. Stillerden her anda titremesiz oynatma veya algısız LOD geçişi sonucu çıkarılmadı.
- **DOĞRULANAMADI — Gerçek süspansiyon ve bütün pozlarda bağlantılar:** Sert görsel bağlantılar örnek yakın planda gövde/tekerleklerle aynı sahnede yer alıyor. V8’in sınırlı pitch/roll modeli gerçek süspansiyon çözümü değildir; tüm hareketlerde kusursuz bağlantı kinematiği onaylanmadı.

| Kokpit sahnesi | Main near kesişen üçgen | Ayrı V7.1 |
|---|---:|---:|
| Mexico City Grand Prix | 66 | 0 |
| United States Grand Prix | 14 | 0 |
| Belgian Grand Prix | 11 | 0 |

Near-plane yardımcı kodu PR #13’ün test yardımcısından **açıkça yeniden kullanılan analiz aracıdır**, V7.1 araç/runtime değişikliği değildir. Çizilen araca yakın düzlem kesişmesini viewport/visibility/layer ile sayar; piksel örtüşmesi, gölge doğruluğu veya her kamera açısında kusursuzluk kanıtı değildir. Yeni görüntüler yalnız bu sayaca dayanarak değerlendirilmedi; görseller ayrıca incelendi. [İnsan denetim notları](performance/v9/visual-review.json).

Asfalt raycast kayıtları dört destek proxy’sini iki araçta denetler. Desteğin asfaltla uyumu, dönen lastiğin her vertex’i veya gerçek temas yaması değildir. Üç ardışık kare her olası zaman/kamera durumunda sıçrama olmadığını ispatlamaz. LOD düşükte ayrıntı azalması beklenir; ani otomatik seçim mevcut testte ayrıca sınanır.

## 10. Telemetri ve veri bütünlüğü

Meksika **HAM 76.651 s / RUS 76.356 s / fark −0.295 s** korunur. Gerçek tarayıcı tam tur ve V8 hareket testleri zaman, kök poz, ilerleme, kanallar, delta ve kamera davranışını kontrol eder. Veri Stüdyosu çoklu tur, teori, filtre ve grafik testleri korunur. Görsel hareket replay verisini değiştirmez.

[79 dosya SHA256](performance/v9/inventory.json): `index.html`, bütün `src/` ve `assets/`; telemetri/replay/analiz algoritmaları, pist/provenance ve lisanslar aynı. Yeni CPU tanısı kendi gerçek veri fingerprint’ini önce/sonra karşılaştırır. V7.1’de beklenen varlık farkları ayrıca listelidir ve V9’a ithal edilmedi. Dış telemetri arşivinin içeriği depoda olmayan kısmı için repo hash’i varmış gibi iddia edilmez; gerçek yüklenen kanallar ve süreler tarayıcıda sınanır.

## 11. Regresyon testleri ve ilk hatalar

- Son birim koşusu: **70 geçti /0 başarısız /0 atlama**; main’in 60 testi +10 ölçüm testi. [Son birim](performance/v9/unit-final.txt).
- Main tam özgün Playwright yapılandırması: **BAŞARISIZ** — 33 geçti / 1 başarısız, 34 senaryo. [Tam kayıt](performance/v9/main-regression-first.txt).
- Ayrı PR #13 commit’i: **BAŞARISIZ** — 34 geçti / 2 başarısız; 63 birim + 36 Chromium senaryosu. [Tam kayıt](performance/v9/v71-regression-first.txt).
- Testler özgün yapılandırma, timeout, assertion ve eşiklerle; tek worker, SwiftShader, yazılabilir XDG cache/config. Mevcut test dosyaları veya `playwright.config.js` değiştirilmedi. İşlevsel testler ölçüm testleriyle/GPU testleriyle karıştırılmadı. Ham işlevsel kayıtlardaki FPS/GPU alanları SwiftShader tanısıdır; kontrollü fiziksel performans penceresi olarak sayılmaz.

Main ilk tam koşusunda COTA V8 senaryosu, test gövdesi başlamadan `browser.newContext` fixture’ında 180000 ms zaman aşımına uğradı. Kayıtta GPU `SharedImageManager::ProduceSkia ... non-existent mailbox` ve sandbox OOM-score yazma hataları var. Bu gözlem uygulama assertion hatası değildir; tek başına kesin GPU sürücü kök nedeni de değildir. Test eşiği veya context süresi artırılmadı. Yeni Chromium ile aynı COTA testinin yeniden denetimi **GEÇTİ**: [tam kayıt](performance/v9/main-cota-recheck.txt), [ham JSON](performance/v9/main-recheck-results/). Bu tekrar ilk tam ortak-tarayıcı koşusunun başarısızlığını silmez; ortak SwiftShader oturumu kararlılığı ayrı açık risk olarak kalır.

Ayrı V7.1’in ilk tam koşusunda da COTA ve yeni üç pist/LOD kokpit senaryosu gövde başlamadan aynı context fixture zaman aşımına uğradı. V7.1 COTA yeni Chromium tekrarı **GEÇTİ**, yeni GLB denetimi tekrarı **GEÇTİ**: [COTA kayıt](performance/v9/v71-cota-recheck.txt), [GLB kayıt](performance/v9/v71-visual-recheck.txt), [yeniden test JSON’ları](performance/v9/v71-recheck-results/). Bunlar tam ortak-tarayıcı koşusunu başarılıya çevirmek için kullanılmadı. Asıl düşük seviye GPU/tarayıcı kök nedeni kesinleşmedi; uygulama değiştirerek çözüldüğü iddia edilmez.

Sayaç aracının ilk koşusunda tam ekran CSS katmanı kalite/adaptif kontrolünün üstünü kapattığı için `uncheck` tıklaması zaman aşımına uğradı. Uygulama değil, ölçüm betiğinin sırası düzeltildi: kontroller sahne tam ekrana alınmadan önce ayarlanır. Değerler, çözünürlük veya kalite değiştirilmedi. [İlk hata](performance/v9/priority-counters-first-failure.txt), [ilk boş/engelli kayıt](performance/v9/priority-counters-first.json), [son tam öncelik koşusu](performance/v9/priority-counters.txt).

Görsel aracının ilk koşusunda keşif-cache hazırlığı `about:blank` üzerinde `localStorage` erişimi denedi ve üç sayfa hatası oluşturdu. Hazırlık yalnız HTTP(S) origin’inde çalışacak şekilde sınırlandı; uygulama origin’inin hataları yakalanıp bastırılmadı. [İlk hata](performance/v9/captures-first-failure.txt), [son kare kayıtları](performance/v9/captures.txt).

Görsel tekrarının ikinci koşusunda Ultra yüklemesi sırasında checkbox actionability kontrolü 30 s içinde kararlı olamadı. Görsel aracı UI tıklama testi olmadığı için aynı üç DOM kontrol değeri tek evaluate içinde ayarlanıp uygulamanın `drawAll()` işlevi çağrılır; gerçek yüksek GLB hazırlığı ve tüm render metadata doğrulamaları korunur. Tam uygulama UI testleri/timeout’ları değiştirilmedi. Son main 20 görüntüsü ilk başarısız çekimin geçerli main görüntüleriyle byte düzeyinde aynıdır: [kurulum karşılaştırması](performance/v9/capture-setup-image-identity.json). [İkinci ham hata](performance/v9/captures-second-failure.txt).

İlk yeni birim koşusunda p95 fixture’ının beklenen 91 değeri kayan nokta yuvarlamasıyla 90.999… çıktığı için kesin eşitlik testi başarısız oldu. Yeni testte 1e−10 sayısal tolerans kullanıldı; gerçek performans eşiği veya mevcut testler gevşetilmedi. [İlk hata](performance/v9/unit-first-failure.txt), [sayısal düzeltme](performance/v9/unit-float-fixed.txt), [son 70 test](performance/v9/unit-final.txt). Sonraki kontroller tam pencere FPS’i ve yeni/disjoint-safe GPU sorguları için ek fixture içerir.

Main tarayıcı koşusu başlatıldığında yeni ölçüm birimleri 67 idi; ölçüm yardımcılarına son testler eklendikten sonra 70 birim yeniden çalıştırıldı. Tarayıcı testlerinin kullandığı uygulama/varlık ve mevcut test gövdeleri süreç boyunca hiç değişmedi; hash kontrolüyle doğrulandı. [Toplu sonuç](performance/v9/regression-summary.json), [test edilen ağaç](performance/v9/tested-source.json).

## 12. Bellek ve kararlılık

Mevcut 120 saniye Meksika, COTA, sentetik yüzey ve V8 cache testleri; dur/kalk, seek/rate, kamera/kalite, Studio geçişleri, sahne disposal, mobil, GLB/JPEG ve WebGL fallback senaryoları tam suite kapsamındadır. [Main ham JSON sonuçları](performance/v9/main-results/), [V7.1 sonuçları](performance/v9/v71-results/).

COTA V8 cache testinin GC sonrası gerçek JS heap sonuçları ve renderer sayaçları:

| Sürüm | Heap byte önce → sonra | Artış byte | Renderer geometri/doku önce → sonra |
|---|---:|---:|---|
| main | 12780232 → 13157384 | 377152 | {'geometries': 115, 'textures': 10} → {'geometries': 115, 'textures': 10} |
| v71 | 12784776 → 13159780 | 375004 | {'geometries': 115, 'textures': 10} → {'geometries': 115, 'textures': 10} |

Her iki koşuda aynı hareket tabloları ve asfalt indeksi korundu. Meksika 120 s koşusunda geometri sayısı **main 223→485**, V7.1 **350→485**, doku **30→30**; son dört geometri gözlemi main **482/482/485/485**, V7.1 **485/485/485/485**. Erken artış gizlenmedi. Bu örüntü görünür alan değiştikçe tembel GPU yüklemeleriyle uyumludur; yalnız sayaçtan kesin kök neden veya sınırsız sızıntısızlık sonucu çıkmaz. İki koşunun ilk gözlem anları kontrollü FPS deneyi değildir, bu artışlardan sürümler arası bellek kazancı çıkarılmadı. [Ham özet/kaynak hash](performance/v9/resource-summary.json).

Renderer geometri/doku sayıları VRAM değildir. CDP heap, GC sonrası eğilim ve sabit cache kimlikleri ayrı göstergelerdir. Tek 120 saniyelik test sınırsız süreli sızıntısızlık, fiziksel GPU ısınma veya saatlerce kare süresi tutarlılığı kanıtı değildir. Fiziksel GPU termal/uzun çalışma etkisi **DOĞRULANAMADI**. CPU tanısındaki zorla cache yeniden kurma sayısı normal oynatma leak’i değildir.

## 13. Açık riskler

1. Fiziksel NVIDIA modeli/sürücü/güç/termal ve 720 pencere yok; %10 kayıp/p95/p99 kabulü açık.
2. Yeni native-profil koşulları eski uncapped/renderRatio1 deneyine otomatik eşdeğer değildir; tarihsel borç ayrı tekrar gerektirir.
3. Main’in halo/kokpit görünümü ile PR #13 ayrı tutulur. V7.1 görsel düzeltmesi fiziksel performans kabulü değildir.
4. Proxy teması, türetilmiş DEM ve görsel pitch/roll gerçek süspansiyon/asfalt ölçümü değildir.
5. Main’in ortak-tarayıcı tam koşusundaki context açılış zaman aşımı çözüldü diye gösterilmedi; yeni tarayıcıdaki tekrar ayrı kanıttır.
6. Harici CDN/arşiv/font erişimi test ortamını etkileyebilir; ham ilk sonuçlar korunur.
7. 120 s ve emüle mobil testleri sınırsız süre/gerçek mobil GPU kabulü değildir.

## 14. Kabul kriterleri

| Kriter | Karar |
|---|---|
| Main/V8 runtime, kaynak lisansları ve telemetri korunumu |GEÇTİ|
| Yeni ölçüm birimleri 70/70 |GEÇTİ|
| Main mevcut 34 tarayıcı senaryosu |BAŞARISIZ|
| Ayrı V7.1 mevcut 36 tarayıcı senaryosu |BAŞARISIZ|
| Main kokpit near-plane/halo görünümü |BAŞARISIZ — ayrı PR #13’te düzeltme denetlendi|
| Ayrı V7.1 örneklenen kokpit/halo düzeltmesi |GEÇTİ — görsel ve otomatik örneklerde|
| Ortak SwiftShader tarayıcı oturumunda kesintisiz tam suite |BAŞARISIZ — context açılış zaman aşımı açık|
| Üç başarısız senaryonun yeni Chromium tekrarları |GEÇTİ — ilk tam koşuları kapatmaz|
| Fiziksel NVIDIA ≤%10 FPS kaybı |DOĞRULANAMADI|
| Fiziksel p95/p99 ve uzun süreli tutarlılık |DOĞRULANAMADI|
| Güvenilir fiziksel GPU frame/VRAM |DOĞRULANAMADI|
| Main/deploy sınırı |GEÇTİ — birleştirme ve dağıtım yapılmadı|

Kabul durumları gözlemlenen kapsamla sınırlıdır; bütün uygulamaya ölçülmemiş başarı verilmez.

## 15. Entegrasyon önerisi ve yeniden üretim

**V9 taslak PR olarak bırakılmalıdır. Main’e birleştirme ve canlı dağıtım yapılmadı.** PR #13 görsel inceleme kararı ayrı verilmelidir; V9, onu otomatik birleştirmez. Tarihsel NVIDIA borcu ancak karşılaştırılabilir referansla kontrollü fiziksel tekrar ve p95/p99/ısı değerlendirmesi sonrası kapatılabilir.

```bash
npm ci
npm test
node scripts/probe-v9.cjs
node scripts/inventory-v9.cjs
node scripts/check-v9-history.cjs
node scripts/audit-v9.cjs                 # yalnız plan; ölçüm yok
node scripts/compare-v9.cjs               # gerçek örnek yoksa tamamını açık tutar
node scripts/audit-v9.cjs --run           # fiziksel kanıt yoksa kod 2, sıfır FPS örneği
```

[Gerçek test ve ölçüm komutları](performance/v9/commands.md) bütün native tam koşuları ve yeni Chromium tekrarlarını listeler.

Her sürüm için `scripts/v9-versions.json` commit’ine ayrı detached worktree kurun; `V9_ROOT_V5`, `V9_ROOT_V6`, `V9_ROOT_V61`, `V9_ROOT_V7`, `V9_ROOT_V8`, `V9_ROOT_V71` değişkenlerini verin. `V9_POWER_PROFILE` gerçek kontrol edilen profili belirtmelidir; yalnız yazılması fiziksel/termal eşitliği kanıtlamaz. `V9_FILTER` ile öncelik koşulları seçilebilir; kalan koşullar plana açıkça yazılır. `V9_REPEATS>=5`, `V9_WARMUP>=20`, `V9_SECONDS>=12`. Varsayılan süreleri azaltan çağrı reddedilir.

```bash
V9_FILTER='spa/2560/ultra' V9_OUT=docs/performance/v9/priority-counters.json node scripts/audit-v9.cjs --counters
node scripts/profile-v9.cjs http://127.0.0.1:4490 docs/performance/v9/cpu-diagnostic.json
node scripts/capture-v9.cjs http://127.0.0.1:4490 http://127.0.0.1:4491 docs/visual/v9
```

4490’da V9/main kaynakları, 4491’de ayrı PR #13 commit’i statik sunucusu çalışır (`node scripts/serve.cjs PORT ROOT`). Görsel helper yalnız analiz içindir. Yeni araçlar dış model/doku, lisans, pist veya kullanıcı özelliği eklemez. Bağımsız donanım değerlendirmesinden önce FPS kabulü tamamlandı diye sunulmamalıdır.
