# V6.1 — Spa performans optimizasyonu ve V6 kabul testleri

**Karar: performans kabulü ENGELLİ; onay verilmedi. [PR #10](https://github.com/hamitkaantokmak-jpg/tur-duellosu/pull/10) taslak kalır. Main'e birleştirilmez.**

## 1. Başlangıç ve kapsam

- V5 referansı: `a237ca529b31bd769df90165c62f73cdef54a672`.
- V6 başlangıcı / ilk PR başı: `f295c01a8984715334363077fb66ccaad522e246`.
- Çalışma dalı: `feat/v6-real-track-topography`; yeni PR açılmadı.
- Son tam test edilen kod commit'i: `551c3d1b0f580a2b6a8f2388be18b6973272a097`; ağaç `592448278b7ee0d7bf07723f3b8fadf8667691d0`. Sonraki teslim commit'i rapor, günlük ve görselleri ekler; test edilmiş runtime/varlık/test/bağımlılık içerikleri korunur. GitHub'daki eş içerikli kod commit'i: `3fd8114c84e5acf4bed13dab2585e1cb67980f8c`; ağaç SHA'sı aynıdır. [Yerel/GitHub commit eşlemesi](performance/v6-1/publication.json). Son PR başı GitHub commit geçmişinde ve PR açıklamasında kaydedilir.

V7, yeni pist, dekorasyon veya yeni kullanıcı özelliği eklenmedi. COTA USGS 3DEP ve Spa SPW MNT profilleri, lisans/metadata, ham SHA256'lar, merkez çizgileri, yükseklik/eğim/banking formülleri, telemetri ve Veri Stüdyosu hesapları değişmedi. [17 korunan dosyanın hash'i](performance/v6-1/protected-sha256.json) son toplamada tekrar doğrulandı. Asfaltın 2 m / eğimde 1 m boyuna ve 1 m enine tessellation'ı korunur. Ultra DPR/gölge/PBR/LOD parametreleri değiştirilmedi; oynatma saati yavaşlatılmadı.

## 2. Başlangıç sorunu ve ölçüm engeli

Aşağıdakiler önceki V6 tesliminin RTX 5060 Laptop / Windows ANGLE D3D11 / sürücü 621.14 / Chrome 157 ölçümleridir; bu görevde yeniden ölçülmüş NVIDIA sonuçları değildir.

| Spa 2560×1440 Ultra | Eski V5 FPS | Eski V6 FPS | Eski kayıp | Eski p95 V5→V6 | Yeni V6.1 NVIDIA FPS/p95 |
|---|---:|---:|---:|---:|---|
| Takip | 668.5 | 590.7 | %11.65 | 1.90→3.85 ms | Ölçülemedi |
| Kokpit | 681.2 | 545.4 | %19.93 | 2.00→2.65 ms | Ölçülemedi |

Kaynak: [korunan V6 tekrar raporu](performance/v6/TEKRARLAR.md). Bu kayıpların giderildiği iddia edilmez.

Güncel çalıştırıcıda NVIDIA aygıtı/`nvidia-smi` yok; varsayılan Chromium renderer'ı **SwiftShader**, tarayıcı sürümü `156.0.8078.79`. [Ortam kontrolü](performance/v6-1/hardware-probe.json) ve [gerçek NVIDIA denemesinin engelli sonucu](performance/v6-1/nvidia-attempt.json) saklanır. Aynı fiziksel GPU, saat/güç/P-state karşılaştırması ve güvenilir NVIDIA GPU süreleri burada elde edilemedi. Başka CPU/GPU/tarayıcı sonuçları eski FPS'lerin yerine konmadı. %10 hedefi bu ortamda onaylanamaz.

## 3. Önce ölçülen darboğazlar

Başlangıç V6, Spa 1440p Ultra kokpit t=10: 87 bariyer çizim mesh'i, 148 draw call, 440328 çizilen üçgen; asfaltın kendisi 148344 üçgen. Chrome CDP CPU örnekleri, uygulama içi kapsayıcı süreler, WebGL sayaçları, JS heap ölçümleri ve vertex sürümleri kaydedildi.

