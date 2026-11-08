# Test ve ölçüm raporu

Test tarihi: 8 Kasım 2026 (Europe/Istanbul).

## Ortam

Linux x86_64 bulut çalışma ortamı; 3 görünür vCPU, Intel Xeon Platinum 8573C; sistem Chromium, Playwright 1.56.1. GPU: ANGLE / Vulkan SwiftShader Device (Subzero), yazılımsal çizim. Fiziksel bir orta seviye ekran kartı kullanılmadı. Testlerde gerçek TracingInsights 2024 Meksika sıralama verileri internetten yüklendi; sahte tur sonucu veya telemetri fixture'ı kullanılmadı.

## Otomatik kapsam

`npm test` üç Playwright senaryosu içerir:

1. Gerçek Hamilton/Russell tur yüklemesi; bağımsız ilerleme ve başlangıç/bitiş sınırları; zaman çizelgesine gitme; beş kamera düğmesi; fareyle serbest kamera; üç kalite profili değiştirilirken zamanın korunması; B saydamlığı; performans paneli; beş oynatma hızında mevcut saat motorunun deterministik adımları; dört sahne kurulumu arasında aynı noktada sabit geometri/doku sayacı; başa sarma, oynat/duraklat; analize ve haritaya dönüş; pilot/tur değiştirme; 390 px mobil görünüm; yakalanmamış JavaScript hata kontrolü.
2. Three.js ağ yüklemesi engellendiğinde açık WebGL hata mesajı ve çalışan standart Canvas oynatıcı/zaman çizelgesi.
3. 30 saniyelik gerçek tarayıcı oynatma kontrolü, Performans profili, 4× seçimi, kaynak sayacı bütçesi ve ekran görüntüsü. Bu test çok saatlik kullanımda sızıntı olmadığının kanıtı değildir.

Ek kontrol: `loadTel`, `prepTel`, `resampleTel`, `setGeometry`, `compare`, `kAtTime`, `positions`, `buildRace`, `ghostMotionBuild`, `ghostReplayPoses` fonksiyonları başlangıç commit'i ile metinsel karşılaştırmada aynı kalmıştır. `node --check src/ghost-webgl.js` ve `git diff --check` uygulanır.

## Ölçümler

Gerçek kaynak turları: HAM **1:16.651**, RUS **1:16.356**. Aynı mesafede bitiş delta B − A: **−0.295 s**.

Son tam çalıştırmada 3/3 senaryo geçti (yaklaşık 1 dakika 30 saniye). Performans profili, 1280 × 720 viewport ve 30 saniyelik oynatmanın son ölçüm penceresinde **3.40 FPS / 294.25 ms**, 83 draw call, 90 geometri / 36 doku görüldü; adaptif gerçek canvas boyutu **747 × 294** idi. Bunlar yazılımsal SwiftShader ölçümleridir; 1080p fiziksel GPU sonucu değildir. Dengeli profilde kısa kontrol pencereleri yaklaşık 0.4–2.2 FPS arasında değişmiştir. Otomasyonun etkileşim/derleme yükü de bu kısa ölçümleri etkiler.

**60 FPS veya düşük güçlü cihazlarda 30 FPS hedefinin sağlandığı doğrulanmadı.** Fiziksel GPU ile 1080p ölçüm ve daha uzun bellek testi gerekir. Geometri/doku sayacı JS heap veya GPU bellek baytını ölçmez. FPS ve kare aralığı CPU, tarayıcı planlaması ve çizimi birlikte içerir.

## Test edilmemiş veya sınırlı kapsam

- Tüm sezon, yarış ve oturum kombinasyonları tek tek denenmedi.
- Yarış analizinin tüm sekmeleri ve tüm eski filtre kombinasyonları için tam E2E regresyon yapılmadı; ilgili hesaplama kodu korunmuştur.
- Oturumun gerçek ağ kesintisi, donanım WebGL bağlam kaybı/geri kazanımı, düşük GPU belleği ve saatler süren kullanım test edilmedi. Başlatma hatası için ağ engelleme senaryosu test edildi.
- Referans video ile fotogerçekçilik eşdeğerliği veya doğrulanmış pist geometrisi sağlanmış sayılmaz.

## Değişen dosyalar

`index.html`, `src/ghost-webgl.js`, `src/ghost.css`, `README.md`, `.gitignore`, `package.json`, `package-lock.json`, `playwright.config.js`, `tests/simulator.spec.js`, `docs/TEKNIK-INCELEME.md`, `docs/VARLIKLAR.md`, `docs/TEST-RAPORU.md`.

GitHub aktarımı: İlk dal oluşturma isteği entegrasyondan 403 döndürdü. Kullanıcı bağlantı yetkisini güncelledikten sonra dal oluşturma başarıyla doğrulandı.
