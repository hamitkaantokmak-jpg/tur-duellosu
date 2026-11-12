# V8 — Telemetriye dayalı görsel araç hareketi

Başlangıç: güncel main / V7 `0d5deecee432230bb1d84c77cc2bd92553358922`. Dal: `feat/v8-vehicle-motion`. Main'e birleştirme yapılmaz. **Bu bir görsel yaklaşım katmanıdır; ölçülmüş süspansiyon, gerçek yük transferi veya araç fiziği çözücüsü değildir.**

## İnceleme ve uygulama

V7'de kök araç pozu `ghostSurfacePose` destek düzleminden ve telemetri yönünden, lastik dönüşü gerçek telemetri mesafesinden (`−distance / 0.36`) geliyor. GLB'lerde üç LOD'un her birinde dört `Wheel_*`, iki `Steer_F*` ve iki arka `Axle_*` pivotu korunuyor. Direksiyon anlık sekiz metrelik ileri çizgi örneğinden bulunuyordu; gövde tümüyle rijitti.

V8'de kök x/y/z ve quaternion aynı sözleşmede kalır. Her LOD'un tekerlek dışında kalan mesh'leri tek `VisualBodyMotion` grubuna, dünya dönüşümleri korunarak bağlanır. Pivot yerel y=0.36 m'dedir. Yerel +Z burun, +X sağ, +Y yukarıdır. Yalnız bu gövde grubuna pitch ve roll uygulanır. Yaw, tur ilerlemesi ve kök yüzey yönelimi değiştirilmez. LOD, doku, materyal ve araç geometrisi yeniden üretilmedi.

Hız km/sa kanalından m/s'ye çevrilir; kaynak zamanına mevcut tur süresi eşlemesiyle gidilir. ±0.12 s hız farkı boyuna ivme **tahmini**, aynı pencerenin telemetri/etkin tahmini çizgi yön farkı yaw hızı **tahmini** verir. Roll için `speed * yawRate` kullanılır; bu ölçülmüş yanal ivme değildir. Fren/gaz kanalını uydurma kuvvete çevirmedik. Vites, RPM, fren, gaz, mesafe ve zaman kanalları salt okunur kalır.

| Görsel değişken | Hedef / sınır |
|---|---|
| Pitch | `clamp(-acceleration * 0.00065, ±0.5°)`; frenlemede +X burunu aşağı indirir |
| Roll | `clamp(speed * yawRate * 0.00048, ±0.6°)`; viraj dışına küçük eğilme |
| Direksiyon | `atan(3.32 * yawRate / speed)`, ±0.3 rad; 2 m/s altında sıfır |
| Filtre | 120 Hz tur zamanı tablosunda `alpha = 1-exp(-dt/0.16)`; çalışma anında tablo interpolasyonu |
| Tekerlek yüzey düzeltmesi | Yerel Y boyunca ±0.06 m; çizilen asfalt üzerinde nominal 0.002 m görsel açıklık |

Sayılar görsel ayarlardır; yay/amortisör, aero yükü, lastik kuvveti veya gerçek direksiyon ölçümü değildir. İvme için merkezli pencere az miktarda gelecek örneği okur: bu çevrimdışı replay yaklaşımıdır, canlı fizik modeli değildir. 120 Hz entegrasyon bir kez yapılır; kare hızı veya oynatma çarpanı filtreyi değiştirmez. Duraklatmada poz donar; seek/geri sarma doğrudan aynı tur zamanını örnekler. Kaynak/pist değişimi yeni sahne tablosu oluşturur; sürüş çizgisi seçimi değişince tablo geçersizleşir.

## Yüzey teması ve kamera

Gövde eğilmesi lastik pivotlarına uygulanmaz. Küçük bir görsel tekerlek yüzey düzeltmesi bütün LOD'larda aynı dört temas örneğini paylaşır; direksiyon ve mesafeye bağlı lastik dönüşü korunur. Asfaltın gerçek çizilen üçgenleri dünya koordinatlarında bir kez kopyalanıp 8 m XZ hücrelerine ayrılır. Yükseklik barycentric olarak sorgulanır; üst üste gelen yüzeylerde mevcut tekerlek yüksekliğine en yakın yüzey seçilir. İki sabit düzeltme adımı kullanılır. Her karede bütün piste raycast veya yeni Vector/Matrix/array tahsisi yapılmaz. Dünya imhasında CPU indeksi bırakılır; geometri değişince yenilenir. Asfalt dışı sorguda mevcut yükseklik alanına geri dönülür ve `misses` sayılır; test edilen tam tur örneklerinde bu sayı sıfır olmalıdır.

