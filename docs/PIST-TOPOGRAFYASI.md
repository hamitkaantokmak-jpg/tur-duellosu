# V5: pist yüzeyi, topografya ve araç yerleşimi

## Kapsam ve veri doğruluğu

Başlangıç: `main` / `e91e27c7ecde7801541773788a47b4354c47176b`. V5 mevcut renderer, V3 pist/kerb mesh'leri, V4 varlıkları, LOD profilleri ve kamera dar-faz önbelleğini kullanır. Telemetri ayrıştırıcısı, `replay-core.js`, zaman çizelgesi, grafikler ve Veri Stüdyosu hesapları değiştirilmez. Çevreye yeni dekorasyon eklenmez.

**Üretim Meksika pistine ölçülmüş yükseklik veya banking eklenmedi.** Üretim profil kayıt defteri boştur; Meksika düz davranışını korur. `verified`, `derived`, `illustrative`, `unavailable` dört ayrı doğruluk sınıfıdır. Profilin kaynak ve lisans alanları zorunludur. Kaynaksız profile gerçeklik atfedilmez. Diğer pistlerde eskiden bulunan, kullanıcı tarafından açılan telemetri-Z görselleştirmesi `illustrative` olarak etiketlenir; Z birimi/datumunun doğrulandığı iddia edilmez.

Sentetik profil yalnız test dosyasındadır, normal sayfaya yüklenmez. Çalışması için birlikte üç koşul gerekir: loopback host, `?topographyTest=synthetic` ve testin `TOPOGRAPHY_TEST_PROFILE` enjekte etmesi. Ekranın içinde **SENTETİK TEST · gerçek Meksika/COTA yüksekliği değildir** etiketi görünür. 40 m tepe ve seçilen mesafeler mühendislik senaryosudur; gerçek COTA veya Meksika verisi değildir.

## İncelenen gerçek kaynaklar

10 Kasım 2026 tarihinde:

