# V9 — V8 main ve ayrı V7.1 görsel denetimi

Gerçek Chromium uygulama kareleri. Main: `ad35d61f5b26ed1d5ff6d82a3ee43b91478cee94`; V7.1: `5bb2995e20fe45e6af76a23e997915b3202965da` (PR #13 ayrı, V9’a taşınmadı). Ultra, DPR1, adaptif kapalı; aynı zaman, ışık, kamera ve tampon. Hareket kareleri merkezden ±0.25 s; ölçülmüş gerçek süspansiyon fiziği iddiası yoktur.

Bu görüntüler fiziksel GPU FPS kanıtı değildir. Düşük/orta/yüksek LOD aynı kamera açısında elle zorlanarak karşılaştırılır; otomatik seçim mevcut tarayıcı testindedir.

| Sahne | Main | Ayrı V7.1 |
|---|---|---|
| mexico-braking-before.jpg · t=13.125 | [![Main](main/mexico-braking-before.jpg)](main/mexico-braking-before.jpg) | [![V7.1](v71/mexico-braking-before.jpg)](v71/mexico-braking-before.jpg) |
| mexico-braking-center.jpg · t=13.375 | [![Main](main/mexico-braking-center.jpg)](main/mexico-braking-center.jpg) | [![V7.1](v71/mexico-braking-center.jpg)](v71/mexico-braking-center.jpg) |
| mexico-braking-after.jpg · t=13.625 | [![Main](main/mexico-braking-after.jpg)](main/mexico-braking-after.jpg) | [![V7.1](v71/mexico-braking-after.jpg)](v71/mexico-braking-after.jpg) |
| mexico-acceleration-before.jpg · t=39.800 | [![Main](main/mexico-acceleration-before.jpg)](main/mexico-acceleration-before.jpg) | [![V7.1](v71/mexico-acceleration-before.jpg)](v71/mexico-acceleration-before.jpg) |
| mexico-acceleration-center.jpg · t=40.050 | [![Main](main/mexico-acceleration-center.jpg)](main/mexico-acceleration-center.jpg) | [![V7.1](v71/mexico-acceleration-center.jpg)](v71/mexico-acceleration-center.jpg) |
| mexico-acceleration-after.jpg · t=40.300 | [![Main](main/mexico-acceleration-after.jpg)](main/mexico-acceleration-after.jpg) | [![V7.1](v71/mexico-acceleration-after.jpg)](v71/mexico-acceleration-after.jpg) |
| mexico-corner-before.jpg · t=74.625 | [![Main](main/mexico-corner-before.jpg)](main/mexico-corner-before.jpg) | [![V7.1](v71/mexico-corner-before.jpg)](v71/mexico-corner-before.jpg) |
| mexico-corner-center.jpg · t=74.875 | [![Main](main/mexico-corner-center.jpg)](main/mexico-corner-center.jpg) | [![V7.1](v71/mexico-corner-center.jpg)](v71/mexico-corner-center.jpg) |
| mexico-corner-after.jpg · t=75.125 | [![Main](main/mexico-corner-after.jpg)](main/mexico-corner-after.jpg) | [![V7.1](v71/mexico-corner-after.jpg)](v71/mexico-corner-after.jpg) |
| mexico-cockpit.jpg · t=50.000 | [![Main](main/mexico-cockpit.jpg)](main/mexico-cockpit.jpg) | [![V7.1](v71/mexico-cockpit.jpg)](v71/mexico-cockpit.jpg) |
| mexico-tyre-contact.jpg · t=50.000 | [![Main](main/mexico-tyre-contact.jpg)](main/mexico-tyre-contact.jpg) | [![V7.1](v71/mexico-tyre-contact.jpg)](v71/mexico-tyre-contact.jpg) |
| mexico-lod-low.jpg · t=50.000 | [![Main](main/mexico-lod-low.jpg)](main/mexico-lod-low.jpg) | [![V7.1](v71/mexico-lod-low.jpg)](v71/mexico-lod-low.jpg) |
| mexico-lod-medium.jpg · t=50.000 | [![Main](main/mexico-lod-medium.jpg)](main/mexico-lod-medium.jpg) | [![V7.1](v71/mexico-lod-medium.jpg)](v71/mexico-lod-medium.jpg) |
| mexico-lod-high.jpg · t=50.000 | [![Main](main/mexico-lod-high.jpg)](main/mexico-lod-high.jpg) | [![V7.1](v71/mexico-lod-high.jpg)](v71/mexico-lod-high.jpg) |
| cota-grade.jpg · t=5.975 | [![Main](main/cota-grade.jpg)](main/cota-grade.jpg) | [![V7.1](v71/cota-grade.jpg)](v71/cota-grade.jpg) |
| cota-cockpit.jpg · t=5.975 | [![Main](main/cota-cockpit.jpg)](main/cota-cockpit.jpg) | [![V7.1](v71/cota-cockpit.jpg)](v71/cota-cockpit.jpg) |
| cota-follow.jpg · t=5.975 | [![Main](main/cota-follow.jpg)](main/cota-follow.jpg) | [![V7.1](v71/cota-follow.jpg)](v71/cota-follow.jpg) |
| spa-grade.jpg · t=20.025 | [![Main](main/spa-grade.jpg)](main/spa-grade.jpg) | [![V7.1](v71/spa-grade.jpg)](v71/spa-grade.jpg) |
| spa-cockpit.jpg · t=20.025 | [![Main](main/spa-cockpit.jpg)](main/spa-cockpit.jpg) | [![V7.1](v71/spa-cockpit.jpg)](v71/spa-cockpit.jpg) |
| spa-follow.jpg · t=20.025 | [![Main](main/spa-follow.jpg)](main/spa-follow.jpg) | [![V7.1](v71/spa-follow.jpg)](v71/spa-follow.jpg) |

[Ham kamera/temas/LOD kayıtları](captures.json) · [JPEG SHA256](image-sha256.json).
