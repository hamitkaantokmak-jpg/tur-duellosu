# V5 son denetim ve main entegrasyonu

Denetim başlangıcı: PR #9 `5170f68a27848ed45b86485ca98b588c0f20a8ae`, main `e91e27c7ecde7801541773788a47b4354c47176b`. Önceki başarı raporu kabul kanıtı olarak tekrar kullanılmadı; kaynak yeniden okundu, karşı örnekler üretildi ve güncel uygulama yeniden sınandı. V6 veya yeni dekorasyon eklenmedi.

## Bulunan ve düzeltilenler

1. **Eksik en yakın segment araması.** Hücre dizini ilk dolu halkada duruyor, o halkanın dışındaki daha yakın bir segmenti kaçırabiliyordu. Karşı örnekte uzaklığın karesi 14602.32 yerine 12200 olmalıydı. Aranan alanın sınırı sonucu garanti etmiyorsa kalan segmentlerle doğrulama yapılır; araçların istasyon ipuçlu yerel araması korunur. [Yeniden üretilmiş karşı örnek](performance/v5-audit/findings.json).
2. **Sonlu olmayan yönelimler.** Vektör normalizasyonu `NaN`/Infinity ve sıfır/normalle paralel ileri yönü reddeder. Yol dışı yaklaşık normalin tekilliği sonlu tutulur; fiziksel yol genişliğinde katlanma reddi korunur.
3. **Profilin dışarıdan değişmesi.** Örnek ve metadata girdileri kopyalanır; çağıranın daha sonra istasyon veya doğruluk sınıfını değiştirmesi önbellekteki yüzeyi bozmaz.
4. **Gereksiz kare hesapları.** Yalnız yükseklik sorgusu normal/tangent/eğrilik hesaplamaz. Quaternion bazının çalışma vektörleri/matrisi yeniden kullanılır; sabit test modu ve düz destek nesnesi önbelleğe alınır. Serbest/üstten kamera gereksiz araç desteği hesaplamaz; yinelenen lens yüksekliği ve kullanılmayan direksiyon ön-nokta hesabı kaldırıldı.
5. **Tepe içinden geçen serbest kamera.** İki uç noktanın zemin üzerinde olması aradaki yüksek asfaltın içinden geçişi engellemiyordu. Yol/zemin mesh'leri yalnız serbest kamera hareketinin mevcut dar-faz taramasına eklenir; takip kameralarının her karesine arazi üçgen testi eklenmez. Çarpışma sonrası lens zemin +0.65 m sınırında tutulur. Önceden 778.30 m hareketin tamamı geçerken yeni test yaklaşık 16.75 m'de durur. Test bariyerleri gizleyerek asfalt/zemin davranışını ayırır.

Kamera çarpışma instance cache'i, dünya/instance sürümü/sayı/dönüşüm geçersizleştirmeleri ve kalite/LOD seçimi korunur. Gerçek telemetri ayrıştırıcısı, `replay-core.js` ve Veri Stüdyosu hesapları değiştirilmez.

## Veri doğruluğu

Üretim Meksika hâlâ düz referanstır; doğrulanmış yükseklik/banking kaynağı eklenmedi. Sentetik profil yalnız loopback + açık test sorgusu + enjekte fixture ile çalışır ve her görüntüde etiket taşır. Süspansiyon fiziği iddiası yoktur. Kaynak/lisans sınıfları ve gelecekte doğrulanmış COTA/Spa profillerini ekleme rehberi [ana mimari belgesindedir](PIST-TOPOGRAFYASI.md).

## Regresyon ve görsel kontrol

Son sabit uygulama kaynağı `53b19b7d274365419f474fbec3f68791693bebb5`: **39/39 birim ve 24/24 gerçek Chrome tarayıcı senaryosu başarılı**, atlanan/retry yoktur. Bu paket tüm eski testleri, ek sınır/bozuk girdi/yerel arama testlerini ve yeni arazi çarpışma senaryosunu içerir. İki 120 saniyelik oynatma; duraklat/devam, 0.25×–4× hızlar, LOD/kalite, context/asset yedekleri ve Stüdyo ↔ simülatör akışları çalıştırıldı.