İlk yeni taramada V7'nin rijit desteği COTA'da +31.44 mm boşluk, Spa'da −25.93 mm gömülme gösterdi. Yalnız yükseklik alanına oturtma Spa'daki −25.93 mm farkı çözemedi; alan ile çizilen üçgen aynı yüzey değildir. Bu yüzden gerçek asfalt üçgeni indeksi eklendi. İlk başarısız sonuçlar [ilk koşu](performance/v8/initial-contact-failure.log) ve [alan tabanlı deneme](performance/v8/field-fit-spa-failure.log) olarak saklanır; eşikler genişletilmedi. Düzeltme öncesi durdurulan tam koşu [ayrı kayıtlıdır](performance/v8/interrupted-before-mesh-fit.log); kabul koşusu sayılmaz.

Bu düzeltme bağımsız süspansiyon kinematiği değildir. Meshopt ile birleştirilmiş salıncak/pushrod mesh'leri gövdeyle hareket eder; bağlantı uçları ayrıca çözülmez. Lastik deformasyonu ve asfaltı bütünüyle saran lastik temas yaması yoktur. Temas ölçümü dört lastiğin geometriden alınmış destek noktaları üzerinden yapılır; her dönen lastik vertex'inin temas garantisi iddia edilmez. Yeni doğrulanmış banking/yükselti verisi eklenmedi; COTA/Spa hâlâ etiketlenmiş türetilmiş arazi modelleridir.

Takip/kokpit kameraları gövdenin küçük görsel pitch/roll hareketini takip etmez; mevcut yüzey referansı ve çarpışma sistemi korunur. Böylece bu katman kameraya yapay salınım eklemez. Mevcut kamera geçişi, yakın düzlem ve kokpit görüş sınırlamaları değişmedi.

## Gerçek uygulamadan önce/sonra

[Karşılaştırmalı galeri ve 54 kare](visual/v8/README.md). Dokuz sahne × üç zaman örneği × iki sürüm. Her üçlü merkez zamanın −0.25 / 0 / +0.25 saniyesidir. Aynı 2024 HAM/RUS kaynakları, 1440×1000 viewport, DPR=1, Ultra, adaptif çözünürlük kapalı; kamera ve telemetri kök pozu JSON'da birebir karşılaştırılır. Bunlar kısa kare dizileridir; 60 FPS video veya performans ölçümü değildir. Gövde hareketi kasıtlı olarak küçüktür.

Kaynak sürüm gerçek V7 main arşividir; V8 efektini kapatıp 'önce' diye sunmadık. Render Chrome/NVIDIA üzerinden gerçek uygulamadan alınır. Işık, kamera, poz ve örnek zamanları [ham metadata](visual/v8/sequences.json) ile incelenebilir. Dekorasyon veya yeni sanat varlığı eklenmedi.

## Test ve doğrulama

Son sonuçlar, kaynak kimliği ve ölçümler [kabul raporunda](performance/v8/acceptance.json), [birim kaydında](performance/v8/unit.txt), [tam tarayıcı kaydında](performance/v8/browser.txt) ve [ek cache/heap 120 s koşusunda](performance/v8/cache-soak.txt) bulunur. İlk başarısız denemeler silinmez. Önceki birim ve tarayıcı testleri korunur.

**Sonuç: 60/60 birim; ana koşuda 33/33 + ek 120 s cache/heap koşusunda 1/1 = toplam 34 tarayıcı testi başarılı.** Atlanan test ve retry yok. Ana tarayıcı koşusu 14.7 dakika sürdü. Uygulama kaynak sürümü yerel `c6d0f8f`, yayımlanan eşdeğeri `63fb72aa74cefad7cc607636045092b8e9ea7c73`, aynı Git ağacı `2b0b8ee7d331ce1bc4cfe13346ac7fa7ef0d8529`; sonraki commit'ler kanıt/belge/test betikleridir.

| Tam tur 0.5 s taraması, iki araç | Meksika | COTA | Spa |
|---|---:|---:|---:|
| Lastik destek noktası → çizilen asfalt açıklığı | 2.000 mm | 1.9994–2.0010 mm | 1.9983–2.0007 mm |
| En büyük görsel tekerlek düzeltmesi | 22.00 mm | 29.41 mm | 27.81 mm |
| Kök konum hatası / gövde etkisinin tekerlek matris farkı | 0 / 0 | 0 / 0 | 0 / 0 |
| Asfalt indeksi dışına düşen sorgu | 0 | 0 | 0 |
| İki araç hareket tabloları, byte | 440736 | 538992 | 656520 |
| Dünya asfalt pozisyon kopyası, byte (indeks gideri hariç) | 309888 | 6773760 | 10680768 |

Ek 120 s COTA Performans koşusunda geometri **115→115**, doku **10→10**; aynı hareket tabloları, yol indeksi ve tekerlek fit nesneleri korundu. 0.25/0.5× hız ve takip/kokpit değişimlerinden sonra replay 45.049 s'ye geldi; duraklatmada zaman ve hareket pozu aynı kaldı. GC sonrası JS heap 12793096→13758500 byte (yaklaşık +0.92 MiB); bu bir uzun süreli sızıntı yokluğu garantisi değildir. Meksika **76.651 / 76.356 / −0.295 s** ve tüm kaynak fingerprint'leri korundu. V7 varlıkları, sanat kaynakları, replay çekirdeği ve topografya çekirdeği değişmedi.

