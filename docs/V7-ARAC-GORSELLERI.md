# V7 — F1 araç görsel gerçekçiliği

**Teslim: bağımsız görsel/kod incelemesi için `feat/v7-car-visuals`. Main'e birleştirilmedi. V7 işlevsel ve yapısal bütçe kontrolleri geçti; fiziksel NVIDIA FPS karşılaştırması yapılamadı. V6.1'in NVIDIA kabul borcu ayrıca açık tutulur.**

## Başlangıç denetimi

- Başlangıç main / V6.1 merge: `e5ffd2224bb3ee2dceed9ee2470bc6f6da33fc74`.
- Tam test edilen yerel kod: `76af5fde4c60c1fa4f948be49a78a238dc6ab22e`, ağaç `0c8d2c8ab47f9417683a8eea113f423fec7738c7`.
- GitHub'da aynı test edilmiş içerik: `82c5a87281ff035b423452aea2cf9757d37d1490`. Git Data API commit metadata'sı farklıdır; her ağaç SHA'sı yerel ağaçla doğrulandı. [Eşleme](performance/v7/publication.json). Sonraki teslim commit'i yalnız belgeler ve ölçüm/görsel kanıtlarıdır; runtime, GLB, test ve bağımlılık içerikleri aynı tutulur.

Mevcut V4 Blender Python üretimi, düzenlenebilir `.blend` kaynakları, Meshopt/16-bit quantization, GLB materyal grupları ve Three.js `VisualAssets` klonlama/LOD mimarisi incelendi. Araçlar üç LOD kullanıyor; yüksek detay tembel yükleniyor. `Wheel_*` ve `Steer_F*` boş pivotları animasyon sözleşmesidir. Her LOD'da dört tekerlek ve iki ön direksiyon pivotu var; çalışma zamanındaki 12/6 referans üç LOD'un toplamıdır, fiziksel tekerlek sayısı değildir.

Öncelikli görsel sorunlar: yuvarlak sidepod ve gövde kesitleri; küre gibi duran girişler; önde/arkada aynı lastik genişliği; kask içine gömülen noktasal vizör; birbirinden kopuk görünen difüzör strake'leri; aşırı koyu ve yüksek kontrastlı karbon renk haritası. Kanat/halo temel oranları kullanılabilir durumdaydı; sırf yeniden üretmek için poligon eklenmedi.

## Model ve hareket sözleşmesi

- Burun ve motor kapağı daha kontrollü kesitlerle daralır. Sidepod geniş üst omuz, belirgin alt kesit ve arka daralma kullanır; içeri alınmış koyu hava girişi ve özgün soğutma yarıkları bulunur.
- Ön/arka kanat ve halo ana geometrisi korunur; taban kenarı düzenlendi, mevcut difüzör kanatçıkları sürekli rampaya bağlandı. Bu özgün, markasız tasarım çağdaş açık tekerlekli F1 oranlarından esinlenir; doğrulanmış bir takım aracının kopyası değildir.
- 0.36 m yarıçap / 0.72 m çap, 3.32 m dingil mesafesi ve merkezler korunur: x=±0.805 m, y=0.36 m, ön z=1.55 m / arka z=−1.77 m. Lastik karkası ön 0.35 m / arka 0.39 m genişliğinde; yanak omzu, jant dudağı, kapalı jant kapağı, merkez somunu ve özgün tanık işaretleri yenilendi. Slick lastiğe uydurma yol lastiği dişi veya sponsor logosu eklenmedi.
- Kapalı jant kapağının arkasında görünmeyen rotorlar kaldırıldı. Salıncak/pushrod/upright bağlantıları aynı gövde pozu altında kalır. **Bağımsız süspansiyon hareketi, fizik çözücüsü, lastik esnemesi veya gerçek süspansiyon iddiası yoktur.** Tekerlek merkezleri hareket sırasında gövdeden kopmaz; direksiyon pivotu lastik dönüşünden ayrıdır.
- Kokpit mevcut yüksek araçüstü bakışını ve near-plane ayarını korur; halo ön kirişinin görüşü kısmen kapaması devam eder. Yeni fiziksel sürücü göz konumu veya kamera sistemi iddia edilmez.
- `src/ghost-webgl.js` mesafeye bağlı dönüşü (`−distance/0.36`), direksiyon sınırı (±0.3 rad), kamera ve LOD eşiği kodu değiştirilmedi. `ghost-topography.js` yüzey pozu matematiği değiştirilmedi. Eğimde araç önceki rijit destek düzlemine uyarlanır.

## PBR ve ışık

