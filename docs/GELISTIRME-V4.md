# V4 — Blender varlık hattı ve gerçek tarayıcı görsel incelemesi

8 Kasım 2026. V4, henüz main'e birleştirilmemiş V3 üzerine kurulmuştur. HTML/CSS/JavaScript, Three.js ve gerçek telemetri hesaplamaları korunur. Main birleştirmesi yapılmaz.

## Sonuç ve tamamlanma sınırı

Bu sürüm gerçek bir **Blender → GLB → Meshopt → Three.js** hattı getirir. Blender 4.3.2 ortamda çalıştırıldı; üç düzenlenebilir `.blend` kaynak dosyası, üretim betikleri, dışa aktarma ayarları ve kaynak/lisans kayıtları depodadır. Araç ile çevre kütüphanesi yeni Blender geometrileridir. Ağaç, Rico Cilliers'in CC0 Poly Haven varlığından hazırlanır. Çalışan uygulama bu dosyaları gerçekten yükler; yalnız belgede önerilmiş bir üretim hattı değildir.

**Profesyonel yarış simülasyonu / referans videosu fotogerçekçiliğine ulaşıldığı iddia edilmez.** Yeni araç hâlâ özgün, algoritmik olarak modellenmiş genel bir tasarımdır; uzman bir otomotiv sanatçısının tamamladığı lisanslı araç taraması değildir. Ana çevre bina kabukları ve tribün tabanları hâlâ sadeleştirilmiş OSM görselleştirmeleridir. Bu V4 teslimatı anlamlı bir varlık hattı ve görsel iyileştirmedir; profesyonel sanat üretiminin tamamı bitmiş sayılmaz.

## V3 incelemesi ve uygulanan değişiklikler

V2 PR #1 ve V3 PR #2 incelendi; ikisi de başlangıçta açık ve birleştirilmemişti. Yerel V3 dosya ağacı, GitHub'daki V3 ağacıyla aynıdır. İnceleme bulguları:

- V3 araçları `scripts/car-v3.mjs` içindeki JavaScript geometrilerinden GLB'ye aktarılıyordu. Silüet şişkin, kanat uçları büyük, lastik/yansıma dengesi yetersizdi.
- Çevre, coğrafi ayak izlerinden yükseltilen sade kabuklar, kutu cephe panelleri, eğimli tribün yüzeyleri ve küresel ağaçlardan oluşuyordu. İç bölgelerin geniş çim alanları ve tekrar eden cepheler yapay görünüyordu.
- Asfalt çatlakları tekrarlanıyor, gün doğumu HDRI'si kauçuk/metal yüzeyleri gereğinden fazla renklendiriyordu. Kamera kaynaklı sorunlar geçiş sırasında engel sınırı ve serbest kameranın duvardan geçebilmesiydi.
- Mevcut GLB havuzu düşük/orta LOD'u başta, yüksek LOD'u Ultra'da yüklüyor; tekerlek ve direksiyon düğümlerini koruyor. Dünya yeniden kurulumlarında paylaşılan kaynakların ömrü önemlidir.
- V4 ilk yakın-ağaç denemesi, tüm 160 m hücreyi yüksek LOD'a geçirerek gereğinden fazla üçgen çiziyordu. Seçim ağaç başına gerçek kamera mesafesine çevrildi; seçim değişmedikçe instance buffer tekrar yüklenmez.

Yeni araç: kontrollü gövde/sidepod kesitleri, açık kokpit, halo/kask/vizör, karbon kanat elemanları ve taban, süspansiyon, fren rotorları, jant/lastik yanak halkaları ve arka difüzör. Temsili genişlik 2.0 m, aks aralığı 3.32 m, lastik yarıçapı 0.36 m. Resmî takım modeli veya sponsor kaplaması kullanılmadı. Gerçek telemetri mesafesiyle tekerlek dönüşü korunur. İsimleri pivotla başlayan alt mesh'lerin ikinci kez döndürülmesi önlendi; yalnız boş animasyon pivotları seçilir.