| Bileşen | Gözlem / karar | GPU sınırı |
|---|---|---|
| Pist yüzeyi | Yoğun ama statik; tüm tanı pencerelerinde position sürümü aynı, kare içinde dünya üretimi 0. Tessellation azaltılmadı. | Fiziksel GPU bileşen maliyeti ölçülemedi. |
| Bariyerler | 128 m gruplar sorguları hızlandırıyor; ayrı çizilmeleri çağrı sayısını artırıyor. Aynı üçgenlerle 128→256→512→512→256→128 m çizim prototipi ölçüldü. | Yazılımsal GPU süresinden NVIDIA kazancı çıkarılmadı. |
| Kamera çarpışması | Önceki CameraCollision korunur; 128 m aralıklar ve gerçek üçgen dar fazı korunur. Yeni native-oracle testleri 192 gerçek ışında fark 0. | GPU'dan bağımsız CPU işi. |
| Araç / tekerlek desteği | Matematik değiştirilmedi; 4 destek çağrısı (2 yeniden hesaplama +2 cache hit) ve 2 yönelim sorgusu ayrı ölçüldü. | GPU maliyeti diye sunulmadı. |
| Mesh / buffer güncelleme | Build-time paketleme; kare başına yol veya bariyer vertex üretimi yok. | Geometri byte'ları CPU tampon toplamıdır, VRAM ölçümü değildir. |
| Materyal / gölge / ışık | Aynı materyaller, normal verileri, gölge seçenekleri ve doku depolama tahmini. | Direct NVIDIA GPU zamanlayıcısı yok. |
| Sahne dolaşımı | Çizim grafiğinde COTA64→9, Spa87→13 bariyer mesh'i; matris güncellemesi ayrıca ölçüldü. | CPU sahne maliyeti GPU'ya dönüştürülmedi. |
| Tahsis / GC | CDP heap ve GC örnekleri saklı; baskın başlangıç beklemeleri native WebGL çağrılarında. Per-frame geometri tahsisi eklenmedi; sorgu tamponları paylaşılır. | GC veya sürücü beklemesi GPU işi olarak etiketlenmedi. |

[Ham tanı](performance/v6-1/before/spa-render-prototype-raw.json), [sınırları açıklayan analiz](performance/v6-1/before/spa-render-prototype-analysis.json), [tekrar üretim aracı](../scripts/profile-v61.cjs). CPU süreleri **iç içe/kapsayıcıdır, toplanamaz**. SwiftShader'da native GL çağrıları saniyelerce bloke olabildi. Ham `meanFps/p95Ms` tamamlanmış rAF aralıklarıdır; son sürücü beklemesi bir sonraki rAF'a girmeyebilir. Bu alanlar tam-pencere FPS veya kabul verisi olarak kullanılmadı; hiçbir pencere silinmedi. Yazılımsal GPU timer sonuçları önceki kuyruk işini içerebilir ve bileşen bazında izole NVIDIA süresi değildir.

## 4. Uygulanan optimizasyon

`src/barrier-batching.js`, yalnız gerçek profilli COTA/Spa bariyerlerini 512 m çizim gruplarına paketler. Eski 128 m üçgen aralıkları korunur; sorgu proxy'leri sahneye eklenmez ve aynı position/normal BufferAttribute tamponlarını paylaşır. Proxy AABB/sphere'leri düz değil, **drape edilmiş son vertex'lerden** oluşturulur. Yerel geniş fazdan sonra aynı Three.js Mesh raycast'i kullanılır; sonuç çizilen mesh'e bağlanır. `CameraCollision` ve dünya yeniden kurulurken cache temizleme korunur.

Dönüşüm/near/far/içeriden başlayan ışınlar, negatif hücreler, tam üçgen eşitliği, position değişiminde sınır yenileme, geometri değişiminde native fallback ve disposal test edildi. Parent geometri dispose edildiğinde proxy'ler bırakılır. Yeni sorgu geometri nesneleri GPU'ya yüklenmez; vertex verisi çoğaltılmaz. Meksika ve sentetik profil çizim yolu korunur.

Tradeoff: daha büyük çizim grupları daha fazla uzaktaki üçgeni aynı draw call'a dahil edebilir. Spa kokpitte 440328→450396 (%2.29 artış), COTA kokpitte 298634→303210 (%1.53 artış) çizilen üçgen vardır. **Kaynak üçgen azaltılmadı; kalite düşürülmedi.** Bütün yol/bariyer hash'leri ve buffer byte'ları eşittir. Çizim çağrısı azalması tek başına FPS kabulü değildir.

## 5. Yeni V5 / V6 / V6.1 karşılaştırması

