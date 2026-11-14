# V9 — gerçek uygulama karşılaştırmaları

V8 (`ad35d61`) ve aynı kaynak/veri/kaliteyi koruyan V9 DOM yazısı düzeltmesi. 1440×1000 viewport; gerçek WebGL tamponu 1406×680. Bu görseller 1080p/1440p performans pencereleri değildir. Orijinal PNG dosyaları düzenlenmedi.

| Sahne | V8 önce | V9 sonra |
|---|---|---|
| spa-eau-rouge | [PNG](before/spa-eau-rouge.png) | [PNG](after/spa-eau-rouge.png) |
| spa-raidillon | [PNG](before/spa-raidillon.png) | [PNG](after/spa-raidillon.png) |
| spa-crest | [PNG](before/spa-crest.png) | [PNG](after/spa-crest.png) |
| spa-cockpit | [PNG](before/spa-cockpit.png) | [PNG](after/spa-cockpit.png) |
| cota-t1-approach | [PNG](before/cota-t1-approach.png) | [PNG](after/cota-t1-approach.png) |
| cota-t1-crest | [PNG](before/cota-t1-crest.png) | [PNG](after/cota-t1-crest.png) |
| cota-t1-descent | [PNG](before/cota-t1-descent.png) | [PNG](after/cota-t1-descent.png) |
| cota-cockpit | [PNG](before/cota-cockpit.png) | [PNG](after/cota-cockpit.png) |
| mexico-braking | [PNG](before/mexico-braking.png) | [PNG](after/mexico-braking.png) |
| mexico-corner | [PNG](before/mexico-corner.png) | [PNG](after/mexico-corner.png) |
| mexico-lod-low | [PNG](before/mexico-lod-low.png) | [PNG](after/mexico-lod-low.png) |
| mexico-lod-medium | [PNG](before/mexico-lod-medium.png) | [PNG](after/mexico-lod-medium.png) |
| mexico-lod-high | [PNG](before/mexico-lod-high.png) | [PNG](after/mexico-lod-high.png) |

[Poz/temas metadata](captures.json) ve [tam piksel sonuçları](pixel-comparison.json). Üç LOD açıkça zorlanmıştır; otomatik LOD testi ayrıca korunur. Lastik destek noktaları gerçek çizilen asfalta raycast ile ölçülür; bu, bütün lastik yüzeylerinin fiziksel deformasyon doğrulaması değildir. Hareket V8 görsel yaklaşımıdır, ölçülmüş süspansiyon değildir. DEM kaynaklı eğim, ölçülmüş asfalt/banking anlamına gelmez.

Manuel inceleme: Spa Raidillon, COTA T1 tepe/kokpit, Meksika frenleme ve low/medium LOD karelerinde belirgin yüzme veya zemine gömülme görülmedi. Durgun kareler zamansal sıçrama yokluğunu tek başına kanıtlamaz; süreklilik testleri ayrıca raporlanır. Meksika frenleme karesinde iki farklı turun hayalet araçları üst üste gelebilir; araçlar arası çarpışma fiziği uygulanmaz ve telemetri konumları bunu gizlemek için değiştirilmez.

## Genel kalite kabulü verilmedi

[Üç ek fiziksel kokpit çifti ve açık near-plane/halo bulgusu](near-plane/README.md): Meksika/COTA/Spa V8 ve V9’da 66/14/11 kesişme; DOM düzeltmesi sorunu çözmez. İlk 13 çiftin poz/temas eşliği bu kalite sorununun kapandığı anlamına gelmez. İki geçersiz ek harness girişimi ayrıca saklanır.
