# Performans entegrasyonu

Başlangıç main: `9384bfe4f114c8e359a63d766df33e2ab559c1e7`.
PR #5 Veri Stüdyosu bu commit ile birleştirilmişti. PR #4 başlangıç başı: `7083dd6b7d4e558549c5a5c036869cf23aeda3c0`.

PR #4 güncel main ile birleştirildi; README'deki tek çakışmada hem takılma düzeltmesi hem Veri Stüdyosu belge bağlantısı korundu. `index.html` otomatik birleşti: kamera çarpışma modülü ghost-world'den önce, Stüdyo betikleri uygulamadan sonra yükleniyor. Telemetri, replay-core ve Stüdyo JS/CSS dosyaları main ile birebir aynı. Dosya silinmedi.

Korunan kapsam: gerçek HAM/RUS ve diğer pilot/tur verileri; tam Meksika pisti; delta, analiz, grafikler, gerçek zamana bağlı oynatma; tüm kameralar; Blender modelleri, üç araç LOD'u, PBR ve V4 çevresi; kalite profilleri; mobil, eksik varlık ve WebGL yedekleri. Veri Stüdyosu'nun sekiz bölümü, notlar, içe/dışa aktarma ve doğrudan bağlantılar korunur.

Kamera optimizasyonu per-instance dünya sınırlarını önbellekler, adaylarda aynı üçgen raycast'ini kullanır. Dünya yeniden kurulumunda önbellek temizlenir. Ultra DPR üst sınırı 1.5'tir. Telemetri hesapları ve oynatma saati değiştirilmedi.

## Doğrulama durumu

Birleştirme öncesi tam testler, eşit koşullu yeniden ölçüm ve sonrasında temiz main kurulumu/testleri tamamlanınca bu bölüm kanıt dosyalarıyla güncellenecektir. Bu ara rapor tamamlanma iddiası değildir; testler geçmeden PR birleştirilmeyecektir.

Yeni `tests/studio-simulator.spec.js`, üç kez sekiz Stüdyo bölümünü, simülatöre dönüşü, kamera değişimlerini, gerçek pilot/tur seçimini, önbelleğin dünya değişiminde yenilenmesini, aynı renderer/tek WebGL bağlamını, kontrollü geometri/doku sayılarını ve konsol hatalarını sınar. Görünüm değişimi zamanı korur; bilinçli tur seçimi mevcut davranış gereği zamanı sıfırlar.

## Yeniden çalıştırma

```bash
npm ci
npm test
npm run serve
```

Tarayıcı: http://localhost:4173. Eşit koşullu karşılaştırma için eski main ve entegrasyon checkout'larını ayrı HTTP portlarında sunun:

```bash
node scripts/measure-perf-integration.cjs http://127.0.0.1:4240 http://127.0.0.1:4241 test-results/perf-comparison.json
```

Ölçüm ortamında fiziksel GPU yoktur; Chromium SwiftShader kullanır. Yazılım çiziminde gözlenen FPS kullanıcının Brave/gerçek ekran kartı performansını kanıtlamaz; fiziksel GPU testi yapılmamıştır. Eski `performance/stutter/` kayıtları ilk PR #4 sürümüne aittir, bu entegrasyonun yeni ölçümü değildir.
