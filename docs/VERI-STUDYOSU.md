# Veri stüdyosu

Simülasyondan bağımsız, gerçek arşiv verisiyle çalışan içerik ve analiz alanı. Üst menüde **Veri stüdyosu** düğmesiyle açılır. Tahmin oyunu, gizlenen pilot isimleri veya puanlama eklenmedi.

```sh
python3 -m http.server 4173
```

Örnek: `http://localhost:4173/#y=2024&e=Mexico%20City%20Grand%20Prix&k=Q&a=HAM&b=RUS&lab=overview`. Veri stüdyosu 3D çiziciyi başlatmaz; açık oynatmayı durdurur. Telemetri için internet gerekir; veritabanı, kullanıcı hesabı veya yapay zekâ API anahtarı gerekmez; statik HTTP sunucusu yeterlidir.

## Bölümler ve uygulanan fikirler

| İçerik | Nerede / nasıl çalışır |
|---|---|
| Turun kaderini değiştiren üç an | Düello hikâyesi: 24 sabit ilerleme bölümünde en büyük mutlak kazancı gösterir; grafik aynı bölgeye açılır. |
| Kazanılan ve geri verilen zaman | Viraj referansının giriş/çıkış taraflarındaki delta değişimleri ayrı gösterilir. |
| Yakın süre, farklı sürülen turlar | Keşfet / Arşiv: gerçek tur çiftleri sıralanır; seçilen çift tam tur numaralarıyla açılır. |
| Farkın haritası | Pist çizgisinde pilot rengi ve yerel kazanca göre yoğunluk. |
| Fren mi çıkış mı? | Sürüş izi: fren–minimum hız ve minimum hız–tam gaz mesafelerinin medyanları. |
| Gaz kullanımı | Çıkışta kısmi gaz örnek oranı ve minimum hızdan sonra ilk kalıcı tam gaz noktası. |
| Vites tercihleri | Her viraj bölgesinde minimum hızdaki vites, minimum ve bölge sonu hızları. |
| Bir pilot, iki yıl | Aynı pilot/pist/seanstan diğer yılın gerçek en iyi turu yüklenir; hız profilleri normalize ilerlemede karşılaştırılır. |
| Pilot imzası | Seçili tur profili; ek yüklemeyle pilot başına en fazla 5 uygun turda medyan ve aralık. |
| Sonuç tablosunun sakladığı tempo | Yarış dosyası: temiz tur medyanı ve aynı tur saha medyanına göre göreli tempo. |
| Takip göstergesi | Tur sonu geçişlerinde önündeki son kayda ≤3 s yakınlık; bu kayıtları tempo hesabından çıkarma seçeneği. Tur boyunca gerçek takip süresi sayılmaz. |
| Pozisyon değişimi öncesi | Önceki üç tur ve değişim turundaki geçiş farkı, sektörler ve varsa hız tuzağı kaydı. Pist üstü geçiş doğrulaması değildir. |
| Pit penceresi | Seçilen tur ve net kayıp varsayımıyla doğrusal ilerleme modeli. Eksik rakip kaydı varsa tek sıra yerine sıra aralığı. |
| Strateji dönüm noktaları | Pit/bayrak kayıtları ortak tur zaman çizelgesinde. |
| Son turlarda kim kaldı? | Yarışın üç fazındaki göreli temiz tempo ve örnek sayıları. |
| Kendi teorini test et | Geç fren / minimum hız / erken tam gaz iddialarına aynı ve ters yönde olan bölge sayıları; nedensellik iddiası yok. |
| İdeal sektör toplamı | Aynı pilot/seanstaki gerçek sektörlerden, kaynak tur numarasıyla hipotetik toplam. |
| Benzer ve farklı bölgeler | Arşiv: minimum hız, fren, tam gaz veya vites farkına göre en yakın / en ayrışan bölgeler. |
| Üçüncü pilot referansı | Filtrelere uyan gerçek üçüncü tur; üç hız eğrisi, tüm viraj tablosu ve hangi örneğe daha yakın olduğu. |
| Benzer koşullar | Aynı bileşik, bilinen lastik yaşı ±2, Q bölümü, yakın başlangıç zamanı, silinmiş/özel bayrak filtreleri. |
| Hafta sonu dosyası | Aynı haftanın Q/R kayıtları; en yakın en iyi turlar, göreli tempo, tutarlı uzun dizi, faz değişimleri ve pit/bayrak özeti. |
| Viraj kütüphanesi | Seçili düellonun tüm bölgeleri, ölçümleri ve grafiğe geçiş bağlantıları. Sezon/pist değişimiyle yeniden kurulur. |
| Tuhaf turlar arşivi | İlk sektör avantajını geri veren ve daha düşük hız tuzağına rağmen daha hızlı bitiren tur çiftleri. |
| Veriye soru | Pilot kodu/ismiyle kazandığı bölgeler; seçili virajın pedal/hız/vites farkı; ideal sektör toplamı. Desteklenmeyen soruya sonuç uydurmaz. |
| Kendi incelemeni kaydet | Tam tur kimlikleri, ilerleme aralığı, kanal, başlık ve not: yerel kayıt, bağlantı, JSON indirme/içe aktarma. |