Gerçek HAM **76.651 s**, RUS **76.356 s**, bitiş farkı **−0.295 s**, iki ghost progress **1**. Kaynak zaman/mesafe ve hız/gaz/fren/vites/RPM fingerprint'leri eşit kalır. Yüzeyin 3D uzunluğu bu kanallara yazılmaz.

Başarısız karşı örnekler ve ara çalışmalar da kanıt dizinindedir. Ara tam çalışmada iç collider bayrağı yeniden adlandırılırken eski yüklenmiş assertion başarısız oldu; hareketin kendisi zaten duruyordu. Kabul paketi son dosyalarla sıfırdan çalıştırıldı ve bayrak adına değil gerçek güvenli hareket/zemin açıklığına bakar.

Ultra görüntülerde gerçek çizilen araç temas noktaları bağımsız asfalt mesh'ine düşey ışınla da kontrol edilir; görseller veya temas verileri üretilmiş referans render değildir. Ölçülmüş pist/süspansiyon doğruluğu iddiası yapılmaz.

## Performans yöntemi

Aynı fiziksel NVIDIA GPU; 1920×1080 ve 2560×1440 gerçek çizim tamponu, DPR1, sabit 1:1 oran, adaptif çözünürlük ve AO kapalı. Performans/Dengeli/Ultra profillerinin diğer LOD, gölge, materyal ve uzaklık ayarları korunur. 1× oynatma t=10'dan gerçek duvar saatiyle ilerler. Her hücrede 12 s pencerenin tamamından ortalama FPS ve p95/p50 aralıkları alınır; son 600 kareyle sınırlı eski panel istatistiği kullanılmaz. Ölçümler diğer test tarayıcıları kapandıktan sonra sıralı yürütülür.

Tarayıcıya `--disable-frame-rate-limit --disable-gpu-vsync` verilir; bunlar benchmark sürecine ait isteklerdir ve sistem ekran ayarını değiştirmez. Gerçekte gözlenen tavan varsa sonuçta ayrıca belirtilir; 60 FPS'de kalmak sınırsız GPU kapasitesi sayılmaz.

**Eski main karşılaştırmasının sınırı:** main sentetik yüzey ve kokpit modu içermez. Düz sahne kokpit karşılaştırmasında yalnız aynı lens/hedef formülünü veren test görünüm shim'i kullanılır; main'e V5 topografya/araç kodu kurulmaz. Main + sentetik hücreleri desteklenmiyor olarak ayrılır. V5 sentetik maliyeti V5 düz sahneye karşı ek gözlemdir; aynı eski/yeni geometri iddiası değildir.

Geometri/doku sayıları `renderer.info.memory` değerleridir. Byte alanları benzersiz sahne buffer'ları ve doku payload/format boyutlarından **tahmindir**; WebGL gerçek VRAM byte sayısını sağlamaz. Bu değerler fiziksel VRAM ölçümü veya JS heap sızıntısızlığı iddiası olarak sunulmaz.

| Çözünürlük | Kalite | Kamera | Main / V5 FPS | Kayıp | Main / V5 p95 ms |
|---|---|---|---:|---:|---:|
| 1920x1080 | performance | a | 124.3 / 116.1 | %6.62 | 11.1–11.3 / 12.2–12.5 |
| 1920x1080 | performance | cockpit | 123.6 / 120.5 | %2.55 | 11.6–12.0 / 11.4–12.1 |
| 1920x1080 | balanced | a | 104.3 / 107.1 | %-2.63 | 13.5 / 12.7 |
| 1920x1080 | balanced | cockpit | 106.5 / 107.9 | %-1.27 | 13.2 / 12.4 |
| 1920x1080 | ultra | a | 103.5 / 97.9 | %5.42 | 13.4 / 14.2 |
| 1920x1080 | ultra | cockpit | 99.3 / 94.4 | %4.87 | 15.4 / 15.3 |
| 2560x1440 | performance | a | 121.0 / 122.1 | %-0.87 | 11.4 / 11.3 |
| 2560x1440 | performance | cockpit | 126.8 / 120.0 | %5.36 | 11.2 / 12.0 |
| 2560x1440 | balanced | a | 105.8 / 115.2 | %-8.95 | 13.5 / 12.0 |
| 2560x1440 | balanced | cockpit | 109.0 / 114.0 | %-4.60 | 12.9 / 12.6 |
| 2560x1440 | ultra | a | 100.7 / 101.9 | %-1.15 | 13.4 / 14.2 |
| 2560x1440 | ultra | cockpit | 101.2 / 98.4 | %2.74 | 13.7 / 14.7 |