Araç LOD bütçeleri: düşük **14,606**, orta **40,586**, yüksek **59,498** üçgen. V3 yüksek LOD 102,508 üçgendi. Silüet ve malzemeler yeniden ele alınırken bütçe azaltıldı; bu tek başına tüm uygulamanın hızlandığı anlamına gelmez.

Blender çevre kütüphanesi: garaj kepenk/pencere/saçak modülleri, pahlanmış beton bariyer, koltuklu geçici tribün, stadyum merdiven/korkuluk/taşıyıcı modülü, kontrol kulesi, kafes köprü, aydınlatma direği, uzak şehir bloğu ve yedek ağaç. Ana iki Foro Sol tribününe koridorlar oturtulur; koridor alanındaki koltuk/seyirciler kaldırılır. Bunlar ölçülmüş mimari detay iddiası taşımaz.

## Tam pist ve coğrafi doğruluk

V3 Bacinger/OSM hattı, coğrafi hizalama ve gerçek tur ilerlemesi korunur. Meksika'nın bütün turunda yeni mikro-asfalt, temizlenmiş sınır eğrileri üzerinde kesintisiz Blender bariyerleri, yeni bitki örtüsü ve ışık/atmosfer kullanılır. Pit cephesi detaylandırılır; ilk, orta ve hızlı kompleksler ile stadyum/son düzlüğe dönüş aynı materyal sistemiyle çizilir. Yeni uzak şehir, köprü, kule, ışık direkleri ve geçici tribünler **temsili** yerleşimlerdir. OSM ağaç noktaları tür bilgisi sağlamaz; kullanılan ağacın Meksika'daki gerçek tür olduğu iddia edilmez.

Genişlik, eğim, geçici yapılar ve etiketlenmemiş yükseklikler için yeni ölçüm yapılmadı. Meksika zemini düz kalır. V3'teki yaklaşık ortak çizgi, dekoratif lastik izleri ve ilerleme deltası ölçülmüş pilot yarış çizgisine dönüştürülmez. HAM/RUS 76.651 / 76.356 saniye kaynak tur süreleri, hız/gaz/fren/vites/RPM, tur/pilot seçimi, zaman çizelgesi, fren ve yarış analizi korunur.

## Materyal, ışık, kamera ve kaynak ömrü

- Özgün, tekrarı düşük mikroaggregate asfalt color/normal/roughness; KTX2 UASTC/mipmap + JPEG yedeği. Bu bir Meksika asfalt fotoğrafı değildir.
- CC0 Concrete Floor 02, Brown Mud Leaves 01'den türetilen temsili turf, yeni nötr gün ışığı HDRI'si ve gerçek gökyüzü görüntüsü. ACES/sRGB, araç temas gölgesi ve isteğe bağlı Ultra AO korunur. Materyaller desteklenmeyen Blender shader düğümlerine dayanmaz.
- CC0 Tree Small 02; 512 px yakın model haritaları, üç açıdan gerçek Cycles CPU render'ı ve 1536×512 atlas. Yakında 3D model, yaprak rekonstrüksiyonu ve uzakta hafif görünüm kartları kullanılır. Bu yaklaşımın sabit pişmiş ışık, düz kart/paralaks ve LOD geçiş kusurları vardır. Bitki örtüsünün her mesafede tam hacimsel olduğu söylenmez.
- Statik mekânsal birleştirme, bölgesel instancing, mesafeye bağlı detay, üç araç LOD'u, doku paylaşımı ve kalite profilleri korunur. Yeni dünya kurulurken eski ağaç geometrileri/materyalleri ve değiştirilen zemin dokusu bırakılmaz; paylaşılan kaynak haritaları korunur.
- Otomatik kamera geçişinden sonra da engel sınırı uygulanır. Serbest kameranın lens hareketi önceki güvenli konumdan taranarak görünür katı duvar/yapılarda durdurulur. Test gerçek pist bariyerini kullanır. Bu, bütün bitki örtüsünün katı çarpışma yüzeyi olduğu veya her özel açı için sıfır clipping garantisi anlamına gelmez.