Hazır çift taraması pilot başına en hızlı üç silinmemiş turla sınırlıdır; filtreler bu örneklemde uygulanır. Tüm yılların bütün turları önceden taranmış gibi sunulmaz. Çoklu profil en hızlı en fazla beş uygun turu kullanır; yüklenemeyen örnekler başarı sayılmaz. Arşiv sayfasında aynı bileşik/yaş/seans zamanı eşitliği, yakıt ve hava eşitliğine dönüştürülmez.

## Hesaplar ve güven sınırı

- Delta `B.t − A.t`; bölgesel A kazancı `delta(son) − delta(baş)`. Bölümler toplamı bütün turun baş/son delta farkına eşittir. Pozitif değer A lehinedir.
- Meksika'da mevcut coğrafi ilerleme; diğerlerinde normalize mesafe kullanılır. 8 m/yeniden örneklenmiş noktalar yeni ölçüm değildir. Farklı yıl eğrileri eş fiziksel konum iddiası olmadan normalize ilerlemeyle gösterilir; pist değişikliği doğrulanmadı.
- Minimum hız referansın yaklaşık ±90 m çevresinde aranır. Fren noktası hız minimumundan önceki son fren bloğunun gözlenen başlangıcıdır. Pencere sınırında zaten açık olan fren yeni başlangıç diye üretilmez. Tam gaz minimumdan sonraki ilk iki ardışık ≥%98 örnektir; minimumda zaten tam gaz varsa aralık sıfır olabilir.
- Eksik veya doldurulmuş fren/gaz/vites kanalları olay noktaları için kullanılmaz. Kaynakta doldurulan örnek ve silinmiş tur seçimleri başlıkta belirtilir. Sıfır, eksik veri yerine yazılmaz.
- İdeal toplam yalnız silinmemiş, tam ve toplamı tur süresiyle 0.25 s içinde tutarlı sektörlerden; aynı pilot ve uygulanan koşul filtreleriyle oluşturulur. Yapılmış veya garantili tur değildir.
- Temiz yarış: ilk tur, pit giriş/çıkış, üretilmiş/silinmiş tur ve sarı/SC/VSC/kırmızı bayrak kayıtları çıkarılır. Faz değeri için en az 3; genel tempo için en az 5 temiz tur gerekir.
- Yakınlık yalnız bitiş çizgisi zaman farkıdır; tur bindirmeleri olabilir. Açık pist, gerçek mesafe, DRS veya bütün tur boyunca takip ölçümü değildir.
- Pit kaybının başlangıç değeri varsa mevcut pit kayıtlarından saha medyanına göre tahmin edilen net kaybın medyanıdır; yoksa girilen değer kullanıcı varsayımıdır. Gelecek olaylar modellenmez. Rakip kaydı eksikse konum aralığı genişler.
- Pozisyon değişimi pist üstü geçiş sayılmaz. Yakıt, araç ayarı, hava, lastik sıcaklığı veya bulunmayan DRS kanalından kesin açıklama türetilmez. Q bölümü alanı boş olan kayıtlarda aynı Q filtresi sonuç bulamayabilir; Q1/Q2/Q3 etiketi uydurulmaz.
- Tutarlılık, aynı bileşikte en az 5 kesintisiz temiz turun medyan mutlak sapmasıdır. Yakıt, trafik ve aşınma için düzeltilmiş pilot yeteneği puanı değildir.