İlk 1080p Performans pencerelerinde görülen %49.6–%70.2 kayıp, 20 s gerçek oynatma ısınması ve iki ters sırayla tekrar edilince yeniden oluşmadı. Ham sonuçlar [tam matriste](performance/v5-audit/matrix.json), kabul için kullanılan tekrarlar [ters](performance/v5-audit/recheck-reverse.json) ve [ileri](performance/v5-audit/recheck-forward.json) kayıtlardadır. Tek hızlı 1440p kokpit penceresi de [yeniden ölçüldü](performance/v5-audit/recheck-1440-cockpit.json). Donanım/ısı/sürücü sebebi ölçülmediğinden kesin neden iddiası yapılmaz.

Son eşleştirilmiş FPS kaybı en çok **%6.62**; çözülmemiş >%10 FPS gerilemesi yoktur. 1080p Performans/takip p95 değeri 11.1–11.3 ms yerine 12.2–12.5 ms görülmüştür; bu yaklaşık 1.2 ms artış da gizlenmez. Ultra eşleştirmelerinde fark −%1.15 ile %5.42 arasındadır; en büyük FPS kaybı %5.42 olmuştur.

Sentetik gözlemler aynı eski/yeni geometrinin karşılaştırması değildir. Tam matriste V5 sentetik 98–118 FPS civarındadır; 1440p kokpit 20 s ısınmalı tekrarında düz V5 120.0, sentetik V5 113.5 FPS (%5.4 ek maliyet) ölçülmüştür. Tüm hücrelerin p95, draw call, üçgen, geometri/doku sayıları ve byte tahminleri [ham JSON](performance/v5-audit/matrix.json) ve [özet](performance/v5-audit/summary.json) içindedir.


## Görseller

Sekiz Ultra karesi aynı gerçek uygulamadan, açık sentetik etiketle alınır. GitHub önizlemeleri 960×720 viewport ve JPEG 35 ile doğrudan tarayıcıdan yeniden çekildi; büyük özgün JPEG 88 görüntüler teslim paketinde ayrıca saklanır. Her görüntü GitHub dosya görünümünden doğrudan açılabilir.

| Sahne | Görsel |
|---|---|
| Düzlük → yokuş | [01](performance/v5-audit/visual/01-flat-to-climb.jpg) |
| Yokuş ortası | [02](performance/v5-audit/visual/02-uphill.jpg) |
| Tepe | [03](performance/v5-audit/visual/03-crest.jpg) |
| İniş | [04](performance/v5-audit/visual/04-descent.jpg) |
| Banking virajı | [05](performance/v5-audit/visual/05-banked-corner.jpg) |
| Kerb/tekerlek teması | [06](performance/v5-audit/visual/06-kerbs.jpg) |
| Takip | [07](performance/v5-audit/visual/07-follow-uphill.jpg) |
| Kokpit | [08](performance/v5-audit/visual/08-cockpit.jpg) |

## Entegrasyon koşulu ve kalan riskler

PR dalına yalnız test edilmiş uygulama ağacı ve rapor kanıtları aktarılır. Main/head SHA yeniden okunur; anlamlı, çözülmemiş >%10 gerileme veya kritik test hatası varsa merge yapılmaz. Normal GitHub merge, beklenen head SHA ile gerçekleştirilir. Merge sonrasında main üzerinde birim ve kritik gerçek tarayıcı testleri yeniden çalıştırılır; nihai SHA ve sonuç teslim raporunda verilir.

Gerçek Meksika/COTA/Spa yükseklik verisi, çok katmanlı overpass/tünel, gerçek süspansiyon ve farklı GPU/4K/AO kombinasyonları hâlâ ayrı doğrulama gerektirir. Arazi 16 m yaklaşık grid'dir; yeni gerçek kaynak eklendiğinde yüzey/kerb/bariyer görsel kontrolü tekrarlanmalıdır. V6'ya başlanmadı.
