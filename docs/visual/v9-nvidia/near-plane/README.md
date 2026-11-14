# Açık kokpit yakın düzlem / halo bulgusu

Fiziksel NVIDIA, Ultra, 1440×1000 viewport / 1406×680 tampon. Tarihsel aynı tur zamanları; her pist tam yüklenip beklenen tur süreleri doğrulanır. Bu tanı FPS benchmark’ı değildir.

| Pist | V8 kesişen üçgen | V9 kesişen üçgen | Önce | Sonra |
|---|---:|---:|---|---|
| mexico | 66 | 66 | [PNG](before/mexico-cockpit.png) | [PNG](after/mexico-cockpit.png) |
| cota | 14 | 14 | [PNG](before/cota-cockpit.png) | [PNG](after/cota-cockpit.png) |
| spa | 11 | 11 | [PNG](before/spa-cockpit.png) | [PNG](after/spa-cockpit.png) |

**Görsel kalite bulgusu açık.** Kesişim sayısı tanı proxy’sidir, kapatılan piksel alanı veya fiziksel güvenlik ölçüsü değildir. Meksika’da halo kirişi görüşü kapatır; V9 DOM düzeltmesi geometri/kamerayı değiştirmedi. PR #13 model değişiklikleri alınmadı. [Ham metadata](results.json). Gezinme ve init hatalı ilk girişimler ayrı geçersiz klasörlerde tutulur.