72 gerçek çizim sayacı: üç sürüm × üç pist × iki tampon × iki kalite × iki kamera. DPR1/render oranı1, adaptif/AO kapalı, aynı t=10. İki çözünürlük de gerçek 1:1 tamponla doğrulandı. **Bu matris FPS ölçümü değildir**; `timing=null`, `performanceAcceptance=false`. V5 COTA/Spa eski düz/normalize sahneyi, V6/V6.1 aynı türetilmiş araziyi kullanır. Bu nedenle V5→V6 aynı üçgen karşılaştırması değildir.

| Pist / tampon / kalite / kamera | V5 çağrı / üçgen | V6 çağrı / üçgen | V6.1 çağrı / üçgen |
|---|---:|---:|---:|
| mexico/1920/performance/a | 178 / 331874 | 178 / 331874 | 178 / 331874 |
| mexico/1920/performance/cockpit | 165 / 327482 | 165 / 327482 | 165 / 327482 |
| mexico/1920/ultra/a | 254 / 1357536 | 254 / 1357536 | 254 / 1357536 |
| mexico/1920/ultra/cockpit | 239 / 1171672 | 239 / 1171672 | 239 / 1171672 |
| mexico/2560/performance/a | 178 / 331874 | 178 / 331874 | 178 / 331874 |
| mexico/2560/performance/cockpit | 165 / 327482 | 165 / 327482 | 165 / 327482 |
| mexico/2560/ultra/a | 254 / 1357536 | 254 / 1357536 | 254 / 1357536 |
| mexico/2560/ultra/cockpit | 239 / 1171672 | 239 / 1171672 | 239 / 1171672 |
| cota/1920/performance/a | 66 / 51312 | 105 / 203186 | 72 / 204762 |
| cota/1920/performance/cockpit | 36 / 35068 | 75 / 186942 | 42 / 188518 |
| cota/1920/ultra/a | 129 / 212774 | 170 / 362634 | 134 / 367210 |
| cota/1920/ultra/cockpit | 98 / 148714 | 140 / 298634 | 104 / 303210 |
| cota/2560/performance/a | 66 / 51312 | 105 / 203186 | 72 / 204762 |
| cota/2560/performance/cockpit | 36 / 35068 | 75 / 186942 | 42 / 188518 |
| cota/2560/ultra/a | 129 / 212774 | 170 / 362634 | 134 / 367210 |
| cota/2560/ultra/cockpit | 98 / 148714 | 140 / 298634 | 104 / 303210 |
| spa/1920/performance/a | 76 / 58622 | 107 / 291570 | 83 / 297780 |
| spa/1920/performance/cockpit | 63 / 53898 | 94 / 286846 | 70 / 293056 |
| spa/1920/ultra/a | 124 / 223344 | 161 / 454412 | 135 / 464480 |
| spa/1920/ultra/cockpit | 111 / 209260 | 148 / 440328 | 122 / 450396 |
| spa/2560/performance/a | 76 / 58622 | 107 / 291570 | 83 / 297780 |
| spa/2560/performance/cockpit | 63 / 53898 | 94 / 286846 | 70 / 293056 |
| spa/2560/ultra/a | 124 / 223344 | 161 / 454412 | 135 / 464480 |
| spa/2560/ultra/cockpit | 111 / 209260 | 148 / 440328 | 122 / 450396 |

[72 satırın tamamı](performance/v6-1/counter-matrix.json), [24 V6→V6.1 farkı ve invariant kontrolleri](performance/v6-1/counter-summary.json). Her eş koşulda V6/V6.1 asfalt position SHA256, bariyer position+normal üçgen multiset SHA256, geometri byte'ı, doku tahmini ve tur süreleri eşittir. Meksika çağrı/üçgen sayıları da birebir aynı.

| 1440p Ultra | V6 geometri/doku | V6.1 geometri/doku | Geometri buffer byte (aynı) |
|---|---:|---:|---:|
| mexico/2560/ultra/cockpit | 246 / 31 | 246 / 31 | 23214042 |
| cota/2560/ultra/cockpit | 159 / 11 | 123 / 11 | 18072116 |
| spa/2560/ultra/cockpit | 178 / 11 | 117 / 11 | 26382120 |

Geometri/doku sayıları belirtilen yükleme/çizim geçmişindeki renderer resident sayaçlarıdır; byte alanları eşsiz sahne tamponu/doku depolama tahminidir, ölçülmüş VRAM değildir. CPU proxy nesnelerinin küçük metadata maliyeti bu byte alanına dahil değildir.

