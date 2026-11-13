# V7.1 — aynı kamera ve ışıkla gerçek uygulama karşılaştırması

Önce: V8 main `ad35d61f5b26ed1d5ff6d82a3ee43b91478cee94`. Sonra: kullanıcı isteğiyle halosuz V7.1. Kamera konumu, yakın düzlem, görüş açısı, ışık, zaman ve kalite aynı; V8 görsel hareketi/lastik fit sistemi açık. Ultra,1440×1000 viewport, DPR1, adaptif kapalı. Bunlar gerçek Chromium ekran görüntüleridir; üretim/rötuş yoktur.

Düşük/orta/yüksek LOD aynı açıda denetim için zorlanmıştır; otomatik seçim ayrıca mevcut testlerde doğrulanır. COTA başlangıcında iki ghost birbirine yakındır. Yedek karelerinde GLB istekleri bilerek engellenmiştir. Kamera değişikliği teslim edilmedi.

| Görünüm | Önce: V8 main | Sonra: V7.1 |
|---|---|---|
| Ön üç çeyrek · t=50.000 | [![Önce](before/01-front-three-quarter.jpg)](before/01-front-three-quarter.jpg) | [![Sonra](after/01-front-three-quarter.jpg)](after/01-front-three-quarter.jpg) |
| Yan profil · t=50.000 | [![Önce](before/02-side-profile.jpg)](before/02-side-profile.jpg) | [![Sonra](after/02-side-profile.jpg)](after/02-side-profile.jpg) |
| Arka üç çeyrek · t=50.000 | [![Önce](before/03-rear-three-quarter.jpg)](before/03-rear-three-quarter.jpg) | [![Sonra](after/03-rear-three-quarter.jpg)](after/03-rear-three-quarter.jpg) |
| Lastik/süspansiyon · t=50.000 | [![Önce](before/04-tyre-suspension.jpg)](before/04-tyre-suspension.jpg) | [![Sonra](after/04-tyre-suspension.jpg)](after/04-tyre-suspension.jpg) |
| Meksika kokpit · t=50.000 | [![Önce](before/05-cockpit.jpg)](before/05-cockpit.jpg) | [![Sonra](after/05-cockpit.jpg)](after/05-cockpit.jpg) |
| COTA yokuşu · t=5.975 | [![Önce](before/06-cota-climb.jpg)](before/06-cota-climb.jpg) | [![Sonra](after/06-cota-climb.jpg)](after/06-cota-climb.jpg) |
| COTA kokpit · t=5.975 | [![Önce](before/12-cota-cockpit.jpg)](before/12-cota-cockpit.jpg) | [![Sonra](after/12-cota-cockpit.jpg)](after/12-cota-cockpit.jpg) |
| Spa Raidillon · t=20.025 | [![Önce](before/07-spa-raidillon.jpg)](before/07-spa-raidillon.jpg) | [![Sonra](after/07-spa-raidillon.jpg)](after/07-spa-raidillon.jpg) |
| Spa kokpit · t=20.025 | [![Önce](before/13-spa-cockpit.jpg)](before/13-spa-cockpit.jpg) | [![Sonra](after/13-spa-cockpit.jpg)](after/13-spa-cockpit.jpg) |
| Düşük LOD · t=50.000 | [![Önce](before/08-lod-low.jpg)](before/08-lod-low.jpg) | [![Sonra](after/08-lod-low.jpg)](after/08-lod-low.jpg) |
| Orta LOD · t=50.000 | [![Önce](before/09-lod-medium.jpg)](before/09-lod-medium.jpg) | [![Sonra](after/09-lod-medium.jpg)](after/09-lod-medium.jpg) |
| Yüksek LOD · t=50.000 | [![Önce](before/10-lod-high.jpg)](before/10-lod-high.jpg) | [![Sonra](after/10-lod-high.jpg)](after/10-lod-high.jpg) |
| Takip · t=50.000 | [![Önce](before/11-follow.jpg)](before/11-follow.jpg) | [![Sonra](after/11-follow.jpg)](after/11-follow.jpg) |
| Prosedürel yedek: kokpit · t=20 | [![Önce](before/fallback-cockpit.jpg)](before/fallback-cockpit.jpg) | [![Sonra](after/fallback-cockpit.jpg)](after/fallback-cockpit.jpg) |
| Prosedürel yedek: serbest · t=20 | [![Önce](before/fallback-free.jpg)](before/fallback-free.jpg) | [![Sonra](after/fallback-free.jpg)](after/fallback-free.jpg) |

[Eş kamera/ışık/hareket ve temas kayıtları](../../performance/v71/matched-views.json) · [Yedek kayıtları](../../performance/v71/fallback-views.json) · [JPEG SHA256](image-sha256.json).

[V7 referansı](../v7/README.md): yeni çekilen11 V7 karesinin mevcut dosyalarla byte eşitliği [burada](../../performance/v71/v7-reference.json) doğrulandı.
