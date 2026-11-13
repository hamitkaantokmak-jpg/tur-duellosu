# V9 — gerçek komutlar ve kapsam

Linux cloud çalışma alanındaki yollar aşağıdadır; tekrar üretimde kendi worktree yollarınızı kullanın. Kaynak commit’ler `scripts/v9-versions.json` içindedir. Main/V8 ve PR #13 ayrı worktree’lerde kaldı. Orijinal Playwright yapılandırması, timeout ve test gövdeleri değiştirilmedi.

```bash
export XDG_CACHE_HOME=/workspace/work/v9-browser/cache
export XDG_CONFIG_HOME=/workspace/work/v9-browser/config
# Yalnız bu cloud proxy CA’sı gerektiğinde; genel TLS denetimi kapatılmaz:
export CHROMIUM_PROXY_SPKI="$(openssl x509 -in /usr/local/share/ca-certificates/environment-proxy-ca.crt -pubkey -noout | openssl pkey -pubin -outform DER | openssl dgst -sha256 -binary | openssl base64 -A)"

cd /workspace/work/tur-duellosu-v9
npm ci --cache /workspace/work/npm-cache
npm test
# İlk tam koşu: 67 birim; 33 Chromium geçti / 1 context-setup hatası.
# Ölçüm birimlerinin son hali ayrıca: 70/70.
npm run test:unit

cd /workspace/work/tur-duellosu-v71
npm ci --cache /workspace/work/npm-cache
TEST_PORT=4492 npm test
# 63 birim; 34 Chromium geçti / 2 context-setup hatası.
```

Aşağıdaki üç komut **ayrı CLI ve yeni Chromium** ile aynı senaryoyu çalıştırır. Üçü de geçti. Bu tekrarlar ilk tam ortak-tarayıcı koşularının başarısızlığını silmez; atlama/retry veya yeni test eşiği kullanılmadı. Özel output yolu ilk koşunun sonuçlarını korur.

```bash
cd /workspace/work/tur-duellosu-v9
TEST_PORT=4493 npx playwright test tests/vehicle-motion.spec.js --grep 'V8 cota body-only motion preserves root, tyre support, telemetry and cameras$' --output=/workspace/work/v9-main-cota-recheck

cd /workspace/work/tur-duellosu-v71
TEST_PORT=4494 npx playwright test tests/vehicle-motion.spec.js --grep 'V8 cota body-only motion preserves root, tyre support, telemetry and cameras$' --output=/workspace/work/v9-v71-cota-recheck
TEST_PORT=4495 npx playwright test tests/vehicle-visual-audit.spec.js --grep 'halo-free GLBs retain cockpit framing, unclipped near view, all LODs and V8 motion on three tracks$' --output=/workspace/work/v9-v71-visual-recheck
```

Ölçüm araçları V9 worktree’sinde çalışır. Fiziksel `--run`, bu ortamda doğrulanmış tek NVIDIA GPU/sürücü/sanallaştırma modu ve güç profili bulamadığı için **kod 2 ve sıfır zamanlama örneğiyle** durdu. `--counters` yalnız statik sayaçtır; FPS kabulü değildir. Herhangi bir ölçümde minimum beş tekrar/20 s ısınma/12 s pencere kuralını azaltan fiziksel parametreler reddedilir.

```bash
cd /workspace/work/tur-duellosu-v9
node scripts/probe-v9.cjs
node scripts/inventory-v9.cjs
node scripts/check-v9-history.cjs
node scripts/audit-v9.cjs
V9_OUT=docs/performance/v9/physical-attempt.json node scripts/audit-v9.cjs --run
node scripts/compare-v9.cjs

export V9_ROOT_V5=/workspace/work/v9-refs/v5
export V9_ROOT_V6=/workspace/work/v9-refs/v6
export V9_ROOT_V61=/workspace/work/v9-refs/v61
export V9_ROOT_V7=/workspace/work/v9-refs/v7
export V9_ROOT_V8=/workspace/work/tur-duellosu-v71-main
export V9_ROOT_V71=/workspace/work/tur-duellosu-v71
V9_FILTER='spa/2560/ultra' V9_OUT=docs/performance/v9/priority-counters.json node scripts/audit-v9.cjs --counters
node scripts/check-v9-gpu-sampler.cjs
```

`audit-v9.cjs` her worktree’nin HEAD SHA’sını doğrular, 4510–4515 portlarında geçici statik sunucular açıp kapatır. Fiziksel ölçüm için ayrıca gerçek kontrol edilmiş `V9_POWER_PROFILE` ve gerektiğinde `CHROMIUM_PATH` gerekir. Ortam değişkenine profil adı yazmak termal/güç eşitliğini kanıtlamaz. Varsayılan native/vsync koşulları eski uncapped/renderRatio1 deneyine otomatik eşdeğer değildir; tarihsel kabul borcu ayrı kontrollü tekrar gerektirir.

CPU/görsel sunucuları iki ayrı terminalde:

```bash
cd /workspace/work/tur-duellosu-v9
node scripts/serve.cjs 4490
# Diğer terminal, PR #13 worktree’sinde:
cd /workspace/work/tur-duellosu-v71
node scripts/serve.cjs 4491
```

```bash
cd /workspace/work/tur-duellosu-v9
node scripts/profile-v9.cjs http://127.0.0.1:4490 docs/performance/v9/cpu-diagnostic.json
node scripts/capture-v9.cjs http://127.0.0.1:4490 http://127.0.0.1:4491 docs/visual/v9
```

CPU tanısı beş tekrarda 1200 gerçek sahne örneği kullanır; render kuyruğu önce boşaltılır, sıcak döngüde render yapılmaz. Tam sahne FPS’i veya NVIDIA zamanı değildir. Görsel hazırlık aynı DOM kontrol değerlerini atomik ayarlar; uygulamanın kendi `drawAll()` çizimini, yüksek GLB hazır olma kontrolünü ve aynı kamera/ışık/tampon doğrulamasını kullanır. UI etkileşim testleri tam suite’de özgün halleriyle çalışır.

İlk yeni birim hatası, ilk sayaç-overlay hatası, ilk blank-origin ve ikinci checkbox-actionability görsel hatası ham kayıtları korundu. Son sayaç komutu 12 kayıt, son görsel komutu 20 eş çift/40 JPEG ile kod 0 döndü. Kaynak/lisans/telemetri uygulama dosyaları değişmedi. Tam rapordaki başarısız ve doğrulanamayan kriterler bu komutlarla GEÇTİ sayılmaz.
