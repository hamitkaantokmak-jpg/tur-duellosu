# Takılma: kamera maliyeti, yüksek DPI ve yazılımsal WebGL

> Bu dosyadaki ölçümler PR #4 ilk sürümünün tarihsel kaydıdır. Güncel main + Veri Stüdyosu entegrasyonunun yeniden ölçülen sonuçları ve tam regresyon kayıtları için [PERFORMANS-ENTEGRASYON.md](PERFORMANS-ENTEGRASYON.md) dosyasına bakın.

## Tarayıcı kontrolü

Brave’de `brave://gpu` sayfasındaki WebGL satırı **Software only** ise çizim ekran kartı yerine CPU üzerinden yapılıyor olabilir. Önce `brave://settings/system` altında kullanılabilir olduğunda grafik hızlandırmayı kullan seçeneğini açıp Brave’i yeniden başlatın; WebGL satırını tekrar kontrol edin. Zaten açıksa Brave ve ekran kartı sürücüsünü güncelleyin; aynı uygulamayı Chrome/Edge ile karşılaştırın. Engellenmiş sürücüleri deneysel bayraklarla zorla açmak bu düzeltmenin parçası değildir. Hardware accelerated görülmesi tek başına her cihazda 60 FPS garantisi vermez.

## Kod değişikliği

Kamera ışını, görünür InstancedMesh gruplarındaki her örneğe tekrar tam mesh raycast uyguluyordu. Statik örneklerin dünya sınırları ve dönüşümleri artık CPU tarafında önbelleklenir. Işınla kesişmeyen veya rayın uzunluğunun dışındaki örnekler üçgen testinden önce elenir; yakın örneklerde aynı Three.js Mesh raycast’i kullanılır. Malzeme tarafları, katmanlar, near/far ve örnek kimliği korunur. Dünya, geometri, instance buffer sürümü veya örnek sayısı değişince önbellek yenilenir; dünya yeniden kurulurken temizlenir. Bu bir yaklaşık kutu çarpışmasıyla değiştirme değildir: sonuç gerçek üçgen testinden gelir. Düzenlenmeyen statik çevre geometrileri hedeflenir.

Ultra’nın üst DPR oranı 2 yerine 1.5’tir: DPR≥2 ekranlarda üst sınırdaki çizim piksel sayısı %43.75 azalır; DPR1 görüntü boyutu değişmez. Araç ve çevre modelleri, PBR haritaları, Ultra gölgeleri ve telemetri saatinin gerçek süreyi koruması değişmedi. Düşük FPS’yi gizlemek için oynatma yavaşlatılmaz veya geçen süre kırpılmaz.

## Ölçüm ve sınırlar

[Aynı 400 ışında CPU kaydı](performance/stutter/collision-cpu.json). İlk görünümün görünürlük seçimi sabittir; yalnız ışınlar tur boyunca örneklenen kamera konumlarına taşınır. 12 ısınma ışını, sürüm başına tek gözlemsel çalışma; GPU çizimi zamanlanan döngüye dahil değildir. Bir tam tur FPS karşılaştırması veya kullanıcının bilgisayarındaki sonuç değildir.

| CPU ölçümü | Önce | Sonra |
|---|---:|---:|
| Medyan | 1.1 ms | 1.1 ms |
| p95 | 5.5 ms | 1.9 ms |
| En uzun | 41.5 ms | 32.6 ms |
| 400 ışın toplamı | 767.9 ms | 635.8 ms |

400 kamera sonucunda en büyük koordinat farkı **0**. Three.js ile karşılaştırılan ayrı testler dönmüş/ölçeklenmiş instance’ları, içeriden başlayan ışınları, finite near/far, katmanları ve cache yenilenmesini kapsar. 1.000 örnekten oluşan ray-dışı grupta yalnız bir yakın örneğe üçgen testi uygulanması da doğrulanır.

**12/12 birim/varlık testi ve mevcut 10/10 Playwright senaryosu son uygulama değişiklikleriyle tek tam çalışmada geçti**; ardından eklenen yüksek DPI senaryosu da ayrı çalışmada 1/1 geçti. Böylece 11 farklı tarayıcı senaryosu doğrulandı. [Tam regresyon kaydı](performance/stutter/regression-results.txt), [yüksek DPI kaydı](performance/stutter/high-dpi-results.txt), [gerçek çizim boyutu](performance/stutter/high-dpi.json).

[120 saniyelik kontrol](performance/stutter/soak-120s.json): 485 geometri, 30 doku; 747×294 adaptif canvas, SwiftShader. Kaynak sınırları değiştirilmedi. Tam gerçek tur, tüm kameralar, LOD, PBR, grafikler, mobil görünüm, kaynak yeniden kurulumu ve WebGL/eksik varlık yedekleri geçti. Bu yazılım kontrolü kullanıcının Brave kurulumunun akıcı çalıştığını doğrulamaz. [13 yerel kaynak yolu ve 21 V4 kaynak özeti denetimi](performance/stutter/asset-paths.json) hatasız.

Yeniden ölçüm: uygulamayı yerel HTTP sunucusunda çalıştırın, ardından `node scripts/measure-camera-cpu.cjs http://127.0.0.1:4173 test-results/camera-cpu.json`. Eski/yeni karşılaştırma için ayrı checkout’ları aynı koşullarda ölçün. Fiziksel GPU bulunmayan geliştirme ortamındaki yazılımsal çizim, Brave donanım hızlandırmasının yerini tutmaz.
