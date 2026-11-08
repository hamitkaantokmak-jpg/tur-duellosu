# Varlıklar, lisanslar ve yeniden üretim

## Harici kaynaklar

| Dosyalar | Kaynak / yazar | Lisans | Kullanım ve sınır |
|---|---|---|---|
| `assets/tracks/mexico.geojson`, `mexico.js` | [Tomislav Bacinger / f1-circuits](https://github.com/bacinger/f1-circuits/blob/master/circuits/mx-1962.geojson) | MIT; `assets/tracks/LICENSE-MIT.txt` | Sabit coğrafi hat. `mx-1962` pistin açılış kimliğidir; güncel pist sınırlarının veya 3D taramanın doğrulandığı anlamına gelmez. |
| `asphalt-*.jpg`, türev `.ktx2` | [Poly Haven — Asphalt 02](https://polyhaven.com/a/asphalt_02), Rob Tuytel | CC0-1.0 | 1K color, OpenGL normal ve roughness; kaynağın bildirdiği ölçek 3×3 m. KTX2 türevleri mipmap içerir. V3 renk dokusu büyük çatlakları azaltılmış sanatsal türevdir; Meksika yüzey fotoğrafı değildir. |
| `spruit-sunrise.hdr` | [Poly Haven — Spruit Sunrise](https://polyhaven.com/a/spruit_sunrise) | CC0-1.0 | 1K HDRI yalnız aydınlatma/yansıma ortamıdır; Meksika çevresinin fotoğrafı veya yarış gününün ışığı olarak sunulmaz. |

Poly Haven'ın [lisans sayfası](https://polyhaven.com/license) CC0 durumunu doğrular. CC0 metni `assets/licenses/CC0-1.0.txt` içindedir. Kaynak URL, dosya boyutu ve SHA-256 değerleri `assets/sources.json` içinde tutulur; indirilen orijinal dosyaların MD5 değerleri Poly Haven API yanıtıyla doğrulandı.

## Projeye özgü varlıklar

`assets/cars/open-wheel-{low,medium,high}.glb`, `scripts/build-car.mjs` ile bu proje için üretilen genel açık tekerlekli tasarımdır. Üçüncü taraf araç modeli, takım logosu, sponsor kaplaması veya resmî takım geometrisi kullanılmaz. Gövde loft yüzeyleri, kanatlar, halo, kokpit, ayna, süspansiyon, difüzör ve ayrı tekerlek düğümleri bulunur. Meshopt sıkıştırmalıdır; üçgen/dosya bütçeleri `assets/cars/manifest.json` içindedir. Bu dosyalar gerçek bir F1 aracının lisanslı/dijital kopyası değildir. Projenin tamamına yeni bir lisans atanmamıştır.

V3 stadyum/pit/çevre bina tabanları ve ağaç konumları © OpenStreetMap contributors verisinden gelir (ODbL 1.0). `assets/tracks/v3/venue-osm.{json,js}` ayrı lisanslı türev veri tabanıdır; lisans `assets/licenses/ODbL-1.0.txt`. Etiketlenmemiş yükseklikler, cepheler, tribün koltukları, geçici tribünler, bariyerler, kerbler ve işaretler temsili olarak üretilir. Harita 2026 tarihli olup 2024 yarış haftasının doğrulanmış envanteri değildir. Bina temaslı pist koridoru atlanır; geometri tarama doğruluğu iddiası yoktur.

## Kod bağımlılıkları

- Three.js **0.180.0**, MIT; lisans kopyası `assets/licenses/THREE-MIT.txt`. Çalışma anında jsDelivr'dan sabit sürüm ESM/addon yüklenir.
- Meshoptimizer **0.25.0**, MIT; lisans `assets/licenses/MESHOPT-MIT.txt`. GLB şablonları build sırasında Meshopt ile sıkıştırılır; çalışma anında Three.js Meshopt decoder kullanılır.
- GLTF Transform **4.2.1**, MIT; yalnız geliştirme/varlık hazırlama bağımlılığı.
- Basis Universal build aracı: v1.15 encoder, npm `basisu@1.16.3` dağıtımındaki Linux binary ile KTX2 UASTC oluşturuldu. Encoder uygulamayla dağıtılmaz. Çalışma anındaki Basis transcoder Three.js sabit sürüm addon dizininden gelir.
- Telemetri mevcut [TracingInsights](https://github.com/TracingInsights) / FastF1 arşivinden canlı yüklenir. Yeni veri paketi dağıtılmadı. Veri erişim/lisans koşulları görsel varlık lisanslarından bağımsızdır.
- Mevcut Google Fonts bağlantıları korunur.

## Yeniden üretim

```sh
npm ci
npm run assets:build
# İsteğe bağlı, ayrıca kurulmuş basisu encoder ile:
BASISU=/path/to/basisu node scripts/compress-textures.cjs
```

Hazır GLB/KTX2 dosyaları depoda bulunduğu için uygulamayı açmak için encoder veya uygulama build'i gerekmez. JPEG yedekler sıkıştırılmış dokunun desteklenmediği/yüklenemediği durumda kullanılır. KTX2'nin indirme boyutu JPEG'den büyük olabilir; amacı uygun GPU formatında doku belleği ve örnekleme maliyetini azaltmaktır.

V3 coğrafi sahne yeniden üretimi: `node scripts/prepare-mexico-v3.mjs`; kaynak URL’den indirilen OSM XML için `python3 scripts/prepare-venue.py mexico.osm`. V3 araç yüzeyleri `scripts/car-v3.mjs` içindedir. OSM adres/iletişim etiketleri türev dosyalara alınmaz.

## V4 varlık hattı

V4, hazır `assets/v4/car-{low,medium,high}.glb` ve `venue.glb` dosyalarını yükler. Bunlar Blender 4.3.2 ile üretilmiş özgün varlıklardır; kaynaklar `art/blender/*.blend`, üretim/dışa aktarma adımları [Blender README](../art/blender/README.md) içindedir. Önceki V3 araçları tarihsel/yeniden üretim amacıyla korunur. V4 mikro-asfalt haritaları özgün üretimdir. Tüm projeye yeni bir lisans atanmadı.

- [Tree Small 02](https://polyhaven.com/a/tree_small_02), Rico Cilliers, CC0 1.0: 7 m temsili ölçek, yakın LOD sadeleştirme, 512 px haritalar ve Cycles CPU atlası türevleri. Tür Meksika için doğrulanmadı; kaynak Geometry Nodes varlığıdır, pist taraması değildir.
- [Concrete Floor 02](https://polyhaven.com/a/concrete_floor_02), Rob Tuytel, CC0: beton yüzeyleri.
- [Brown Mud Leaves 01](https://polyhaven.com/a/brown_mud_leaves_01), Rob Tuytel, CC0: özgün temsili turf paletinin mikro yüzey girdisi.
- [Kloofendal 48d Partly Cloudy PureSky](https://polyhaven.com/a/kloofendal_48d_partly_cloudy_puresky), Greg Zaal / Jarod Guest, CC0: nötr gün ışığı ve gökyüzü; Meksika yarış günü görüntüsü değildir.

URL, değişiklik, lisans, SHA-256 ve boyutlar [V4 kaynak manifestinde](../assets/v4/sources.json); kaynak ağacın indirme MD5 doğrulamaları `art/blender/tree-source.json` içindedir. CC0 metni `assets/licenses/CC0-1.0.txt`. Orijinal ~95 MB kaynak ağaç buffer'ı yerine hazırlanmış GLB ve düzenlenebilir Blender türevi dağıtılır; betik doğrulanmış orijinali tekrar indirebilir. OSM/Bacinger lisansları ve veri/ölçüm sınırları değişmez.