## Paylaşım ve veri saklama

Notlar `td.studies.v1` anahtarında bu tarayıcıda en fazla 50 kayıtla tutulur. Harici bir sunucuya yüklenmez. Bağlantı not metnini ve tur kimliklerini URL fragment'ında taşır; kullanıcı kopyala düğmesine basarak paylaşır. Localhost adresi diğer bilgisayarda açılmaz; JSON dışa/içe aktarma veya yayımlanmış site adresi kullanılmalıdır.

İçe aktarma sürüm, metin boyutu, tur kimlikleri, kanal ve aralık doğrulamasından geçer; fazladan alanlar atılır. Notlar HTML olarak yürütülmez. Başka arşiv bağlamındaki dosya aynı tur kimlikleriyle yeniden açılır. Depolama/clipboard kapalıysa hata veya elle kopyalama yolu görünür.

## Uygulama yapısı

`src/insight-core.js`: DOM ve ağ bağımlılığı olmayan sayısal hesaplar. `src/insight-lab.js`: mevcut oturum/telemetri yükleyicisini kullanan arayüz; `src/insight-lab.css`: yalnız stüdyo görünümündeki stiller.

`td:session-loading/ready/error` ve `td:comparison-ready` olaylarıyla güncellenir. Analizler animasyonun her karesinde çalışmaz. Geç kalan ikincil istek başka oturuma uygulanmaz. İlk veri yüklemesi başarısızsa stüdyo içinde yeniden deneme vardır; eski oturumdan yeni sonuç gösterilmez.

Stüdyo bir kaynak tur çifti açtığında `compare({studioSelection:true})` tam seçilen kimlikleri yükler; ana ekrandaki filtre tercihleri korunur ve sonraki normal seçimde yeniden uygulanır. Mevcut telemetri motoru, yarış hesapları ve 3D varlık dosyaları değiştirilmez. Not alanında boşluk yazılması oynatma kısayolunu tetiklemez.

## Doğrulama

**23/23 birim/varlık testi ve 17/17 Playwright senaryosu son kodla tek tam çalışmada geçti**; atlanan test yok. [Tam kayıt](content-studio/regression-results.txt).

Yeni yedi tarayıcı senaryosu gerçek HAM/RUS verisi, toplama tutarlı bölgesel kazanç, teoriler/filtreler, tam tur kimliğiyle seçim, grafiğe geçiş, mobil görünüm, boşluklu not yazma, JSON indirme/içe aktarma, güvenli metin, URL ile aynı görünümü yeniden açma, gerçek R verisi/pit/strateji, beş turluk profil, üçüncü pilot, 2023 karşılaştırması, eksik ikincil veri, ilk yükleme yeniden denemesi ve geç gelen isteğin yeni oturuma uygulanmamasını kapsar.

İlk geniş çalışmada yalnız yeni testin bir arşiv varsayımı yanlıştı: Q bölümü alanı bulunan farklı bir tur arıyordu, oysa bu kayıtta alan boş. Test gerçek filtre reddini ve stüdyonun tam seçilen turu yüklemesini doğrulayacak şekilde düzeltildi. Bundan sonra yukarıdaki tam 23 + 17 çalışma yeniden, kesintisiz tamamlandı.

Mevcut on tarayıcı senaryosunda gerçek tur, bütün LOD/kameralar, grafik/yarış analizi, kaynak yeniden kurulumu, mobil, WebGL ve eksik varlık fallback’leri korundu. [120 saniyelik kontrol](content-studio/soak-120s.json): 480 geometri, 30 doku; gerçek 747×294 adaptif canvas, SwiftShader. 500/100 sınırları yükseltilmedi. Fiziksel GPU performansı ölçümü değildir.

[Altı gerçek Chromium görüntüsü](content-studio/README.md) tek tek incelendi; kayıtlarında sayfa/konsol hatası yok ve içerik modunda WebGL başlatılmadı. [15 yerel yol ve 21 V4 kaynak özeti](content-studio/asset-paths.json) hatasız. [Doğrulanan içerik kaynakları SHA-256](content-studio/source-sha256.json).