| Kaynak | Desteklediği bilgi | Kullanım / lisans durumu |
|---|---|---|
| [FIA 2025 Meksika pist planı](https://www.fia.com/system/files/decision-document/2025_mexico_city_grand_prix_-_event_notes_-_circuit_map_pit_lane_drawing_emergency_exits_map_and_quarantine_zone_area.pdf) | Merkez çizgisi 4.304 km; virajlar ve kontrol çizgileri. Kullanılabilir mesafe–yükseklik/banking tablosu bulunmadı. | Yalnız kaynak incelemesi. Belge FOWC/FIA hak bildirimleri içerir; belge veya geometri kopyalanmadı. |
| [COTA resmi T1 açıklaması](https://circuitoftheamericas.com/ticket/grandstands-and-reserved-seating-f1/) | T1 için 133 feet yükseliş ifadesi. | Olgusal referans; yeniden kullanılabilir sayısal pist yüzeyi lisansı sunulmadı. |
| [NASCAR at COTA, 19 Mayıs 2021](https://www.nascaratcota.com/news/numbers-nascar-circuit-americas.html) | Start/finish ile T1 tepesi arasında 133 feet ifadesi. | Olgusal referans; örneklenmiş mesafe aralığı veya sayısal profil yok. |

133 feet birim dönüşümü 40.5384 m'dir; bu sayı üretim geometrisine yazılmadı. İki referans tepenin ayrıntılı başlangıç/bitiş istasyonlarını, eğri şeklini ve enine eğimini sağlamaz. Bunlardan tam COTA profili çıkarmak doğrulanmış ölçüm sayılmaz. COTA oynanabilir yeni pist olarak eklenmedi. Meksika için güvenilir ve lisansı uygun boyuna/enine profil bu çalışma kapsamında bulunamadı; profil uydurulmadı.

Yeni DEM verisi kullanılmadı. İleride DEM'den türetilen profil `derived` olmalı; grid çözünürlüğü, dikey datum, filtreleme, koordinat dönüşümü ve pist/zemin ayrımı belgelenmeli. Genel arazi yüksekliği asfalt bankingi ölçümü değildir. Önceki yatay referans/çevre kaynaklarının MIT ve ODbL bildirimleri [VARLIKLAR.md](VARLIKLAR.md) içinde korunur. Yeni sentetik fixture CC0-1.0'dır.

## Mimari ve veri biçimi

`src/track-topography.js` bağımsız, Node testleriyle ortak kullanılan yüzey çekirdeğidir. Three.js yalnız quaternion adaptöründe parametre olarak alınır. `src/ghost-topography.js` mevcut sahneye bağlar.

```js
const track = TrackTopography.create({
  length: 4304,                 // kanonik istasyon periyodu, metre
  centerline: u => reference.sample(u), // mevcut X/Z; 0 <= u < 1
  width: 14,                   // tam genişlik, metre
  profile: {
    metadata: {
      category: 'derived',
      source: 'Doğrulanabilir veri URL/kayıt kimliği ve dönüşüm yöntemi',
      license: 'Verinin açık lisansı ve sürümü',
      label: 'DEM yaklaşık yüksekliği · banking ölçülmedi'
    },
    samples: [
      {distance: 0, elevation: 0, banking: 0, width: 14},
      // ... gerçek kaynaklı ara istasyonlar ...
      {distance: 4304, elevation: 0, banking: 0, width: 14}
    ]
  }
});
track.sampleAtDistance(120, 2); // ikinci parametre sağa yatay ofset, metre
// distance, position:{x,y,z}, elevation, gradient, banking, width,
// surfaceNormal, tangent, right
track.project(x, z, stationHint); // istasyon, sağa ofset, yatay karesel hata
track.heightAt(x, z, stationHint);
```

Örnekte ara veriler yer tutucudur; bu örnek gerçek profil değildir. Elevation metre, banking radyan, gradient boyutsuz dy/d(yatay metre), koordinatlar Y-up'tır. Yerel araç +Z ileri, +X sağ, +Y yukarıdır. Pozitif banking sağ kenarı yükseltir. Kaynak pozitiflik yönü tersse içeri aktarırken açıkça dönüştürülmelidir.

Örnekler sonlu, istasyonlar kesin artan, başlangıç 0 ve bitiş `length` olmalı. Başlangıç/bitiş yükseklik, banking ve genişlikleri eşit olmalıdır. Hatalı seam sessizce düzeltilmez. Banking bu sürümde ±0.35 radyanla sınırlandırılır. Bu bir pist verisi doğrulama sınırıdır; yarış fizik motoru değildir.

Yükseklik/banking/genişlikte periyodik monoton kübik Hermite interpolasyonu kullanılır. Ekstremumlarda türev sıfırlanır, arada ağırlıklı harmonik türev kullanılır. Böylece aşım olmadan C1 yükseklik ve kapalı seam sağlanır. Yatay yol yaklaşık 2 m istasyon aralığında bir kez önbelleğe alınır; mevcut yatay şekil yeniden tasarlanmaz. İleri yön yerel 6 m komşulukta kararlı türetilir. Yatay yolun ayrık köşe yaklaşımı ölçüm hassasiyeti iddiası değildir.

Yüzey yüksekliği `elevation(s) + lateral * tan(banking(s))` olarak hesaplanır. Normal, boyuna türev ve enine eğimden; tangent ve right sağ elli ortonormal bazdan çıkarılır. Boyuna türev banking değişimini ve ofset eğrisinin eğrilik düzeltmesini içerir. İç yüzey katlanmasına yol açan genişlik/ofset sorgusu reddedilir. V3 asfaltın X/Z üçgen yapısı ve buffer ile sadeleştirilmiş bariyer sınırları korunur; yükseklik eklenerek yeni yatay hairpin döngüleri yaratılmaz.

## Telemetri mesafesi ile render istasyonu

Telemetri zaman ve mesafeleri yeniden ölçeklendirilmez. Kanonik pistte istasyon tahmini mevcut `phase + dir * nativeProgress` ile alınır. Araç X/Z konumuna yakın yüzey segmenti, bu istasyon etrafında aranır; bu özellikle birbirine yakın pist kollarında yanlış seviyeye geçmeyi önler. Kameralarda daha uzak lens ofsetleri için yerel arama alanı büyür. Yapı zamanında koordinat projeksiyonları 32 m hücreli segment dizini kullanır.

3D yüzey ark uzunluğu telemetri mesafesinden farklı olabilir. `length` istasyon periyodudur; 3D hipotenüs uzunluğu hesaplanıp tur zamanına veya tekerlek kilometre sayacına yazılmaz. Tekerlek dönüşü önceki gibi `ReplayCore.distanceAt` ile gerçek kaynak mesafesinden alınır. Varsayılan tahmini ortak sürüş çizgisi ve onu kapatınca kullanılan native pilot çizgileri korunur.

## Mesh, kerb ve zemin

Statik geometri önce mevcut düz mimariyle kurulur, sonra yüzey yüksekliği bir kez uygulanır. Aynı X/Z için yapı zamanı yükseklik önbelleği kullanılır. Asfalt, çizgiler, kerbler, pit yolu, buffer bariyerler ve tel çizgiler aynı alanı izler. Geometri normalleri/sınırları güncellenir. V4 bariyer/fence instance'larının konumu ve quaternion'u yüzeye uyar; ortak model geometrisi değiştirilmez. Yeni profil referansı dünyayı yeniden kurar ve kamera önbelleğini temizler.

Yükseltili sahnede mevcut düz zemin düzlemi aynı materyali kullanan, pist sınır kutusu +400 m içinde 16 m grid ile değiştirilir. Yeni draw call eklenmez. Zemin de aynı yaklaşık yükseklik alanını izler; bu ölçülmüş çevre topografyası değildir. Yol dışındaki enine ekstrapolasyon yarı genişlik +24 m ile sınırlanır; banking sonsuza uzatılmaz. Yüksek frekanslı arazide kaba grid yol yakınında yerel farklar yaratabilir; yeni gerçek veri için görsel QA gereklidir. Bir X/Z noktasında iki ayrı yol katmanını destekleyen overpass/tünel sistemi bu sürümde yoktur.

Ölçülmüş genişlik sağlanırsa V3 asfalt/çizgi/kerb aralıkları bu genişliği kullanır; eski varsayılan temsilî genişlikler profil yokken korunur. Meksika buffer bariyer hattı genişlik kaynağından bağımsız eski referanstır; büyük genişlik değişimlerinde sınırların ayrıca üretilmesi gerekir.

## Araç ve kamera

V4 GLB'nin düşük LOD tekerlek gruplarından temas noktaları bir kez ölçülür. Prosedürel yedek için mevcut tekerlek yerleşimi kullanılır. Dört temasın boyuna/enine farklarından destek düzlemi bulunur; +Z ileri yön bu düzleme projekte edilip sağ/yukarı/ileri bazından quaternion oluşturulur. Quaternion aynı hemisferde tutulur. Döndürülmüş gerçek temas noktalarındaki en büyük düşey artık, gövdeyi yüzeyden uzaklaştıracak minimum kaldırmayı belirler. Düz modda önceki root konumu korunur.

Bu katı gövde yerleşimidir; gerçek süspansiyon veya lastik deformasyonu ölçümü değildir. Ölçülmüş süspansiyon olmadığı için bu PR ilave fren/ivmelenme gövde animasyonu üretmez. Banking yalnız destek düzleminde bir kez uygulanır; bağımsız dinamik roll eklenmez.

Takip/alçak açı/karşılaştırma lensi ve hedefi artık mutlak dünya yüksekliği kullanır; render aşamasındaki eski ikinci `focusHeight` eklemesi kaldırılmıştır. Böylece yumuşatma ve mevcut bariyer raycast'i aynı dünya koordinatlarında çalışır. Yayın kamerası sabit anchor yüksekliğini, hedef ise araç yüksekliğini izler. Serbest orbit mutlak koordinat kullanır; lens alt sınırı bulunduğu zeminden .65 m yukarıdır. Üstten görünüm profil tepesini kapsar. Yeni kokpit modu yüzey normalini up vektörü olarak kullanır. Mevcut kamera geçiş/yumuşatma ve optimize çarpışma algoritması korunmuştur; yayın kesmeleri tasarım gereği süreksizdir.

## Testler, ölçümler ve kanıtlar

Başlangıç temiz `main` birim testleri **26/26**, son V5 birim testleri **34/34** ve son gerçek Chrome tarayıcı paketi **23/23** başarılıdır; atlanan test veya retry yoktur. Son tam paket `TEST_GPU=hardware`, Chrome 157.0.8103.39, Node 24.22.1, Playwright 1.56.1 ile çalıştı. Eski test adındaki “software-renderer” sözcüğü korunmuştur; son çalışmada donanım modu seçilmiştir. [Tam paket JSON](performance/v5/regression-final.json), [tam kayıt](performance/v5/regression-final.txt), [birim kaydı](performance/v5/unit-final.txt), [test edilen kaynak ağacı](performance/v5/tested-source.json).

İlk performans kaydı [before.json](performance/v5/before.json) içinde, ilk sonrasındaki değişken gözlem [after-first.json](performance/v5/after-first.json) içindedir. İkisi de SwiftShader'dır; tek gözlemden fiziksel GPU için %10 kabulü çıkarılmaz.

Başarısız denemeler de saklanır: [ilk sentetik hedefli test kaydı](performance/v5/targeted-first-failed.txt). İlk ham kamera adımı kontrolü 25 ms'de 1.048 m'yi sıçrama saydı; aynı aralıkta lens yatayda yaklaşık 4.8 m hareket ediyordu. Kontrol, kaynak yatay hareketini değiştirmeden 10 µs komşuluklarda sürekliliği ayrıca ölçer; ham 25 ms adımları raporda kalır. Kaynak testi başlangıçtaki yalnız görünür geometri yüklemesini 120 s sonraki daha geniş GPU yerleşik kümeyle kıyaslayınca +366 geometri gördü. Son kontrol önce üstten tüm pist tile'larını ısıtır, sonra aynı dünyadaki büyümeyi ölçer; tolerans yükseltilmez. Bu başlangıç hataları başarılı test gibi sayılmaz.

### Başarısız tam çalışmalar ve düzeltmeler

İlk SwiftShader tam paketi **18 geçti / 5 başarısız**: üç test isteğe bağlı 2026 GitHub katalog keşfindeki HTTP 403 konsol kaydı nedeniyle, iki sentetik test ise Three.js yüklenmeden quaternion hesabı istenmesi nedeniyle hazır olma zaman aşımına girdi. [Eksiksiz başarısız kayıt](performance/v5/software-first-failed.txt). Başlatmada saf destek düzlemi kullanılacak şekilde guard eklendi; Three.js hazır olduğunda döndürülmüş GLB temas hesabına geçilir ve cache anahtarı bu geçişi ayırır.

İlk donanım paketi **20 geçti / 3 başarısız**: iki topografya testi artık geçti; üç HTTP 403 konsol hatası sürdü. [Kayıt](performance/v5/hardware-first-failed.txt), [JSON](performance/v5/hardware-first-failed.json). Son test yapılandırması uygulamanın var olan 30 dakikalık `td.disc` önbelleğini boş keşif farkıyla ısıtır: gömülü gerçek katalog kullanılır, yeni yarış keşfi test konusu yapılmaz. Gerçek HAM/RUS ve diğer pilot/tur/yarış telemetrisi arşivden indirilir; veri veya hata assertion'ı taklit edilmez ve konsol hata kontrolü kaldırılmaz. Arşiv yükleme/hata kurtarma senaryoları korunur. Kayıtlarda yalnız terminal ANSI kodları ve yerel checkout yolu normalize edilmiştir.

### Son sayısal kontroller

- HAM **76.651 s**, RUS **76.356 s**; bitiş delta **−0.295 s**, iki progress de **1**. Her iki araçta 539 örnekli hız/gaz/fren/vites/RPM kanalları sonlu ve değişkendir. [Tam gerçek tur ve LOD kaydı](performance/v5/integration-lap.json).
- Gerçek GLB temas noktalarıyla 0.5 s aralıklı tüm tur örneklerinde en büyük gömülme yaklaşık **8.9e−16 m** (yuvarlama), en büyük dört tekerlek artık boşluğu **7.45 mm**. Bu yalnız test geometrisi ve katı görsel model için sonuçtur; gerçek lastik/süspansiyon doğruluğu iddiası değildir.
- Asfalt **4304** üçgeninde sıfır dejenere/ters üçgen; test edilen kerb/çizgi vertex'lerinde sıfır yüzey altı/kopma. Beş sürekli kamera modunda 10 µs komşuluk yüksekliği farkı en fazla **0.000481 m**. [Yüzey kontrolü](performance/v5/surface-checks.json).
- Profil değişimi dünya ve çarpışma cache'ini yeniler. Yükseltilmiş bariyere 10 m serbest kamera hareketi **3.70 m**'de durur. 120 s duvar saati boyunca 0.25× oynatmada zaman **30.001 s**, GPU geometri **478→479**, doku **29→29**; kaynak telemetri fingerprint'i eşittir. [Sentetik uzun oynatma](performance/v5/synthetic-soak.json).
- Eski 120 s replay ve üç döngülü Stüdyo/simülatör geçiş testleri de geçti. [Replay ölçümü](performance/v5/measurement.json), [Stüdyo/simülatör kaydı](performance/v5/studio-simulator.json).

### Donanım performans karşılaştırması

NVIDIA GeForce RTX 5060 Laptop GPU / ANGLE D3D11, Chrome 157.0.8103.39. Viewport 1280×720, DPR 1, gerçek canvas **1059×416**, Performans profili, adaptif çözünürlük kapalı, kamera A, 1× gerçek zaman, t=10 başlangıcı. Diğer test tarayıcıları kapandıktan sonra üçer 30 s pencere ölçüldü; sıra **önce1, sonra1, sonra2, önce2, önce3, sonra3**. Her sayfada aynı dört duraklatılmış ısınma çizimi uygulanır. `GhostMetrics.record` aralıklarının tüm pencere ortalaması kullanılır; mevcut p50/p95 alanları uygulamanın son 600 kare sınırını korur.

| Ölçüm | Başlangıç main | V5 üretim Meksika |
|---|---:|---:|
| Üç pencerenin ağırlıklı ortalama FPS'i | 60.0011 | 60.0036 |
| Sabit t=10 draw call | 197 | 197 |
| Sabit t=10 üçgen | 366234 | 366234 |
| Sabit t=10 geometri / doku | 200 / 30 | 200 / 30 |
| Çizim tamponu | 1059×416 | 1059×416 |

Gözlenen FPS kaybı **−%0.0041**; anlamlı kayıp gözlenmedi ve bu koşullarda **%10 bütçesi karşılandı**. Ölçümler yaklaşık 60 Hz sunum tavanındadır; bu sonuç daha yüksek FPS kapasitesinin veya tüm çözünürlük/Ultra/donanım kombinasyonlarının eşit olduğu iddiası değildir. 1× oynatma saatine müdahale edilmedi. Üretim profili olmayan Meksika aynı düz sahne olarak karşılaştırılır; sentetik topografyanın maliyeti aşağıdaki ayrı gözlemde belirtilir. [Altı ham ölçüm ve özet](performance/v5/hardware-summary.json), [yeniden üretilebilir ölçüm betiği](../scripts/measure-topography.cjs).

Ölçüm betiğinde `TOPOGRAPHY_GPU=hardware` fiziksel GPU denemesini seçer; dönen renderer dizesi her kayıtta saklanır. `TOPOGRAPHY_PROFILE=synthetic` yalnız test fixture'ını loopback sayfaya enjekte eder. SwiftShader başlangıç kayıtları ayrı tutulmuştur; donanım sonuçlarına karıştırılmamıştır.

Aynı ayarlarda eğim/banking ve yeni zemin ağı açık **ayrı tek 30 s sentetik gözlemde 60.0533 FPS**, 197 draw call, 387344 üçgen, sabit karede 200 geometri / 30 doku kaydedildi. Üretim düz sahneye göre +21110 üçgen (yaklaşık %5.76), sıfır ek draw call vardır. Burada da yaklaşık 60 Hz tavanı görülür. Bu, sentetik modun maliyetini görünür kılan tek gözlemdir; eski sürüm bu yüzeyi üretemediği için aynı geometrinin eski/yeni karşılaştırması olarak sunulmaz. [Ham sentetik donanım kaydı](performance/v5/hardware-synthetic.json). Ultra/4K ve diğer cihazların FPS bütçesi bu çalışma kapsamında karşılaştırılmadı.

### Görüntü listesi

Aşağıdaki yedi görüntü sentetik profildir; her birinin içinde test etiketi vardır. PNG'ler Playwright çıktısında, PR için gerçek tarayıcıdan alınan küçük JPEG görüntüleri aşağıdadır. [Üretim Meksika: yükseklik verisi yok, düz referans](performance/v5/mexico-flat/preview.png) ayrı tutulur. [Çekim istasyon/zaman manifesti](performance/v5/synthetic/manifest.json), [yeniden çekim betiği](../scripts/capture-topography.cjs).

| Kontrol | Görüntü |
|---|---|
| Düzlükten çıkışa geçiş | [01](performance/v5/synthetic/01-flat-to-climb.jpg) |
| Yokuş ortası | [02](performance/v5/synthetic/02-uphill.jpg) |
| Tepe noktası | [03](performance/v5/synthetic/03-crest.jpg) |
| İniş | [04](performance/v5/synthetic/04-descent.jpg) |
| Banking içeren viraj | [05](performance/v5/synthetic/05-banked-corner.jpg) |
| Yüzeye oturan kerbler | [06](performance/v5/synthetic/06-kerbs.jpg) |
| Takip kamerasıyla yükseliş | [07](performance/v5/synthetic/07-follow-uphill.jpg) |

## Yeni pist ekleme

1. Mevcut yatay referansın istasyon sıfırı/yönünü ve Y-up dönüşümünü doğrulayın. Telemetri kanallarını değiştirmeyin.
2. Veri kaynağı, lisans, dikey datum, metre/radyan birimleri ve doğruluk sınıfını kaydedin. DEM ile ölçülmüş asfalt/banking bilgisini ayırın.
3. Profil örneklerini kanonik istasyon mesafelerine eşleyin. Kaynak kapalı döngüyü karşılamıyorsa boşluğu uydurmayın; üretime eklemeyin.
4. `TrackTopographyProfiles[st.H.event]` kaydına geçerli profil nesnesini, sahne açılmadan önce ekleyin. Güncellemede nesneyi yeni referansla değiştirin; profil ve yüzey örnekleri yerinde mutate edilmemelidir.
5. Yeni pistin yatay mesh üreticisini ortak `heightAt`/`sampleAtDistance` alanıyla yapı zamanında drape edin. Genişliği ve buffer sınırlarını viraj katlanmasına karşı kontrol edin. V5 mevcut Meksika ve prosedürel üretici adaptörlerini içerir; başka özel GLB pistler kendi adaptörünü gerektirir.
6. Eğim/tepe/banking, tekerlek temasları, ters yön, seam, kamera çarpışması ve sabit telemetri fingerprint'lerini çalıştırın. Gerçek kaynak görsellerini sentetiklerden ayırın.
7. Aynı tarayıcı/donanım/çözünürlük/kalite/oynatma hızında öncesi–sonrası ölçün. Dinamik çözünürlüğü kapatın. Fiziksel GPU %10 bütçesi ayrıca doğrulanmalıdır; oynatma saatini değiştirmeyin.

Yerel kontrol: `npm ci`, `npm test`. `CHROMIUM_PATH` tarayıcıyı, `TEST_PORT` test sunucusunun portunu seçer. Python alias'ına gerek kalmaması için bağımlılıksız Node statik sunucu eklendi. Yalnız kendi başlattığınız mevcut sunucuyla test ederken `TEST_SERVER_EXTERNAL=1` kullanılabilir; varsayılan davranış otomatik olarak başka sunucuyu kullanmaz.
