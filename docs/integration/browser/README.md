# Main adayı — gerçek Chromium son kontrolü

[Dönem sonu entegrasyon raporu](../../MAIN-ENTEGRASYON.md) · [Gerçek kamera/zaman/varlık metadatası](captures.json)

Dört kare gerçek HTTP uygulamasından 1920×1080 render ile alındı ve tek tek gözle incelendi. Ultra, DPR1, AO/adaptif çözünürlük kapalı; görüntüler performans ölçümü değildir.

## Start / finish ve pit yolu

![Start / finish ve pit yolu](01-start-finish.jpg)

## T12 yaklaşımı ve T13–16 stadyum

![T12 yaklaşımı ve T13–16 stadyum](05-stadium.jpg)

## Araç yakın çekimi

![Araç yakın çekimi](06-car-closeup.jpg)

## İki araç karşılaştırması

![İki araç karşılaştırması](07-ghost-comparison.jpg)

Yeniden üretim:

```sh
node scripts/capture-v4.cjs url=http://127.0.0.1:4173 out=test-results/integration-views only=01-start-finish,05-stadium,06-car-closeup,07-ghost-comparison
```