Mevcut PBR yolu ve mevcut clearcoat uzantısı kullanıldı. Boya roughness 0.28/metalness 0.28/coat 0.38; karbon 0.43/0.08; kauçuk 0.88/0; metal 0.32/0.68. Karbon hissi özgün 64×64 paylaşılan renk haritasındaki düşük kontrastlı örgüyle sağlanır; anisotropic karbon shader'ı veya yeni normal haritası iddia edilmez. Örgü tekrar sayısı 24→16, renkler daha okunaklı düşük kontrastlı aralığa alındı. Boya tonu değişti, sahne ışığı veya pozlama değiştirilmedi.

Yeni HDRI, dış model/doku, shader geçişi veya çevre dekorasyonu yok. Mevcut CC0 çevre/HDRI ve lisans kayıtları korunur; araç kaynağı projeye ait özgün üretimdir. [Araç provenance](../assets/v4/vehicle-v7-authoring.json), [dosya SHA256'ları ve lisanslar](../assets/v4/sources.json). Boya/karbon/metal/kauçuk PBR parametreleri üç LOD'da tarayıcıda doğrulandı.

## LOD ve bütçe

Yüksek detay yakın Ultra kamerada 35 m altında, orta 80 m altında, düşük uzakta / Performans profilinde seçilmeye devam eder. Otomatik seçim ayrı tarayıcı testinde 12/50/110 m ile kontrol edildi. Aynı açılı LOD görsellerinde seviyeler karşılaştırma için açıkça zorlanmıştır; bu bir oynatma kalite değişikliği değildir.

| LOD | Benzersiz üçgen önce → sonra | GLB byte önce → sonra | Benzersiz prim |
|---|---:|---:|---:|
| high | 59498 → 32264 | 492552 → 276916 | 22 → 22 |
| medium | 40586 → 27264 | 359992 → 255352 | 22 → 22 |
| low | 14606 → 12524 | 151832 → 132232 | 22 → 22 |

Bunlar manifestteki **benzersiz mesh primleri/üçgenleri**dir. Önceki modelde paylaşılmış mesh örnekleri bulunduğundan çizilen geometriyle aynı sayaç değildir:

| LOD | Çözümlenmiş accessor byte önce → sonra | Tek araç / renk geçişi mesh sayısı | Örneklenen üçgen önce → sonra |
|---|---:|---:|---:|
| high | 855184 → 448580 | 27 → 22 | 62942 → 32264 |
| medium | 565552 → 406092 | 27 → 22 | 44030 → 27264 |
| low | 204728 → 179540 | 27 → 22 | 16002 → 12524 |

[Manifest ve bütçeler](performance/v7/asset-budgets.json), [çözümlenmiş accessor/node ölçümleri](performance/v7/decoded-budgets.json). Accessor baytları typed-array toplamıdır; fiziksel VRAM ölçümü değildir. Yüksek detayda ilave poligon yerine kontrollü kesitler ve gereksiz yüksek subdivision/kapalı iç geometri maliyetinin azaltılması kullanıldı. Yüksek benzersiz üçgen sayısı yaklaşık %45.77 düştü; üç GLB toplam indirme boyutu da azaldı.

### Aynı gerçek uygulama karelerinin sayaçları

| Aynı kare | Draw call önce → sonra | Çizilen üçgen önce → sonra | Resident geometri önce → sonra | Doku önce → sonra |
|---|---:|---:|---:|---:|
| 01-front-three-quarter | 375 → 360 | 1507317 → 1415283 | 304 → 305 | 31 → 31 |
| 02-side-profile | 319 → 304 | 1372884 → 1280850 | 349 → 350 | 31 → 31 |
| 03-rear-three-quarter | 463 → 443 | 1886912 → 1764200 | 408 → 409 | 31 → 31 |
| 04-tyre-suspension | 372 → 357 | 1516675 → 1424641 | 408 → 409 | 31 → 31 |
| 05-cockpit | 422 → 404 | 1907256 → 1790824 | 418 → 419 | 31 → 31 |
| 06-cota-climb | 132 → 112 | 426062 → 303350 | 75 → 76 | 11 → 11 |
| 07-spa-raidillon | 174 → 154 | 494954 → 400066 | 151 → 151 | 11 → 11 |
| 08-lod-low | 285 → 280 | 845060 → 841582 | 304 → 305 | 31 → 31 |
| 09-lod-medium | 285 → 280 | 873088 → 856322 | 323 → 323 | 31 → 31 |
| 10-lod-high | 285 → 280 | 892000 → 861322 | 323 → 323 | 31 → 31 |
| 11-follow | 436 → 416 | 1835524 → 1712812 | 393 → 393 | 31 → 31 |

Tam sahne draw call/triangle değerleri görünürlük ve gölge geçişlerini içerir. Tüm 11 eş karede çağrı ve üçgen sayısı artmadı; doku sayıları aynı. Bazı yükleme/görünürlük geçmişlerinde resident geometri sayısı 1 artar; toplam tampon byte'ları azalmış olsa da nesne sayısının her karede azaldığı iddia edilmez. Bunlar FPS veya GPU süresi değildir.

## Gerçek uygulama görselleri ve temas

[11 önce/sonra çiftinden oluşan 22 gerçek ekran görüntüsü](visual/v7/README.md): ön üç çeyrek, yan, arka üç çeyrek, lastik/süspansiyon yakın planı, kokpit, COTA yokuşu, Spa Raidillon, düşük/orta/yüksek LOD ve takip. Aynı Chromium `156.0.8078.79`, 1440×1000 viewport, aynı çizim tamponları, Ultra, DPR 1, adaptif kapalı, aynı zaman/kamera/ışık/pozlama. Önceki main ve V7 aynı betikle çekildi. Kamera/ışık konumu en büyük farkı 0.000000075060 m / 0.000000075060 m; küçük fark yüzey destek Float32 yuvarlamasıdır.

Her pist tam sayfa yüklenir; betik `st.H.event` ve gerçek arazi kaynak sınıfını doğrulamadan kayıt almaz. İlk hash-only deneme COTA/Spa'yı yeniden yüklemediği için geçersiz sayıldı; teslimde kullanılmadı. Doğru çekimlerden sonra tam regresyon sıfırdan yeniden başlatıldı. [Kesilmiş ilk test koşusu](performance/v7/interrupted-test-run.txt) exit130 ile kontrollü durdurulmuş kısmi koşudur; son tam sonuç yerine kullanılmadı. Kareler uygulamadan alınmıştır; yapay/generatif görüntü veya rötuş yoktur. [Kamera/kaynak/temas/sayaç kaydı](performance/v7/visual-comparison.json), [JPEG SHA256](visual/v7/image-sha256.json).

Galerideki 44 son araç-A tekerlek/asfalt ışınında aralık -20.00006…5.56733 mm; önce/sonra en büyük fark 0.000000074569 m. Meksika düz referansta önceki yaklaşık−20 mm görsel ofset aynı kalır. COTA'da bu zaman noktasında iki ghost yakın olduğundan üst üste görünür; iki fiziksel aracın ayrı telemetri pozları değiştirilmedi.

Mevcut tam tur alan/destek ölçümleri: COTA en büyük pozitif rijit temas farkı 31.35250 mm; Spa 19.63241 mm. Bunlar DEM destek alanı örnekleridir, galerideki gerçek asfalt mesh raycast'iyle aynı ölçüm değildir. Eski test eşikleri gevşetilmedi. Mevcut 11 topografya ekran karesindeki 88 iki-araç temas kontrolü de ±25 mm sınırında geçti. Arazi modeli, merkez çizgisi ve ölçülmemiş banking belirsizliği değişmedi; gerçek asfalt/süspansiyon doğruluğu iddia edilmez.

## Tam test sonucu

Sabit kod üstünde temiz `npm ci` ardından `npm test`: **55/55 birim, 30/30 Chromium, sıfır atlama ve başarısızlık**. Önceki 52+29 korunur; yeni 3+1 test eklenmiştir. Önceki test dosyaları ve eşikler aynıdır. [Tam kayıt](performance/v7/regression.txt), [test edilen kaynak](performance/v7/tested-source.json), [korunan 17 SHA256](performance/v7/protected-sha256.json).

- GLB/Meshopt yükleme, prosedürel araç/JPEG yedeği, eksik varlık ve WebGL fallback geçti.
- Dört tekerlek / iki direksiyon pivotu, üç LOD'un ölçüleri, normal/UV ve byte/üçgen/prim bütçeleri doğrulandı. Blender 4.3.2 kaynak dosyasını gerçekten yeniden açtı: [reopen kaydı](performance/v7/blender-reopen.txt).
- Tekerlek dönüşü gerçek kaynak mesafesiyle aynı; mesh yerel dönüşlerine ikinci spin uygulanmaz; yol/geometri buffer'ları statik kalır. Direksiyon ±0.3 rad, PBR ve otomatik LOD seçimi geçti: [V7 araç testi](performance/v7/v7-vehicle.json).
- Meksika HAM 76.651 / RUS 76.356 / bitiş farkı −0.295 s, bütün telemetri kanalları, Veri Stüdyosu ve kamera geçişleri korundu. COTA/Spa tam tur temas/kamera testleri geçti.
- COTA 120 saniye: oynatma 0.000→30.495 s, geometri 133→133, doku 11→11. Mevcut 0.25× test hızı değiştirilmedi.
- Sentetik 120 saniye: geometri 478→479, doku 29→29. Meksika mevcut 4× 120 saniye kaydı da geçti: son geometri 485, doku 30; hata dizileri boş. Bu hızlar kararlılık testinindir, FPS karşılaştırması değildir. [COTA](performance/v7/cota-soak.json), [sentetik](performance/v7/synthetic-soak.json), [Meksika](performance/v7/measurement.json).
- Tek renderer ile Stüdyo/pilot/tur dönüşleri, mobil görünüm, disposal/cache, kaynak sınırları ve kritik konsol hatası denetimleri geçti. Kaynak testleri sınırsız süreli heap/VRAM sızıntısızlığı garantisi değildir.

## Ayrı kabul maddeleri ve sınırlamalar

| Madde | Durum |
|---|---|
| V7 GLB, animasyon, temas, kamera, fallback ve tam regresyon | Geçti |
| V7 aynı yapısal geometri/indirme/draw-call bütçesi | Geçti; nesne sayısı bazı karelerde +1, byte'lar azaldı |
| V7 fiziksel NVIDIA FPS / kare süresi / GPU süresi | Ölçülemedi; FPS performans kabulü verilmedi |
| V6.1 aynı fiziksel NVIDIA'da ≤%10 FPS kaybı hedefi | **Açık borç; doğrulanmadı** |
| Öznel görsel gerçekçilik | Bağımsız incelemeye bırakıldı |

Çalıştırıcıda NVIDIA aygıtı, `/dev/dri` ve `nvidia-smi` yok. Gerçek renderer: `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)`. SwiftShader sayaçları donanım FPS kazancı diye sunulmadı. V6.1 tarihsel Spa Ultra 1440p takip/kokpit kayıpları %11.65/%19.93 olarak korunur; e5ffd22 merge commit'i bunların giderildiği anlamına gelmez. [V7 donanım/kabul durumu](performance/v7/hardware-and-acceptance.json), [V6.1 raporu](V6-1-PERFORMANS-OPTIMIZASYONU.md), [tarihsel NVIDIA tekrarları](performance/v6/TEKRARLAR.md).

V7 fiziksel karşılaştırması mümkün olduğunda yeni baseline **e5ffd22** olmalıdır; önceki V6.1 borç deneyi V5/V6/V6.1 karşılaştırması olarak ayrı tutulmalıdır. Aynı GPU/driver/güç durumu, tampon/DPR, kalite, kamera, hız, zaman ve dengeli tekrarlarla ölçülmeden FPS veya p95 artışı iddia edilmez. Ultra kalitesi, ışık veya adaptif çözünürlük gizlice düşürülmedi.

## Çalıştırma ve yeniden üretim

```bash
npm ci
npm run serve
# http://localhost:4173
```

Normal kullanımda Blender gerekmez; üç hazır GLB depodadır. Araçları yeniden üretmek için Blender 4.3.2 ve proje Node bağımlılıklarıyla:

```bash
npm run assets:build
npm test
```

Bu komut V7 araçlarını üretir, yalnız araçları Meshopt ile optimize eder, manifest ve provenance hash'lerini günceller. `npm run assets:build:v4` tarihsel V4 araç+çevre üretimidir ve V7 aracını geri değiştirir; V7 için kullanılmaz. `.blend` kaynak Z up, GLB Y up / +Z ileri / metre sözleşmesindedir. [Üretim açıklaması](../art/blender/README.md), [V7 Python](../art/blender/build_v7.py), [Blender](performance/v7/blender-build.txt), [Meshopt](performance/v7/meshopt-build.txt).

Görsel tekrar: başlangıç SHA'sında ayrı worktree/sunucu açıp aynı `scripts/capture-v7.cjs URL OUTDIR` betiğini iki sunucuya çalıştırın. Kaydedilmiş karelerde sahne, kamera ve ışık metadatasını karşılaştırın; farklı renderer görüntülerini eşit donanım FPS karşılaştırması saymayın. COTA/Spa kaynakları, Meksika telemetrisi ve Veri Stüdyosu hesaplarına dokunulmadı. Yeni pist/çevre dekorasyonu ve belirsiz lisanslı varlık eklenmedi. Tarihsel V4 kaynakları korundu.

**Main'e birleştirme veya canlı site dağıtımı yapılmadı. V7 ayrı dal/PR üzerinden bağımsız inceleme içindir. V6.1 NVIDIA kabul borcu kapanmış sayılmaz.**