[Blender kaynakları, adımlar ve dışa aktarma ayarları](../art/blender/README.md) · [V4 varlık kaynakları / SHA-256](../assets/v4/sources.json) · [Üçgen/dosya bütçesi](../assets/v4/manifest.json)

## Sekiz gerçek V3/V4 karşılaştırması

[Karşılaştırma galerisi](visual/v4/README.md). Aynı gerçek kamera koordinatı, hedef, telemetri zamanı, delta, **1920×1080 render**, DPR 1, Ultra, AO kapalı ve dinamik çözünürlük kapalı. `scripts/verify-v4-captures.py` bu eşleşmeyi kontrol eder; görsel kaliteyi otomatik puanlamaz. Her görüntü açılıp gözle incelendi; belirgin kusurlar düzeltilerek tekrar çekildi.

| Kare | Model, materyal, ışık ve çevre değerlendirmesi | Doğruluk / tutarlılık / kalan eksik |
|---|---|---|
| Ana düzlük / pit | Garaj kepenkleri, çerçeve/saçak ritmi, köprü, yeni araç ve beton yüzeyi görülür. Asfaltın uzun çatlak tekrarı kalkar; gökyüzü/yansıma daha nötr. | Aynı coğrafi hat. Köprü ve detaylar temsili; ana tribün kalabalığı ve üst cephe tekrarları hâlâ yapay. |
| İlk virajlar | Bariyer artık seyrek bloklar yerine sürekli modüller; çit, aydınlatma ve yeni yüzeyler bütün komplekse yayılır. | Genişlik/kaçış alanı ölçülmüş değildir. Büyük iç çim alanları ve bazı sade çatılar hâlâ zayıf. Uzak araçta model ayrıntısı değerlendirilemez. |
| Orta bölüm | Sürekli pahlanmış bariyer, kerb/asfalt kontrastı ve ayrıntılı kaynak ağaç silüeti. Üst açıdaki boş taç sorunu üst atlasla azaltıldı. | Ana bina kabuklarının mimarisi sade kalır. Ağaç kartları bazı açılarda seçilebilir; ince gölge aliasingi sürer. |
| Hızlı virajlar | İki araç seçilir; aynı yol kenarı dili, ışık direkleri ve bitki örtüsü korunur. Malzeme/ışık tüm turla tutarlı. | Kaynak ayak izleri korunur. Cephe tekrarları ve geniş çim/saha yüzeyleri profesyonel çevre sanatı seviyesine gelmedi. |
| Stadyum | İki ana blokta yeni merdiven/koridor, korkuluk ve taşıyıcı modülleri; koridorların koltuklardan temizlenmesi, devamlı bariyer ve ışıklar. | Tribün tabanı OSM'dir; yükselti, koridor ve strüktür temsilidir. Seyirci modelleri, büyük kabuk/çatı ayrıntıları ve stadyum içi sanat üretimi hâlâ eksik. |
| Araç yakın çekimi | Yeni karbon kanat/gövde, lastik, süspansiyon ve difüzör okunur. V3'ün parlak şişkin silüetinden farklıdır; zemin teması sayısal testle doğrulanır. | Tam otomotiv sanatçısı modeli değil; bazı paneller/kanat uçları sade ve yansımalarda bantlaşma var. Gerçek takım/yıl geometrisi iddiası yok. |
| İki araç ghost lap | İki tur aynı kadrajda; gövde ve lastikler farklı açıda okunur. B saydamlığı ve etiketler korunur. | Saydam yüzeylerin üst üste binmesi sürer; B saydamlığı kapatılabilir. Geometrik tahmini çizgi gerçek ölçülmüş pilot çizgisi değildir. |
| Genel görünüm | Tam kapalı pist, kaynak çevre ve yeni bariyer dağılımı görülebilir; üstten ağaçlar için atlas üst görünümü ve uzak LOD kullanılır. | Genel bakış sade bir harita/sahne okumasıdır. Uzak şehir bu modda gizlenir; çatılar ve zemin sade, profesyonel bir hava fotoğrafı değildir. |

