# Tur Düellosu

HTML/CSS/JavaScript, Canvas ve Three.js ile gerçek F1 telemetri analizi ve 3D ghost lap karşılaştırması. Framework veya uygulama derlemesi gerekmez.

```sh
python3 -m http.server 4173
```

`http://localhost:4173` adresini açın. İnternet; telemetri arşivi, Three.js ve decoder modülleri için gereklidir. Yerel görsel varlıklar depoya dahildir. Kayıtlı tercih yoksa 2024 Meksika sıralama HAM/RUS seçilir. **Hayalet tur** 3D görünümü, **Düelloya dön** ayrıntılı analizi açar.

- Oynatma: boşluk; ← / → ile zaman; zaman çizelgesi; 0.25×–4×. Gizlenen sekmede duraklar, otomatik devam etmez.
- Kameralar: A/B takip, yayın, üstten, serbest. Serbest kamerada sürükle/tekerlek; Shift+sürükle veya sağ tuşla pan; WASD; R ile sıfırla.
- Görsel: Performans/Dengeli/Ultra; isteğe bağlı Ultra AO; dinamik çözünürlük; B saydamlığı ve tam ekran.
- Performans paneli: gerçek render boyutu, FPS, CPU çizim ve destekleniyorsa GPU süresi, draw calls ve kaynak sayaçları. **Ölçümü indir** JSON raporu verir.

Meksika sabit coğrafi çizgisi yaklaşık referanstır; pist genişliği, eğim, kerbler, yapılar ve araç modeli ölçülmüş/resmî varlık değildir. Ortak sürüş çizgisi tahmin olarak etiketlidir. Delta yaklaşık pist ilerlemesinde karşılaştırılır; milisaniye hassasiyetinde fiziksel konum eşlemesi iddiası yoktur.

## Test ve varlık hazırlama

```sh
npm ci
npm test
npm run assets:build
```

`npm test`: saf çekirdek testleri + gerçek arşiv verisi kullanan Playwright senaryoları. Chromium gerekir; `CHROMIUM_PATH` ile yol seçilebilir. Test çizimi SwiftShader kullanır, fiziksel GPU performansı sayılmaz. Proxy CA'sı için gerekirse `CHROMIUM_PROXY_SPKI` tanımlanabilir; genel TLS denetimi kapatılmaz. Encoder uygulamayı çalıştırmak için gerekmez; varlık yeniden üretimi ve lisanslar aşağıdadır.

- [V2 kapsamı ve sınırlar](docs/GELISTIRME-V2.md)
- [Teknik yapı](docs/TEKNIK-INCELEME.md)
- [Varlıklar ve lisanslar](docs/VARLIKLAR.md)
- [Test/ölçüm raporu](docs/TEST-RAPORU.md)
