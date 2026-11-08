# Main entegrasyonu — V2 + V3 + V4

Bu kayıt 8 Kasım 2026 entegrasyon doğrulamasını açıklar. Asıl birleşme commit SHA’ları GitHub PR #1, #2 ve #3’ün merge kayıtlarından okunmalıdır; rapor kendi commit SHA’sını içine yazmaz.

## Bağımlılık ve kodun korunması

Başlangıç main: `93843b5c922cea1d757b45a34360e156b15ed533`.

| Sürüm | PR | Başlangıç head | Önceki sürüm |
|---|---|---|---|
| V2 | [#1](https://github.com/hamitkaantokmak-jpg/tur-duellosu/pull/1) | `2d20f9fab968bdb1f02ebd681dec6066003e998d` | main |
| V3 | [#2](https://github.com/hamitkaantokmak-jpg/tur-duellosu/pull/2) | `4e1ed68e23e2f0c852b2a0b3d632339dd4a76b62` | V2 |
| V4 | [#3](https://github.com/hamitkaantokmak-jpg/tur-duellosu/pull/3) | `cc2286fd8e173753a8f68586533c7bb40dad980d` | V3 |

Gerçek GitHub commit’leri geçici `codex/main-integration-check` dalında main üzerine bu sırayla `--no-ff` birleştirildi. Üç aşamada da çakışma olmadı. İlk birleşik dosya ağacı yayımlanmış V4 ağacı `be605d7637497422620b3415f6907cbff074526e` ile birebir eşleşti. Cherry-pick veya değişiklikleri yeniden uygulama kullanılmadı. Uzak entegrasyon da merge yöntemiyle, V2 → V3 → V4 sırasıyla yapılır; V3/V4 PR tabanları sırası geldiğinde main’e taşınır. Kaynak dallar korunur.

Entegrasyonun uygulama değişikliği: Chromium’un eksik `/favicon.ico` isteğinin ürettiği 404’ü gidermek için sayfaya gömülü SVG site simgesi eklendi. Telemetri veya görsel simülasyon hesabı değiştirilmedi. `src/replay-core.js`, V2’den beri bayt düzeyinde aynıdır. Eklenen iki tarayıcı testi ve varlık denetim betiği entegrasyonun yeniden doğrulanmasını sağlar.

## Korunan özellikler

Gerçek HAM/RUS sıralama telemetrisi; 76.651 / 76.356 saniye tur süreleri; tam Meksika pist modeli; ayrı ilerlemeli iki araç ve delta; hız/gaz/fren/vites/RPM; oynatma ve tüm hızlar; yedi kamera; telemetri grafikleri; fren/yarış analizi; Blender araçları ve üç LOD; V4 çevre/PBR/HDRI; kalite profilleri; WebGL, GLB ve KTX2 başarısızlığında standart/prosedürel/JPEG yedekleri korunur.

## Varlık ve yol denetimi

[Makine tarafından üretilen envanter](integration/asset-audit.json): `index.html` içindeki 12 yerel kaynak yolu mevcut; V4 kaynak kayıtlarındaki 21 SHA-256 doğrulaması geçti. Gerçek tarayıcı ayrıca beş GLB’yi, üç KTX2 haritasını, HDRI’yi, PNG ağaç atlasını ve dört JPEG PBR/zemin haritasını HTTP üzerinden yükler. Üç yol JPEG’i ayrı KTX2 arızası senaryosunda denenir.

**Silinen dosya yok.** Eski araç/asfalt/HDRI dosyaları artık aktif V4 yükleyicisinde seçilmez; eski üretim betikleri, kaynak/lisans takibi ve tarihsel sürüm yeniden üretimi için tutulur. `tree-view-*.png` ile `soil-color.jpg` V4 üretim girdileridir. Prosedürel araç/yol ve standart 2D oynatma çalışan fallback kodudur; temizlenmedi. Bunlar tarayıcıya birlikte yüklenen iki uygulama sürümü oluşturmaz: normal çalışma yolu V4’tür.

## Son regresyon ve gerçek tarayıcı kontrolü

Entegrasyon ortamında `npm ci` ile bağımlılıklar yeniden kuruldu; son uygulama düzeltmesinden sonra `npm test` baştan sona çalıştı: **9/9 birim/varlık testi ve 10/10 Playwright senaryosu geçti**, atlanan test yok. [Tam kayıt](integration/regression-results.txt).

| Kontrol | Sonuç / kanıt |
|---|---|
| V2 aşaması | 7/7 birim testi ve gerçek tarayıcıda eksik GLB/KTX2 ile prosedürel/JPEG oynatma geçti. [Birim](integration/v2-unit.txt), [tarayıcı](integration/v2-browser.txt). |
| V3 aşaması | 8/8 birim/geometri testi ve aynı eksik varlık kontrolü geçti. [Birim](integration/v3-unit.txt), [tarayıcı](integration/v3-browser.txt). |
| Son birleşik sürüm | 9 birim testi, mevcut 8 tarayıcı senaryosu ve eklenen 2 entegrasyon senaryosu başarılı. |
| Gerçek tam tur | 4× oynatma, baştan bitişe kadar gerçek saatle ilerledi ve 76.651 s sonunda durdu; iki tur ilerlemesi `[1,1]`, delta −0.295 s. Her pilotta hız/gaz/fren/vites/RPM için 539 sonlu ve değişen örnek doğrulandı. [Kayıt](integration/integration-lap.json). |
| V4 / LOD / grafikler | Yüksek/orta/düşük LOD 15/55/150 m kamera mesafelerinde gerçekten görünür seçildi. PBR atamaları, tüm GLB/KTX2/HDRI/PNG/JPEG HTTP yüklemeleri ve telemetri grafiği değişimi kontrol edildi. Normal tam turda sayfa, konsol ve yerel HTTP hata listeleri boş. |
| Yarış analizi | Gerçek 2024 Meksika yarış verisi; 20 pilot, en fazla 71 tur; özet/grafikler/strateji/geçişler/pilot sekmeleri geçti. [Kayıt](integration/race-analysis.json). |
| 120 saniye kararlılık | Hazır durum korundu; **484 geometri / 30 doku**, 230 draw call. 500/100 sınırları yükseltilmedi. [Kayıt](integration/soak-120s.json). |
| Diğer regresyonlar | Tüm kameralar/hızlar, bağımsız ghost konumları, pilot/tur değişimi, mobil görünüm, sekme gizlenmesi, tekrar kaynak kurulumu, WebGL/GLB/KTX2/çevre arızaları ve gerçek bariyerde serbest kamera engeli geçti. |

İlk yeni entegrasyon denemesi eksik site simgesinden kaynaklanan iki 404 konsol kaydı nedeniyle başarısız oldu. Simge eklendi; o çalışma geçerli başarı sayılmadı ve sonrasında bütün testler yeniden, kesintisiz çalıştırıldı.

Kararlılık testi **SwiftShader**, gerçek **747×294** adaptif canvas; 86 aralık, p50 1047.6 ms, p95 1984.2 ms. Son FPS penceresi 0.97, GPU sorgusu 800.8 ms. Bu sonuç akıcı fiziksel GPU performansına kanıt değildir.

[Gerçek Chromium son görüntüleri ve metadata](integration/browser/README.md): ana düzlük, araç yakın çekimi, stadyum, iki araç karşılaştırması. Her biri gerçek 1920×1080 render, Ultra, DPR1, AO/adaptif çözünürlük kapalı. Görüntüler FPS ölçümü değildir. [Doğrulanan uygulama dosyalarının SHA-256 listesi](integration/validated-runtime-sha256.json), main üzerindeki içerik eşitliğini denetlemek içindir. Birleşme sonrasında main dosya ağacı bu test edilen teslim ağacıyla karşılaştırılır.

## Çalıştırma

```sh
python3 -m http.server 4173
```

`http://localhost:4173` adresini açın. Gerçek telemetri arşivi, fontlar ve Three.js/decoder modülleri için internet gerekir; Blender uygulamayı çalıştırmak için gerekmez.

```sh
npm ci
npm test
node scripts/audit-integration-assets.cjs
```

Chromium kurulu olmalı; gerekirse `CHROMIUM_PATH` kullanılır. Kurumsal proxy için yalnız proxy sertifikasının SPKI pini `CHROMIUM_PROXY_SPKI` ile verilir; genel TLS doğrulaması kapatılmaz.

## Kalan sınırlar

Kritik işlevsel hata için test sonuçlarına bakın. Önceki V4 sanat/performans sınırları sürer: profesyonel fotogerçekçilik tamamlanmış sayılmaz; mimari, tür ve bazı yerleşimler temsili; zemin düz; ortak sürüş çizgisi ve delta yaklaşık pist ilerlemesine dayanır. Bu ortam fiziksel GPU içermez ve SwiftShader ile çizim yapar. 1080p/60 FPS veya düşük cihazda 30 FPS doğrulanmış değildir. 120 saniye kontrolü saatlerce kararlılık garantisi değildir. [V4 ayrıntılı raporu](GELISTIRME-V4.md).