### CPU p50/p95 ve tekrarlar

Aynı bulut CPU'sunda, GPU işi `gl.finish()` ile **zamanlama dışında** boşaltıldı. Ardından çizim olmadan gerçek tur boyunca 400 konum, 400 ısınma ve 3 tekrar (1200 iş yükü/pencere), ileri/ters sürüm sırası kullanıldı. Oryantasyon, dört destek çağrısı, sahne matris güncellemesi ve çarpışma ayrı zamanlandı. Başlangıç görünümünün çevre-tile görünürlüğü sabittir; bu tam tur FPS testi değildir.

| Pist / sürüm | 2×1200 ışın toplam ms | p95 ms (iki pencere) | Sahne matrisleri toplam ms |
|---|---:|---:|---:|
| cota / v5 | 306.60 / 338.80 | 0.300 / 0.400 | 65.10 / 100.90 |
| cota / v6 | 36.30 / 62.40 | 0.100 / 0.100 | 102.60 / 231.50 |
| cota / v61 | 57.50 / 78.80 | 0.100 / 0.100 | 132.80 / 111.20 |
| spa / v5 | 204.50 / 349.30 | 0.200 / 0.400 | 98.60 / 120.40 |
| spa / v6 | 128.10 / 58.20 | 0.200 / 0.100 | 163.90 / 183.60 |
| spa / v61 | 93.10 / 61.80 | 0.100 / 0.100 | 141.30 / 179.00 |

CPU sonuçları karma: COTA ışın toplamı V6 iki pencere medyanı 49.35→68.15 ms (yaklaşık +38.1%, 1200 sorguda ortalama +0.0157 ms/sorgu); Spa 93.15→77.45 ms (yaklaşık −16.85%). COTA matris toplamı 167.05→122.00 ms, Spa 173.75→160.15 ms. Bütün pencereler saklıdır; iyi pencere seçilmedi. ~0.1 ms zamanlayıcı kuantumu altında p50=0 görülebilir; bu işin ücretsiz olduğu anlamına gelmez. GC/zamanlayıcı kesintileri dahil maksimumlar ham kayıttadır. Bunlar NVIDIA FPS değişimini ispatlamaz.

V6/V6.1 iki yöndeki bütün 1200 örnekli çapraz kamera/araç-destek karşılaştırmalarında en büyük koordinat farkı 0; gerçek telemetri SHA256'ları bütün sürümlerde eşittir. [CPU p50/p95/max ve tüm pencereler](performance/v6-1/cpu-summary.json), [hiç örnek atılmadan sıkıştırılmış çıktılar](performance/v6-1/cpu-outputs.json.gz), [CPU aracı](../scripts/measure-v61-cpu.cjs).

## 6. Görsel ve temas doğrulaması