27 eşleştirilmiş kare çiftinde kök poz, kamera, güneş ve exposure birebir eşit; draw call ve üçgen sayısı da eşitti. Bu sabit sahne kontrolüdür, FPS kabulü değildir.

- Saf matematik: fren/hızlanma pitch işareti, iki yönlü roll/direksiyon, durma, bozuk sayılar, sınırlar, ani girişte türev sınırı; 15/30/60/144 FPS ve 0.25/1/2/4× örnekleme geçmişlerinde aynı tur zamanında eşit sonuç; geri seek ve duraklatma.
- Asfalt indeksi: ters winding, hücre sınırı, indeksli/indekssiz geometri, iki katlı yüzey ve asfalt dışı sorgu.
- Meksika/COTA/Spa: 0.5 s tam tur taraması, iki araç, bütün LOD tekerlek matrisleri; kök pozunun beklenen telemetri/surface pozuna eşitliği, gövde etkisinin tekerlek matrislerini değiştirmemesi, asfalt temas proxy'si, alt gövde vertex açıklığı ve kaynak fingerprint'i.
- Önceki sentetik yüzey, COTA/Spa raycast temas, kamera sürekliliği/çarpışması, 120 s oynatma, kalite/Veri Stüdyosu geçişleri ve GPU kaynak imha testleri aynen çalıştırılır.
- Ek V8 120 s testinde hız/kamera değişimi, duraklatma, aynı tablo/indeks/fit nesnelerinin korunması, renderer geometri/doku sayısı ve zorunlu GC sonrası JS heap ölçülür. JS heap GPU VRAM değildir.
- Meksika HAM 76.651 s / RUS 76.356 s / fark −0.295 s olmalıdır. Gerçek konum, kanal ve tur süresi farkları başarı sayılmaz.

Alt gövde vertex açıklığı mevcut yükseklik alanına göre ölçülür; gerçek asfalt proxy teması ayrı üçgen/raycast karşılaştırmasıdır. Kamera sürekliliği için önceki sentetik/gerçek pist testleri ve eşleştirilmiş kare metadata'sı birlikte kullanılır. Salt statik kareler tüm olası telemetri veya kamera geçişlerinin garantisi değildir.

Yeniden üretim (Node ve Playwright bağımlılıkları kurulu olmalı):

```powershell
$env:CHROMIUM_PATH='C:\Program Files\Google\Chrome\Application\chrome.exe'
$env:TEST_GPU='hardware'
npm run test:unit
npm run test:browser
```

Karşılaştırmalı kareler için V8'i 4380, V7 `0d5deec` arşivini 4381 portunda `scripts/serve.cjs` ile çalıştırın; `node scripts/capture-v8.cjs` kullanın. Kaynak arşivi, uygulama CDN bağlantılarını da kullanır. Testlerde ağ/veri/GLB yükleme hataları atlanmaz.

## Açık performans borcu

**V6.1/V7 fiziksel NVIDIA performans kabul borcu açıktır.** Önceki rapordaki Spa 1440p Ultra %11.65 takip / %19.93 kokpit kaybı tarihsel V6 karşılaştırmasıdır; V8 kaybı olarak yeniden etiketlenmez. V7'nin SwiftShader/strüktürel bütçe sonuçları NVIDIA FPS kabulü değildir.

Bu çalışmadaki fiziksel RTX 5060 Laptop GPU üzerinde işlevsel test ve görüntü üretimi, sabit güç/saat koşullarında tam karşılaştırmalı FPS/p95/draw-call/VRAM matrisi yerine geçmez. Yeni NVIDIA performans kabulü **verilmedi**. Yeni gövde grupları draw call/geometri/doku eklemez; tur tabloları ve asfalt indeksi CPU belleği ekler. Asfalt indeksinin yalnız pozisyon byte'ları raporlanır; Map/JS nesnesi gideri veya VRAM ölçümü gibi sunulmaz. İndeksin hücre tarama maliyeti ve yeniden kurulum maliyeti sonraki kontrollü donanım incelemesinde ölçülmelidir.

Eski bir soak testinin adı `software-renderer` kalmıştır; bu koşunun gerçek renderer'ı logdaki NVIDIA debug bilgisidir. Soak'taki yaklaşık 60 FPS / dinamik çözünürlük sayaçları donanım performans kabulü sayılmaz. GC sonrası JS heap de tüm işlem RAM'i, TypedArray harici belleği veya VRAM toplamı değildir.

PR bağımsız inceleme için bırakılır. Main merge veya canlı site dağıtımı yapılmaz; V9 geliştirmesi yoktur.
