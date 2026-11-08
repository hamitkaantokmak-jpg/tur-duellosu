# V2 test ve ölçüm raporu

Tarih: 8 Kasım 2026 (Europe/Istanbul). Önceki V1 raporu bu dosyanın git geçmişindedir; aşağıdaki sonuçlar V2 içindir.

## Ortam ve veri

Linux x86_64, 3 görünür vCPU, Intel Xeon Platinum 8573C; Chromium ve Playwright 1.56.1. Çizici: **ANGLE / Vulkan / SwiftShader Device (Subzero)**. Fiziksel GPU kullanılmadı; ortamda /dev/dri, /proc/driver/nvidia/gpus veya /sys/class/drm aygıtları bulunmadı.

Gerçek TracingInsights 2024 Meksika sıralama verileri internetten yüklendi. HAM **1:16.651**, RUS **1:16.356**; tam tur B − A farkı **−0.295 s** korunur. Kaynak örnek sayıları 585/584, kaynak mesafeleri 4244.56/4250.11 m. Kaynak koordinatları sabit coğrafi referansa hizalandığında RMS konum sapması yaklaşık **6.59 / 5.77 m**, azami sapma yaklaşık **9.46 / 9.55 m** görüldü. Bu sapmalar referans/örneklerin hassasiyet sınırıdır; gerçek pilot çizgisinin doğrulanması değildir.

## Çekirdek testleri

`npm run test:unit` — 7 senaryo:

- 0.25×, 0.5×, 1×, 2×, 4× hızlarda düzensiz, seyrek ve atlanan karelerde geçen sürenin korunması.
- Negatif zaman aralığı ve turun sonunda sınırlandırma.
- Sabit coğrafi hattın kapanışı ve istasyon uzunluğu.
- Birim/eksen yansıması/başlangıç konumunun geri kazanılması ve kaynak dizilerin değişmemesi.
- Bozuk hizalamada açık yedek davranış.
- Tekerlek mesafesinin anlık hız × süre yerine özgün mesafeden alınması.
- Hız değişikliğinde önceki hızda geçen aralığın korunması.

Geometri testlerindeki sentetik örnekler yalnız algoritma birim testidir; uygulamada pilot telemetrisi veya tur sonucu olarak kullanılmaz.

## Tarayıcı testleri

`tests/simulator.spec.js` gerçek veriyle şu senaryoları kapsar:

1. Pilot/tur yüklemesi, coğrafi istasyon hizalaması, GLB/KTX2 yükleme, başlangıç/bitiş ilerlemesi, zaman çizelgesi, beş kamera, serbest sürükleme ve klavye pan, üç profil sırasında zamanın korunması, saydamlık, panel, seyrek karede saat, beş hız, sahne yenilemesinde kaynak sayacı kararlılığı, yeniden başlatma/oynat/duraklat, analize dönüş, pilot/tur değiştirmede sabit yol geometrisi, 390 px mobil genişlik, gizlenen sekmede duraklama ve yakalanmamış JS hataları.
2. Three.js yüklemesi engellendiğinde standart Canvas oynatıcısının çalışması.
3. **120 saniyelik** gerçek tarayıcı oynatması ve kaynak bütçesi kontrolü.
4. Ultra AO yüklenmesi/çizimi ve ölçüm JSON'unun indirilebilmesi.
5. GLB/KTX2 yüklemeleri engellendiğinde çalışan prosedürel araç + JPEG yedeği.
6. Tek tur projeksiyonu reddedildiğinde iki turun birlikte normalize mesafe yedeğine geçmesi ve geçerli durumda hizalamanın geri gelmesi.

Tam tarayıcı çalıştırması **5/5** geçti. Son hız değişimi ve iki taraflı hizalama yedeği düzeltmelerinden sonra ilgili ana senaryo ve yeni hizalama senaryosu ayrıca çalıştırıldı: **2/2 geçti**. Böylece altı farklı tarayıcı senaryosu doğrulandı; son değişikliklerden sonra 120 saniyelik test tekrar çalıştırılmadı, çünkü değişiklikler hız geçişi ve hizalama yedeğiyle sınırlıydı. Çekirdek testleri son durumda **7/7** geçti. Test çıktıları Playwright test-results dizininde tutulur. Testler, beyan edilen 60 FPS/1080p hedefini veya tüm eski analiz kombinasyonlarını doğrulamaz.

## 120 saniyelik yazılımsal çizim ölçümü

Performans profili, 1280×720 viewport; dinamik çözünürlük açık. Son ölçüm penceresi:

| Ölçüm | Sonuç |
|---|---|
| Gerçek canvas | **747×294** |
| FPS / kare aralığı | **3.95 FPS / 253.38 ms** |
| Örneklenen kareler | **431** |
| Kare aralığı p50 / p95 | **265.0 / 516.6 ms** |
| Son CPU çizim çağrısı | **0.9 ms** |
| Son GPU sorgusu | **240.82 ms** — SwiftShader bağlamı |
| Draw calls | **103** |
| Geometri / doku sayacı | **239 / 77** |

FPS son pencereye aittir; 120 saniyenin ortalaması değildir. CPU çizim çağrısı, GPU tamamlanmasını ve tüm DOM/kare planlamasını kapsamaz. GPU sorgusu da bu ortamda yazılımsal çizim bağlamını ölçer. Geometri/doku sayacı GPU bellek baytını ölçmez. V1 ölçümüyle aynı kadraj/yük koşulları olmadığından yüzde performans kazancı çıkarılmamalıdır.

**1080p/60 FPS ve düşük güçlü fiziksel donanımda 30 FPS doğrulanmadı.** Gerçek cihazda dinamik çözünürlük kapatılarak render boyutu, GPU modeli, profil, kamera ve yavaş kare dağılımı kaydedilmelidir. Uygulama bunun için indirilebilir ölçüm JSON'u sunar.

## Sınırlar

- 120 saniye ve tekrarlanan sahne kurulumları, saatler boyunca sızıntı olmadığını kanıtlamaz.
- Tüm sezon/pist/oturumlar, yarış analizinin tüm sekmeleri ve tüm filtre birleşimleri uçtan uca denenmedi.
- Gerçek donanım bağlam kaybı, düşük VRAM ve tüm mobil GPU'lar denenmedi.
- GLB araçlar ve çevre görsel temsildir; fotogerçekçi referans eşdeğerliği veya resmî pist ölçümü iddiası yoktur.
- KTX2'nin GPU formatı/bellek kazancı cihaz desteğine bağlıdır; JPEG dosyasından daha küçük indirme garantisi yoktur.

`node --check` ile yeni JavaScript dosyaları ve `git diff --check` kontrol edilir. Kaynak/lisans bilgileri `docs/VARLIKLAR.md`, teknik kapsam ve kalan ölçüm hedefleri `docs/GELISTIRME-V2.md` içindedir.

## Son görsel kontrol

Uzak ve üstten bakışta asfalt dışı zeminlerin yakın derinlikleri çizgilenme oluşturdu. Zemin ayrımı ve kamera near/far aralığı düzeltildi; son takip ve serbest kamera görüntülerinde görsel olarak doğrulandı. Bu son derinlik/clip ayarı için 120 saniyelik ölçüm tekrarlanmadı. Kaynak görüntüler `docs/screenshots/mexico-follow.png` ve `mexico-circuit.png` içindedir.