[11 önce/sonra gerçek Ultra ekran görüntüsü çifti](performance/v6-1/visual/README.md): Spa Eau Rouge/Raidillon/tepe, Ultra takip/kokpit ve temas gerileme noktası; COTA T1 yaklaşımı/tepe/iniş, takip/kokpit. Aynı viewport/JPEG boyutları, istasyon, zaman ve kamera metadata ile doğrulanır. [11 çiftin JPEG SHA256'ları](performance/v6-1/visual/image-sha256.json) da birebir aynıdır; aynı karede piksel çıktısı değişmemiştir. Yapay/generatif görsel kullanılmadı.

88 son wheel/asphalt mesh raycast'i mevcut ±25 mm sınırında: -21.91966…11.17373 mm. Önce/sonra en büyük temas farkı 0.000000000000 m. Araçların rijit destek düzlemi ve DEM/asfalt belirsizliği aynıdır; gerçek süspansiyon veya ölçülmüş asfalt doğruluğu iddia edilmez. [Kamera/temas manifesti](performance/v6-1/visual/manifest.json).

## 7. Tam regresyon

`npm ci` ardından `npm test`, sabit kod commit'i üzerinde yeniden çalıştırıldı: **52/52 birim (önceki 47+5), 29/29 Chromium (önceki 27+2), sıfır atlama/retry/başarısızlık**. Eski test dosyaları ve eşikleri değiştirilmedi. [Tam kayıt](performance/v6-1/regression.txt), [test edilen kaynak/hash/durum](performance/v6-1/tested-source.json), [korunan 17 hash](performance/v6-1/protected-sha256.json).

COTA/Spa gerçek topografya, tam tur boyunca temas/kamera sürekliliği, Meksika HAM 76.651/RUS 76.356/delta −0.295, bütün telemetri kanalları, native çarpışma, V4 GLB/LOD/PBR, kalite/mobil, Stüdyo geçişleri, WebGL/eksik varlık yedekleri ve sentetik testler geçti. Yeni iki gerçek-pist testi 192 rayda native sonuç farkı 0; dört kalite/kamera çiziminde yol geometrisi/version/pozisyonları aynı; üç dünya kurulumunda aynı renderer, cache temizliği, proxy disposal ve sabit kaynak sayıları doğrulandı. [COTA](performance/v6-1/v61-cota.json), [Spa](performance/v6-1/v61-spa.json).

COTA mevcut 120 saniyelik kesintisiz test 0.25× kullanır: 0.000→30.507 s oynatma; geometri 134→134, doku 11→11. Test hızı değiştirilmedi ve FPS kabulü için kullanılmadı; karşılaştırmalı fiziksel matris 1×'tir. [COTA soak](performance/v6-1/cota-soak.json). Sentetik 120 saniye testi de kaynak sınırları içinde tamamlandı: [sentetik soak](performance/v6-1/synthetic-soak.json). Meksika 120 saniye testi de geçti (mevcut 4× test hızı): geometri 485, doku 30, hata dizileri boş. [Meksika soak](performance/v6-1/measurement.json). Mevcut adaptif kaynak testi ile adaptif kapalı karşılaştırma matrisi farklı amaçlardır.

## 8. Kalan riskler ve tekrar üretim

- Fiziksel RTX 5060 Laptop yeniden ölçümü eksiktir; %10 kayıp hedefinin geçtiği bilinmiyor. PR taslak kalır.
- Yoğun asfalt tessellation'ı ve GPU üçgen maliyeti korunur. 512 m grupların daha geniş görünürlük sınırı bazı karelerde ekstra üçgen çizer; hedef GPU'da kazanç/zarar tekrar ölçülmelidir.
- COTA CPU ışın toplamı yükselmiştir; p95 yaklaşık 0.1 ms kalsa da bu maliyet ve scheduler/GC değişkenliği fiziksel tekrar öncesi gözden geçirilmelidir.
- 120 saniye/üç yeniden kurulum kaynak testleri geçti; sınırsız süreli JS heap/VRAM sızıntısızlığı garantisi değildir.
- DEM, merkez çizgisi ve rijit temas sınırlamaları V6'daki gibi korunur; banking/süspansiyon ölçülmedi.

```bash
npm ci
npm test
npm run serve
```

NVIDIA'da yeni üç sürümlü karşılaştırma için V5 ve V6 önce worktree'lerini yukarıdaki SHA'larda açın; `V61_V5_ROOT`, `V61_BEFORE_ROOT`, `V61_AFTER_ROOT` ve gerekiyorsa `CHROMIUM_PATH` ortam değişkenlerini gerçek yollarla ayarlayın:

```bash
node scripts/audit-v61.cjs
```

Bu araç önce NVIDIA renderer + tek GPU UUID/driver erişimini doğrular. 24 koşulda 6 dengeli/ters permütasyon, her sürümde 20 s ısınma+12 s 1× gözlem planlar (432 pencere, yaklaşık 3.8 saat+kurulum). Gerçek gözlem süresine göre tamamlanan render throughput ortalaması, medyan/p95/max kare aralığı, doğrudan GPU-query örnekleri, CPU submission süresi, draw call/triangle/geometry/texture ve pencere başı/sonu GPU saat/güç/P-state kaydedilir. Düşük örnekli/yanlış tamponlu pencereler kabul edilmez. Sayısal FPS gate'i ile tam kabul ayrı tutulur; saat karşılaştırılabilirliği, işlevsel ve görsel sonuçlar ayrıca incelenmelidir. `--plan` sadece plan, `--counters` yalnız sayaçtır; ikisi de performans onayı üretmez.

## 9. Son karar

**İşlevsel ve geometri doğrulaması geçti. Çizim çağrıları azaldı, kaynaklar/temas korundu. Ancak aynı fiziksel NVIDIA GPU ile yeni ortalama/medyan FPS ve p95 tekrarları yok: performans kabulü verilmedi. PR #10 taslak bırakıldı; yeni PR açılmadı, main'e birleştirme yapılmadı.**