Düzeltme döngüsü: pit birleşiminde ana yüzeyin üstüne çıkan farklı gri şerit, pit asfaltını ana PBR malzemesiyle eşleyip ana yolun altında çizerek giderildi; ilk araç kanat plakaları küçültüldü/yeniden biçimlendirildi; eski küresel ağaçlar lisanslı varlıkla değiştirildi; seyrek bariyer blokları sürekli sınır yerleşimine dönüştürüldü; üst görünümde ağaçların kaybolması düzeltildi; stadyum koridorları açıldı; pivot isim eşleşmesi, yakın-ağaç LOD seçimi ve kamera hareket engeli düzeltildi. Her karede performans görüntüden çıkarılamaz; aşağıdaki ayrı ölçümlere bakılmalıdır.

## Test, gerçek zamanlı oynatma ve performans

**9/9 çekirdek/varlık testi ve 8/8 Playwright senaryosu geçti** ([kayıt](visual/v4/regression-results.txt)). Varlık testi gerçek GLB içindeki dört tekerlek/iki direksiyon pivotunu, UV'leri, üç LOD bütçesini, dönüştürülmüş gerçek vertex sınırlarıyla ölçek ve lastik zemin temasını kontrol eder. Tarayıcı testleri gerçek HAM/RUS yükleme, kamera/kalite/hız seçenekleri, analizler, pilot/tur seçimi, tekrarlı dünya kurulumunda kaynak kararlılığı, mobil görünüm, sekme gizlenmesi ve WebGL/GLB/KTX2/çevre varlığı yedeklerini kapsar. Yeni serbest kamera testi gerçek pist bariyerinde lens hareketinin durduğunu doğrular.

Son dünya durumu temizliği ve pit yüzey/katman düzeltmesinden sonra 9 birim/varlık testi, hizalama geri dönüşünde V4 nesnelerinin temizlenmesini doğrulayan hedefli tarayıcı testi, sözdizimi/diff kontrolü ve eşleşen sekiz son görüntü yeniden kontrol edildi. Tam sekiz senaryolu çalışma bu son küçük değişikliklerden önce; hedefli son doğrulama onlardan sonradır. Blender’ın otomatik `.001` malzeme ad ekleri normalize edildi; son hedefli ana tarayıcı senaryosu tüm araç LOD’larında karbon ve çevrede beton PBR haritalarının gerçekten bağlandığını doğrulayarak geçti. Native1080p örnekleri ve sekiz eş görüntü bu son malzeme düzeltmesiyle tekrar alındı.

[120 saniyelik Performans profili kontrolü](visual/v4/soak-120s.json): **485 geometri, 26 doku**, son kare 122 draw call, gerçek **747×294 canvas**. 93 aralık; p50 1030.3 ms, p95 1814.5 ms; panelin son FPS penceresi 1.90, son GPU sorgusu 703.2 ms. Mevcut 500 geometri sınırı yükseltilmedi. Bu sınırlı yazılım kontrolü saatler süren kararlılık veya 30/60 FPS kanıtı değildir. V3'ün 2.08 FPS'lik son penceresiyle aynı sahne anı olmadığı için yüzde hız kıyaslaması yapılmaz; iki sonuç da akıcı değildir.

