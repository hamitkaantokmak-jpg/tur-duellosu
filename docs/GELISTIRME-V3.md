# V3 — Meksika tam pist görsel inceleme

8 Kasım 2026. V2 üzerine ayrı geliştirme dalı; main ile birleştirilmedi. HTML/CSS/JavaScript ve Three.js altyapısı korunur.

## Görsel sonuç ve sınır

V2'nin büyük ölçüde boş çevresi yerine tam tur boyunca coğrafi bina/tribün tabanları, ağaçlar, pit yolu, sürekli bariyer/çit, boyalı apronlar ve daha ayrıntılı özgün araç kullanılıyor. Sonuç V2'den belirgin biçimde daha ayrıntılıdır. **Referansın fotogerçekçi seviyesine ulaşılmadı.** Cepheler tekrar ediyor; ağaçlar ve seyirciler stilize, stadyum mimarisi basitleştirilmiş, geniş çim alanlar hâlâ yapay. Bunlar fotoğraf/tarama varlıkları değildir.

[Instagram referansı](https://www.instagram.com/reel/De7JA3GokEu/) Chromium ile açıldı: HTTP 200, oynatılabilir 720×1280 video, 94.625 saniye. Açıklaması Antonelli/Verstappen COTA karşılaştırmasıdır; Meksika coğrafyasına kanıt olarak kullanılmadı. İncelenen yayın kadrajları, gövde/lastik yüzeyleri, yol kenarı yoğunluğu, temas gölgeleri ve uzak çevre derinliği kalite referansı olarak alındı. Video veya takım kaplamaları bu depoya kopyalanmadı.

## Gerçek coğrafya / temsili unsurlar

- Bacinger MIT coğrafi hattı korunur; V3 yalnız görüntü için kapalı centripetal eğriyi yaklaşık 2 m aralıklarla örnekler. Telemetri kayıt/hizalama çekirdeği değiştirilmedi.
- [OSM bbox kaynağı](https://api.openstreetmap.org/api/0.6/map?bbox=-99.098,19.3965,-99.082,19.4075) 2026-11-08 tarihinde indirildi. Pit binaları, iki pit yolu parçası, Foro Sol/GNP tribün tabanları, çevre spor yapıları ve ağaç konumları coğrafi koordinatlardan dönüştürülür. Kaynak veri ODbL 1.0; © OpenStreetMap contributors.
- [Sayısal coğrafi kontrol](../assets/tracks/v3/geographic-check.json): 101 Bacinger noktasından OSM motor yarış yolu segmentlerine en yakın mesafe medyanı 0.779 m, p95 2.035 m, maksimum 2.376 m. Bu karşılaştırma ortak/alternatif Formula E ve oval segmentlerini de içerir; GP topolojisinin veya ölçüm hassasiyetinin bağımsız doğrulaması değildir. Yalnız isimli/Formula E etiketsiz segmentlerle kontrol, ortak yaklaşım bölümünde 64.44 m'lik bir boşluk verir; bu yüzden OSM etiketinden tek başına yarış konfigürasyonu çıkarılmadı.
- Pist genişliği 14–15.6 m, bariyer orta çizgi uzaklığı 16 m, apronlar, kerbler, geçici tribünler, fren tabelaları, boya ve lastik izleri **temsili**. Yüksekliği etiketlenmemiş binaların yüksekliği ve tüm cepheler tasarımdır. Yarış koridoruyla kesişen bir OSM bina tabanı sahneden çıkarıldı; iki kaynak arasında hassas eşleşme iddiası yoktur.
- Güvenilir yükseklik profili olmadığı için Meksika zemini düz tutulur ve tahmini eğim seçeneği kapatılır. Harita 2026 çevresini temsil eder; 2024 yarış haftasının eksiksiz envanteri değildir.
- Ekrandaki araçlar ortak tahmini çizgi üzerinde gerçek telemetri zaman/ilerlemesiyle hareket eder. Sürüş çizgisi veya dekoratif lastik izleri ölçülmüş tekerlek izi olarak sunulmaz. HAM 76.651 s / RUS 76.356 s kaynak tur süreleri korunur.

## Sekiz gerçek tarayıcı karşılaştırması

[V2 / V3 galeri](visual/v3/README.md). Her sürüm için sekiz ayrı **1920×1080 gerçek render**: Chromium/SwiftShader, DPR 1, Ultra, yüksek araç LOD, AO kapalı, dinamik çözünürlük kapalı. JPEG görüntüler ölçeklendirilmiş render değildir. CSS sahne boyutu çekim betiğinde sabitlenmiştir; bu bir performans ölçümü değildir. Zaman, kadraj, delta ve çözünürlük [V2](visual/v3/before/captures.json) / [V3](visual/v3/after/captures.json) dosyalarında bulunur.

Aynı telemetri zamanları ve serbest kamera parametreleri kullanıldı. V3'te yumuşatılan görüntü hattı nedeniyle hedef konumu birkaç metre değişir; genel bakışta uygulamanın pistin kadraja oturmasını düzelten yeni yüksekliği kullanılır. İki araç karesi her iki sürümde araç orta noktasına yöneltilmiştir.

Görüntülerin her biri açılıp gözle incelendi. Değerlendirme:

| Kare | Görülen iyileşme | Gerçekçilik / kalan kusur |
|---|---|---|
| 01 Start/finish | Gerçek konumlu ana tribün ve paddock, garaj ritmi, pit koridoru, çit, araç gölgesi | Cephe ve seyirciler tekrarlı; uzak çevre sade. Asfaltın doku tekrarı yakında hâlâ seçilebilir. Grid başlangıcın arkasındadır. |
| 02 T1–3 | Sürekli kerb/apron, bariyer ve geçici tribünler; çevre yapıları | Genişlik ve apron şekli temsili; çim/sportif alanlar düz. Araç uzak ölçek nedeniyle ayrıntı göstermiyor. |
| 03 T4–6 | Kompleks boyunca tutarlı yüzey ve sınır, kaynak çevre yapıları | Piste taşan geçici çatı çıkarıldı. Bina gölgeleri bazı yüzeylerde sert/aliasingli; yapı cepheleri genel. |
| 04 T7–11 | Hızlı bölümde kerb, bariyer, çit ve yerleşimli çevre; iki araç seçiliyor | Çevre artık boş değil fakat mimari tekrar ve çim basitliği belirgin. Fotoğraf doğruluğunda kaçış alanı yok. |
| 05 T12 yaklaşımı / stadyum | İki büyük kaynak tribün tabanı ve çok sıralı koltuk/seyirci | Foro Sol çatısız ana blokları ayrışıyor. Merdiven/koridorlar ve alt strüktür ayrıntısı eksik; kalabalık statik. |
| 06 Araç yakın çekimi | Kutu arka kanat yerine eğrisel elemanlar, lastik/jant, gövde loftu, halo, süspansiyon, difüzör | V2'den açıkça daha iyi; gövde/yansımalar hâlâ fazla düzgün, gerçek araç taraması değil. Temas gölgesi var; ince gölge aliasingi kalıyor. |
| 07 İki araç | Her iki gerçek tur aynı kadrajda, etiket ve yarı saydam B korunuyor | İlk tek araç kadrajı düzeltildi. Saydam B'nin yüzey üst üste binmeleri ghost gösteriminin sınırlaması; kapatılabilir. |
| 08 Genel görünüm | Tam kapalı tur ve bölgeler boyunca çevre dağılımı; pist artık kadrajı dolduruyor | Harita görünümü temsili, çatı/çim malzemeleri basit; yakın detaylar uzak görünümde kasıtlı gizli. |

Düzeltme döngüsünde: sağ kenarın ters yüzey yönü nedeniyle kaybolması DoubleSide yüzeylerle giderildi; sert değişen kaçış genişlikleri yumuşatıldı; ham normal ofsetin dar virajlarda yaptığı bariyer/çit ilmekleri basit tampon poligonlarıyla kaldırıldı. Piste taşan geçici tribünler koridor kontrolüyle elendi. Büyük asfalt çatlaklarının renk kontrastı ve normal etkisi azaltıldı. Bariyer yazılarının pist içinden ters görünmesi, genel bakışın çok uzak kadrajı ve iki araç çekiminin tek araca odaklanması düzeltildi. Yakın engelleri yok sayan kamera sınırı kaldırıldı. Hareketli tam turda bütün açılar için sıfır clipping garantisi verilmez.

## Araç, ışık ve maliyet

Özgün genel açık tekerlekli model baştan üretildi: 2.01 m genişlik, 3.60 m aks aralığı, 0.36 m lastik yarıçapı; resmî takım geometrisi/kaplaması kopyalanmadı. Sürekli gövde/nose/sidepod yüzeyleri, çok elemanlı kanatlar, kokpit, halo, kask/vizör, süspansiyon kolları, dönen lastik/rim grupları, ön direksiyon pivotları ve difüzör bulunur. Tekerlek dönüşü kaynak telemetri mesafesinden hesaplanır. Meshopt GLB LOD: düşük 30,976 / orta 48,868 / yüksek 102,508 üçgen. Yüksek LOD 1,262,020 bayt. Düşük LOD da V2'den pahalıdır; kalite artışının maliyeti gizlenmez.

CC0 Poly Haven Asphalt 02 (3 m örnekleme), JPEG + UASTC KTX2 mipmap kullanılır. Renk dokusu çatlakları azaltılmış sanatsal türevdir. Kaynak/hash/lisanslar [varlık belgesinde](VARLIKLAR.md). HDRI yansıma, güneş/hemisphere, ACES ve sRGB, araç altı temas gölgesi korunur; güneş/ortam dengesi yeniden ayarlandı. HDRI Meksika gününün fotoğrafı değildir.

Sahne sayacı: 182 bina, 26 kaynak tribün, 673 kaynak ağaç konumu, 28,027 koltuk; bunlar doğruluk puanı değildir. Koltuk/seyirci/ağaç/çit direkleri bölgesel instancing; statik yüzeyler 160 m hücrelerde birleştirilir, uzak hücreler gizlenir. Performans profili seyirci detayını ve normal/roughness haritasını kaldırır; Dengeli yakın detayı azaltır; Ultra yüksek araç LOD ve isteğe bağlı AO sunar. Dinamik çözünürlük gerçek boyutuyla panelde görünür.

## Doğrulama ve performans

Son çalışma: **8/8 çekirdek/geometri testi + 6/6 Playwright senaryosu geçti** ([kayıt](visual/v3/regression-results.txt)). Geometri testi tam tur ve iki bariyer sınırındaki sonlu/kapalı koordinatları ve segment kesişmezliğini kontrol eder. Tarayıcı senaryoları gerçek HAM/RUS verisi, bütün kamera seçenekleri, tur boyunca iki araç için önerilen karşılaştırma kadrajı, profil değişimi, oynatma hızları, analiz/pilot/tur seçimi, tekrarlı dünya kurulumunda kaynak kararlılığı, mobil taşma, sekme gizlenmesi, GLB/KTX2/WebGL yedekleri ve başarısız hizalamada iki turun birlikte geri dönüşünü kapsar. Ağ kaynaklı veri değişimleri testleri etkileyebilir.

İlk uzun test 543 geometriyle eski 500 sınırını aştı; sınır yükseltilmedi. Eş renkli cephe/tribün materyalleri paylaşılarak statik birleştirme iyileştirildi. Son [120 s kontrol](visual/v3/soak-120s.json): 446 geometri, 14 doku, son kare 255 draw call, gerçek 747×294 canvas; 182 aralık, p50 581 ms / p95 1110.8 ms, panelin son FPS penceresi 2.08, son GPU sorgusu 422.14 ms. Bu uzun kontrol kaynak sınırını geçti fakat akıcı değildir; V2'nin yazılım sonucundan daha ağırdır. Tüm turda her nesnenin yüklenmesini veya saatler süren bellek davranışını kanıtlamaz.

Ayrı, başka Chromium testi çalışmıyorken alınan [gerçek 1080p yazılım örnekleri](visual/v3/1080p-software.json): her profil için 20 s istendi, DPR 1 ve dinamik çözünürlük kapalı. Performans profilinin normal .85 oran sınırı yalnız ölçüm betiğinde 1'e zorlandı; uygulamanın varsayılanı değiştirilmedi.

| Profil | Gerçek render | Kaydedilen aralık | p95 aralık | Son GPU sorgusu | Son draw call |
|---|---|---:|---:|---:|---:|
| Performans | 1920×1080 | 9 | 5506.1 ms | 2090.1 ms | 142 |
| Dengeli | 1920×1080 | 9 | 12320.5 ms | 3195.9 ms | 230 |
| Ultra | 1920×1080 | 4 | 6583.2 ms | 3522.7 ms | 313 |

Bu örnekler çok kısa ve çok az kare içeriyor; shader ısınması, sürücü kuyruğu ve kare kümelenmesi yüzünden profilleri FPS sırasına koymak için kullanılamaz. JSON'daki `fps`, panelin son kısa penceresidir; tüm örneğin ortalama throughput'u değildir. Sonuç yazılım çizicisinin hedeflerden çok uzakta olduğunu gösterir. Betik: `node scripts/measure-v3.cjs url=http://localhost:4173 out=docs/visual/v3`.

SwiftShader yazılımsal çizicidir; fiziksel GPU yoktur. **Orta GPU'da 1080p/60 FPS veya düşük cihazda 30 FPS doğrulanmadı.** Yazılım çizimi ciddi biçimde yavaştır; görüntü kalitesi incelemesi akıcı oyun performansı kanıtı sayılmaz.

## Yeniden üretim

```sh
npm ci
npm test
# Yalnız varlık yeniden üretimi için (uygulamayı açmak için gerekmez):
python3 -m pip install shapely==2.1.2
npm run assets:build
# OSM XML'ini kaynak bbox URL'sinden indirip:
python3 scripts/prepare-venue.py mexico.osm
# Çalışan yerel sunucudan sekiz kare:
node scripts/capture-v3.cjs url=http://localhost:4173 out=docs/visual/v3/after
```

Çekim betiği gerçek arşiv verisini kullanır; internet ve Chromium gerekir. Referans videonun telifli görüntüleri dağıtılmaz. Yeni V3 PR, mevcut V2 geliştirme dalını baz alır; V2 bağımlılığı korunur, main için birleştirme yapılmaz.
