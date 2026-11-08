# Tur Düellosu — teknik inceleme ve geliştirme sınırı

## Mevcut yapı ve koruma kararı

Başlangıç deposu `README.md` ve yaklaşık 238 KB `index.html` içeriyordu. Framework ve paket derleme hattı yoktu. Sayfanın gövdesi, CSS, yarış kataloğu ve uygulama kodu tek HTML dosyasındaydı.

- **Veri:** `loadSession` TracingInsights/FastF1 arşivinden sezon, oturum, pilot ve tur metadatasını; `loadTel` seçilen turun telemetrisini alır. Oturum ve tur önbellekleri korunmuştur.
- **Temizleme:** `prepTel` zorunlu kanal eksiklerini reddeder, eksik örnekleri işaretler, mesafeyi monotonlaştırır. `resampleTel` yaklaşık 8 m ortak mesafe ızgarasına indirger. Ölçülmeyen isteğe bağlı kanallar NaN kalır. Bu fonksiyonlar değiştirilmemiştir.
- **Karşılaştırma:** `compare` A/B zamanlarını aynı mesafede karşılaştırır: delta = B.t − A.t. Sektör, mini sektör, lastik/oturum filtreleri ve viraj analizleri korunmuştur.
- **Oynatma:** `st.play`, `kAtTime`, `positions` ve tek `requestAnimationFrame` saati iki turu aynı başlangıçtan kendi sürelerine göre oynatır. Saat ve delta algoritmaları korunmuştur. Yinelenen başlangıçlara karşı koruma ve bekleyen frame iptali eklenmiştir.
- **Geometri:** `ghostBuild`, ölçüm koordinatlarını döndürür/ölçekler; ortalama yol, yumuşatılmış konumlar ve isteğe bağlı tahmini ortak çizgi üretir. Bu, pist sınırlarının ölçümü değildir.
- **Araç:** Mevcut prosedürel açık tekerlekli model kanatlar, halo, lastik/jant, kokpit ve süspansiyon içeriyordu. Yeniden kullanıldı; ayna ve difüzör kanatçıkları eklendi. Model kare başına oluşturulmaz.
- **Grafik:** Yazılımsal Canvas perspektif çizici ve yalnızca Bakü için kullanılan Three.js 0.180.0 WebGL çizici vardı. WebGL kodu `src/ghost-webgl.js` dosyasına taşındı; aynı global uygulama durumunu kullanır. Three.js sürümü değiştirilmedi.
- **Kamera:** Eski yayın seçeneği hareketli bir takip ofsetiydi; serbest kamera yoktu. Yeni yayın kamerası, telemetri mesafesi boyunca sabit pist kenarı noktalarından bakar. Oynatma sırasında kamera konumu/hedefi yumuşatılır. Duraklatılmış kameralar doğrudan yeni açıya geçer.
- **Arayüz:** Hız, vites, gaz, fren sinyali, pedal çubukları, fren zaman çizelgesi, pist haritası, ayrıntılı telemetri grafikleri ve yarış analizleri korunmuştur. Hayalet görünümden analiz görünümüne mevcut düğmeyle dönülür.

## Aşamalı uygulama

WebGL artık mevcut pistlerin tümünde çalıştırılabilir; Meksika özel çevre profiline sahiptir. İlk açılış varsayılanı 2024 Meksika sıralama, HAM/RUS'tur; kayıtlı ve URL ile seçilmiş tercihler önceliklidir. Pist yüzeyi, kerbler, bariyerler, çitler ve araçlar mevcut geometriyi kullanır. Meksika için temsili tribünler, instanced seyirciler, başlangıç şeridi, özgün yazılı tabelalar ve yaklaşık mesafe levhaları eklenmiştir. Takip, pist kenarı yayın, üstten ve fareyle serbest kamera bulunur. Serbest kamera duraklatıldığında da çalışır.

Performans / Dengeli / Ultra seçenekleri çözünürlük, gölge çözünürlüğü ve seyirci detayını değiştirir. Dengeli varsayılandır. Sahne ve telemetri yeniden başlatılmaz. Ölçülen düşük kare hızında yalnızca render çözünürlüğü azaltılır; kalite üst sınırına kadar geri yükseltilebilir. Materyaller/geometriler birleştirilir, ağaç materyalleri paylaşılır. Performans paneli FPS, kare aralığı, draw calls, üçgenler, GPU geometri/doku sayacı ve gerçek render boyutunu gösterir. Bu sayaçlar GPU zaman sorgusu ya da bayt cinsinden bellek ölçümü değildir.

Sahne değişiminde geometriler, materyaller ve dokular `dispose` edilir. Normal sayfa kapanışında renderer ve PMREM render target da temizlenir. WebGL başlatma veya bağlam kaybında açık durum mesajıyla Canvas oynatıcıya dönülür.

## Bilinen sınırlar ve sonraki öncelikler

1. Fotogerçekçi veya doğrulanmış Meksika pist modeli ve lisanslı GLB araç eklenmedi. Prosedürel modeller geçici varlıklardır; referans video kalitesi tamamlanmış değildir.
2. Pist genişliği, tribün konumu, levhalar, çevre, eğim ve tahmini sürüş çizgisi ölçülmüş doğruluk iddiası taşımaz. Yaklaşık 4 Hz kaynak, yumuşatma veya interpolasyonla daha hassas hale gelmez.
3. Harici CDN ve telemetri arşivine internet gerekir; çevrimdışı veri paketi eklenmedi. Arşivin erişim ve şema değişiklikleri yüklemeyi etkileyebilir.
4. Serbest kamera döndürme ve yakınlaştırma sağlar; yatay pan ve klavye gezinmesi henüz yoktur. Duraklatılmış kamera modu değişimleri animasyonlu değildir.
5. 30 saniyelik oynatma ve tekrarlanan sahne kurulumları çok saatlik bellek sızıntısı olmadığını kanıtlamaz. Gerçek donanımda uzun oturum ve 1080p GPU profillemesi sonraki adımdır.
6. Sonraki görsel adım: kaynağı ve lisansı belgelenen pist/araç GLB modelleri, asset yükleme/dispose hattı ve LOD. Sonraki performans adımı: gerçek GPU ölçümü, mekânsal çevre parçaları, GPU zaman sorguları ve daha uzun regresyon testleri.
