# Tur Düellosu

HTML, CSS, JavaScript, Canvas ve Three.js ile gerçek F1 telemetri karşılaştırması. Framework veya uygulama derlemesi gerekmez.

```sh
python3 -m http.server 4173
```

Tarayıcıda `http://localhost:4173` açın. İnternet, Three.js CDN'i ve TracingInsights telemetri arşivi için gereklidir. Kayıtlı tercih yoksa 2024 Meksika sıralama, Hamilton / Russell seçilir. **Hayalet tur** düğmesi 3D oynatıcıyı; **Düelloya dön** ayrıntılı analizi açar.

Serbest kamera: fareyle sürükleyerek döndürün, tekerlek ile yakınlaşın. Oynatma: boşluk, ← / →, zaman çizelgesi, 0.25×–4×. Kalite profili simülasyonu sıfırlamadan değişir. **Performans paneli** ölçüm sayaçlarını açar. Çevre ve sürüş çizgileri temsili olarak etiketlidir.

## Test

```sh
npm ci
npm test
```

Testler gerçek internet arşivini kullanır ve erişilebilir Chromium ister. `CHROMIUM_PATH` ile yolu değiştirilebilir; varsayılan `/usr/bin/chromium`. Headless testlerde SwiftShader kullanılır. Kurumsal proxy sertifikası Chromium'da güvenilmiyorsa test ortamının CA açık anahtarının SHA-256 SPKI değeri `CHROMIUM_PROXY_SPKI` ile belirtilebilir; genel sertifika hatası atlama bayrağı kullanılmaz. Bu ayar uygulama koduna dahil değildir.

- [Teknik inceleme ve bilinen sınırlar](docs/TEKNIK-INCELEME.md)
- [Varlıklar ve lisans durumu](docs/VARLIKLAR.md)
- [Test ve ölçüm raporu](docs/TEST-RAPORU.md)