[Ayrı native1080p ölçümleri](visual/v4/1080p-software.json), başka Chromium testi/Blender render'ı çalışmıyorken üç profil için alındı. DPR1, gerçek 1920×1080, adaptif çözünürlük kapalı; Performans profilinin normal .85 oran sınırı yalnız ölçüm betiğinde 1'e zorlandı. Her profil için 20 saniye istendi; araç/sürücü kuyruğu nedeniyle gerçek örnek süresi uzadı.

| Profil | Aralık | Duvar saati | p95 aralık | Son GPU sorgusu | Son draw call | Geometri |
|---|---:|---:|---:|---:|---:|---:|
| Performans | 7 | 22.753 s | 6416.9 ms | 3018.3 ms | 162 | 278 |
| Dengeli | 7 | 20.977 s | 15152.8 ms | 4842.3 ms | 299 | 350 |
| Ultra | 3 | 27.916 s | 105.1 ms | 4510.0 ms | 460 | 405 |

Yalnız 3–7 aralık içeren bu örnekler shader ısınması, kuyruk ve kare kümelenmesi yüzünden güvenilir profil sıralaması değildir. JSON'daki FPS panelin son kısa penceresidir; tüm örneğin ortalama throughput'u değildir. Ultra örneğinde 405 geometri görülür; 500 guard'ı ayrı uzun Performans profili testine aittir. Ultra’daki üç aralık ve önceki pencereden kalan FPS değeri performans sonucu çıkarmak için yeterli değildir. Asıl sorun yazılım çizicisinin saniyelere çıkan kare maliyetidir. **Fiziksel GPU aygıtı yoktur; 1080p/60 FPS ve düşük cihazda 30 FPS doğrulanmadı.**

[Gerçek oynatma videosu](visual/v4/playback.webm) **103.146 saniyelik Chromium kaydıdır**; hızlandırılmadı, yazılımsal çizim duraklamaları korunur. Dört ayrı bölüm (A takip, alçak açı, TV, iki araç) her defasında gerçek telemetri t=10 s'den 1× başlatılır; zaman sıfırlamaları test kurulumu olup kesintisiz tek tur iddiası yoktur. Son örneklerin hepsinde oynatma açıktır ve zaman ilerlemiştir. [Ham ölçüm/kadraj kaydı](visual/v4/playback.json) ve dört kamera JPEG'i aynı dizindedir. Kaydın çözünürlüğü adaptiftir (örnekler 1246×612 / 747×367); 1080p videosu veya akıcı 30/60 FPS gösterimi olarak sunulmaz. Gölgeler/etiketler ve takip kontrol edildi; düşük çözünürlükte titreşim/aliasing ve bitki kartlarının paralaksı kalır. Alçak açı A'yı takip eder; B'nin o dar kadraj dışında kalması iki araç kamerasının kaybıyla karıştırılmaz.

Video da son pit yüzeyi ve malzeme adı düzeltmeleriyle tekrar kaydedildi. Kaynakları tekrar üretmek ve testleri çalıştırmak için betikler ve Blender README kullanılır.

## Sonraki sanat ve mühendislik işleri

1. Otomotiv sanatçısı tarafından gövde/kanat silüeti ve materyal bitişi; sponsor/takım haklarından bağımsız ayrıntılandırma.
2. Foro Sol, pit ve ana tribün için özel mimari model, merdiven/koridor/süpürgelik/alt yapı revizyonu; gerçek plan/ölçüm bulunursa temsilî unsurların yenilenmesi.
3. Seyirci/çit dokusu atlası, daha iyi bitki impostoru ve yumuşak LOD geçişi, iç peyzaj çeşitliliği.
4. Fiziksel orta/düşük GPU'da aynı kameralarla sabit 1080p, shader warm-up, GPU profiler ve uzun süreli bellek/oynatma testi. Gerekirse bölgesel detay ve materyal maliyetine göre bütçe ayarı.

Kurulum/üretim/test adımları kaynak README'lerinde ve betiklerde bulunur. Hazır varlıklarla uygulama normal statik sunucudan çalışır; kullanıcının Blender kurması gerekmez.
