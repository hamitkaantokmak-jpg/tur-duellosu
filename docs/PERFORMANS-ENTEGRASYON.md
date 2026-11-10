# Performans entegrasyonu: güncel main + Veri Stüdyosu + PR #4

## Commit ve entegrasyon durumu

- Başlangıç main: `9384bfe4f114c8e359a63d766df33e2ab559c1e7`; PR #5 Veri Stüdyosu'nun birleşmiş olduğu yeniden doğrulandı.
- PR #4 başlangıç başı: `7083dd6b7d4e558549c5a5c036869cf23aeda3c0`.
- Güncel main'i ikinci ebeveyn olarak koruyan hazırlanmış PR #4 başı: `edf3229603a98766bd62ccca1317fc5699c8222d`.
- Birleştirme öncesi test edilen yerel commit: `f5546beef0cca2d5b2c79789103e0273c1268bc3`. GitHub başı ile tüm dosya ağacı birebir aynı: `35d5930c9aeecb92c4dd4224f7c06140ba8f3ec8`.
- PR #4 birleşme commit'i: `14659d200e5aa2b09ba0243f60122093823c290b`; GitHub'da merged olarak doğrulandı.
- [PR #6](https://github.com/hamitkaantokmak-jpg/tur-duellosu/pull/6) takip test süresi düzeltmesi: `55b6dca03cf4ebf64eb86b1df8b5589de7e339b8`; tam paket başarılı olduktan sonra normal PR birleştirmesi kullanıldı.
- [PR #7](https://github.com/hamitkaantokmak-jpg/tur-duellosu/pull/7) kalıcı test izolasyonu/oynatma senkronizasyonu: baş `f85b8734a5cecfe6114e5cdf4f4917c4262010a4`; test edilen yerel commit `40acef5c789fe0e9740c9323b514982269a5910b`, tree `5be1544aae7679351339cd69c42de3f853e540b6`.
- Son doğrulanan main commit'i: `d82531d247652834c2073fd48d1ae568217a1f67`. Son test altyapısı düzeltmesi uzun simülatör akışını üç bağımsız senaryoya ayırır; uygulama kodu ve eski assertion'lar değişmez. Son tam pakette 21 tarayıcı senaryosu bulunur.
- Bu rapor ve yeni kanıtlar, birleşmiş main üzerinde temiz kurulum ve tam testler bittikten sonra yalnız belge ekleyen bir commit ile kaydedilmiştir. Bu belge commit'i uygulama, test, betik veya bağımlılık değiştirmez. Son tam testin çalıştığı SHA yukarıdaki son doğrulanan main SHA'sıdır; rapor kendi gelecekteki commit SHA'sını içerdiğini iddia etmez. Güncel belge commit'i dosyanın GitHub geçmişinden görülebilir.

README'deki tek çakışmada hem takılma düzeltmesi hem Veri Stüdyosu belge bağlantısı korundu. `index.html` otomatik birleşti: camera-collision, ghost-world'den önce; Stüdyo betikleri uygulamadan sonra yüklenir. Telemetri/replay-core ve Stüdyo JS/CSS dosyaları başlangıç main ile birebir aynıdır. **Dosya silinmedi**, fallback sistemleri korunmuştur. Zorla ref güncellemesi veya koruma aşımı yapılmadı.

## Korunan özellikler

Gerçek HAM/RUS ve diğer pilot/tur verileri; tam Meksika pisti; gerçek tur süreleri, ghost senkronizasyonu, delta, hız/gaz/fren/vites/RPM; analiz ve güncellenen grafikler; gerçek zamana bağlı oynatma ve hız kontrolleri; tüm kameralar ve gerçek bariyer kontrolü; Blender GLB'leri, üç araç LOD'u, PBR/dokular ve V4 çevresi; kalite profilleri; mobil, eksik varlık ve WebGL yedekleri korundu.

Veri Stüdyosu'nun sekiz bölümü, gerçek arşivler, yarış analizi, not defteri, içe/dışa aktarma, paylaşılabilir bağlam ve veri yükleme/hata kurtarma senaryoları korunmuştur. Yeni özellik veya yapay telemetri eklenmedi. Oynatma saati değiştirilmedi.

Kamera optimizasyonu per-instance dünya sınırları/dönüşümlerini önbellekler, yalnız adaylarda aynı Mesh üçgen raycast'ini kullanır. Dünya yeniden kurulurken önbellek temizlenir. Ultra üst DPR oranı 2 yerine 1.5'tir; geometri/LOD/gölge ayrıntısı değiştirilmedi.

## Birleştirme sonrası ilk başarısız çalışma ve düzeltme

İlk temiz main çalışmasında uzun kamera/profil/yeniden kurulum senaryosu 180000 ms toplam test sınırını aştı; assertion başarısızlığı raporlanmadı. Aynı senaryo birleştirme öncesi yaklaşık 174 saniyede geçmişti. Bu başarısızlık gizlenmedi. Düzeltmek için kalan çalışma durduruldu: **11 geçti, 1 timeout nedeniyle başarısız, 1 soak elle kesildi, 6 henüz çalışmadı**; o çalışmanın birim testleri 26/26 geçti. [Başarısız/kesilen çalışma kaydı](performance/integration/post-first-failed/tests.txt), [durum](performance/integration/post-first-failed/status.json), [son sayfa durumu](performance/integration/post-first-failed/error-context.md).

Yalnız bu ağır uçtan uca testin toplam süresi yazılımsal WebGL için 240 saniyeye çıkarıldı. Assertion, kaynak bütçesi, test kapsamı, cihaz çizim kalitesi ve uygulama oynatma hızı değiştirilmedi; retry/skip eklenmedi. Önce [hedefli test](performance/integration/timeout-targeted.txt), ardından [düzeltme üzerindeki tam paket](performance/integration/fix-pre/tests.txt) geçti. Yerel düzeltme commit'i `9ac76ca5142d551209febbecd007e049e7a2aeaa`, test edilen tree `d770a1613353fd7cbceb3a09a06565ce3dd2bc79`; GitHub takip commit'i ile birebir aynıdır. Sonra test düzeltmesi main'e kaydedilip **yeniden temiz worktree + npm ci + bütün npm test** çalıştırıldı. Ancak o temiz main çalışması bu kez 240 saniye toplam sınırına takıldı. Yine assertion başarısızlığı raporlanmadı; düzeltme için durdurulan çalışmanın sonucu 11 geçti, 1 timeout, 1 soak kesildi, 6 henüz çalışmadı. [İkinci başarısız/kesilen kayıt](performance/integration/post-second-failed/tests.txt) ve [durumu](performance/integration/post-second-failed/status.json) korunmuştur. PR #6 süre artışı tek başına yeterli çözüm olarak sunulmaz.

Son çözüm timeout'u tekrar artırmak yerine uzun testi üç bağımsız akışa ayırmaktır: (1) telemetri/kameralar/profiller/Blender, (2) saat/oynatma/dört dünya yeniden kurulumu, (3) pilot-tur değişimi/analiz/mobil/visibility. Eski 41 expect çağrı yeri korunmuş, ayrı sayfalar için iki hata kontrolü ve duraklatma durumu kontrolü eklenmiştir. Her akış varsayılan 180 saniye bütçesine sahiptir; retry/skip yoktur. Yüksek LOD kaynak temizliği için ikinci akışta Ultra varlıklarının yüklenmesi korunmuştur. Mevcut Stüdyo/simülatör testi birleşik kamera-pilot geçişlerini aynı sayfada üç kez sınamaya devam eder.

İlk ayrılmış hedefli çalışmada kamera/Blender (2.1 dk) ve pilot/mobil (41.9 sn) geçti; oynatma bölümünün son `time>0` kontrolü başarısız oldu. [Başarısız hedefli kayıt](performance/integration/split-targeted-first-failed/tests.txt) ve [iz özeti](performance/integration/split-targeted-first-failed/trace-summary.txt) korunmuştur. İzde son toggle tıklaması 21.901 saniye sürdü. Önceki hız denemesinden kalan 4× ayarda 76.651 saniyelik tur 19.163 saniyede bitebiliyor; geciken tıklama duraklatmak yerine turu yeniden başlatıp zamanı sıfırlayabiliyordu.

Test şimdi UI'dan açıkça 1× seçer, gerçek `time>0 && playing` durumunu bekler, 30 saniye eylem bütçesiyle duraklatır ve hem `playing=false` hem `time>0` doğrular. Ürünün oynatma saati veya varsayılan hızı değiştirilmedi; bütün 0.25×–4× kontrolleri ve ayrı gerçek 4× tam tur testi korunur. Sabit 1.5 saniyelik bekleme kaldırıldı; aynı zaman ilerlemesi assertion'ı korunup pause durumu assertion'ı eklendi. [Düzeltilen hedefli oynatma/kaynak testi](performance/integration/split-targeted.txt) 1.9 dakikada geçti, ardından [21 senaryolu tam paket](performance/integration/split-pre/tests.txt) geçti. Bu test altyapısı takip PR'ı tam başarıdan sonra birleştirildi; sonrasında main yeniden temiz dizine çekilip npm ci ve bütün npm test tekrar çalıştırıldı. Aşağıdaki son main sütunu bu son, eksiksiz başarılı çalışmadır; iki kesilen çalışma başarı olarak sayılmaz.

## Sıfırdan tam regresyon

| Ortam | Kurulum | Birim/varlık | Chromium Playwright | Atlanan/başarısız |
|---|---|---:|---:|---:|
| Güncel main ile birleşmiş PR #4 | npm ci | 26/26 | 19/19 | 0/0 |
| Timeout düzeltmesi, main güncellemesinden önce | npm ci | 26/26 | 19/19 | 0/0 |
| Üç akışa ayrılan testler, birleştirme öncesi | npm ci | 26/26 | 21/21 | 0/0 |
| GitHub'dan yeniden çekilen son temiz main worktree | npm ci | 26/26 | 21/21 | 0/0 |

Komut dört başarılı tam aşamada da `npm ci` ardından `npm test`; tek worker, Chromium 156.0.8078.79, Node 24.22.1, npm 11.9.0. Bunlar yerel Chromium/test kayıtlarıdır; GitHub CI başarısı olarak sunulmaz.

Kayıtlardan yalnız ANSI renk kodları ve HTTP erişim satırları çıkarılmıştır; test, başarısızlık ve console sonuçları korunmuştur.

[Test öncesi tam kayıt](performance/integration/pre/tests.txt), [sonrası tam kayıt](performance/integration/post/tests.txt), [önce kaynak ağacı](performance/integration/pre/tested-source.json), [temiz main kaynak ağacı](performance/integration/post/tested-source.json). Uygulama, src/assets/art, betikler, paket kilidi ve Playwright yapılandırmasının kaynak girdileri başlangıç ve son başarılı çalışmada eşittir; düzeltme öncesi/sonrası son iki tam paketin test kaynakları da birebir eşittir. Test ağacındaki takip değişiklikleri yukarıdaki süre düzeltmesi, akışları ayırma ve oynatma durumu senkronizasyonudur; tüm eski assertion ve senaryolar korunur.

Tam gerçek tur 76.651 / 76.356 saniye; bitiş delta −0.295 saniye. Her iki araçta 539 örnekli hız/gaz/fren/vites/RPM kanalları sonlu ve değişkendir. 15/55/150 metre kamera mesafelerinde high/medium/low LOD doğrulandı. GLB, KTX2, HDR, JPEG ve PNG varlıkları gerçekten yüklendi; asset/page/console kritik hata dizileri boş. [Temiz main tam tur kanıtı](performance/integration/post/integration-lap.json).

## Stüdyo ↔ simülatör

Yeni `tests/studio-simulator.spec.js`, ilk Stüdyo açılışında sıfır WebGL isteğini; sonra üç döngüde sekiz sekmeyi, dört kamerayı, gerçek farklı pilot ve tur seçimlerini denetler. Renderer aynı kalır; toplam WebGL bağlam isteği 1. Aynı dünya korunurken cache aynı kalır; tur değişiminde dünya yenilenince cache değişir. Görünüm ve kamera değişimi oynatma zamanını korur; bilinçli yeni tur seçimi mevcut davranış gereği zamanı sıfırlar.

Temiz main'de geometri [130, 132, 130], doku [28, 29, 28]; test ayrıca üç döngüde geometri aralığının 10'dan, doku aralığının 5'ten küçük olmasını şart koşar. Page/console hata yok. WebGL bağlamı ve renderer.info.memory geometri/doku sayıları ölçülmüştür; JS heap bayt ölçümü değildir. Bu sınırlı üç döngü kontrolü sonsuz çalışma için bellek sızıntısı olmadığı iddiası değildir. [Kayıt](performance/integration/post/studio-simulator.json).

## Kamera CPU: eşit sahne ve ışınlar

1280×720, DPR1, Performans, adaptif kapalı, HAM/RUS Meksika 2024 Q, kamera A. Aynı gerçek sahnede 400 ışın tüm tur zamanına yayılır; her ışın için bölgesel görünürlük zamanlama dışında yenilenir. 400 ısınma ışını, üç tekrar, eski/yeni sırası dönüşümlü. Zamanlanan bölüm yalnız çarpışma hesabıdır; GPU çizimi ve sahne hazırlığı hariçtir.

| 1.200 kontrol | Eski Three.js algoritması | Önbellekli algoritma |
|---|---:|---:|
| p50 | 1.1 ms | 1.1 ms |
| p95 | 2.1 ms | 1.9 ms |
| Maksimum | 38.8 ms | 36.5 ms |
| Toplam | 2113.2 ms | 1864.0 ms |

Toplamda %11.79 azalma; medyan değişmedi. **1.200 kamera sonucunun tamamı eşit; en büyük koordinat farkı 0** (tolerans 1e−6). Soğuk önbellekte ilk yeni ışın 7.7 ms; ısınmış toplamdan ayrı kaydedildi. Dönüşmüş/ölçeklenmiş instance, içeriden başlayan ışın, katman, near/far ve cache yenilenmesi birim testleri de geçti. 1.000 instance içeren grupta yalnız bir yakın adaya üçgen testi uygulandığı doğrulandı.

## Runtime gözlemi: SwiftShader

Ayrı eski main ve yeni checkout aynı tarayıcı/viewport/DPR/profilde ardışık çalıştırıldı. Her sürümde t=10'dan 1× oynatma için 30 saniye gözlem istendi; gerçek gözlem süreleri 30.573 / 30.164 saniye. Sabit kare kaynakları her iki sürümde t=30'da ölçüldü.

| Ölçüm | Eski main | Yeni |
|---|---:|---:|
| Kaydedilen kare sayısı | 19 | 23 |
| Kare p50 / p95 | 1304.5 / 4382.0 ms | 1090.0 / 2884.8 ms |
| Son FPS göstergesi | 0.664 | 0.990 |
| Son kare süresi göstergesi | 1507.0 ms | 1010.2 ms |
| Draw call (sabit kare) | 106 | 106 |
| Geometri / doku (sabit kare) | 323 / 30 | 325 / 30 |
| Canvas / oran | 1059×416 / 0.85 | 1059×416 / 0.85 |

Az örnekli, tek ardışık gözlemdir; FPS sütunu bütün çalışmanın ortalaması değil son uygulama göstergesidir. 2 geometri farkı da ham kayıtta saklanmıştır; eşit olduğu iddia edilmez. Bu sonuçlar fiziksel GPU akıcılığı veya tekrarlanabilir bir FPS hızlanması kanıtı değildir. SwiftShader çizim maliyeti hâlâ baskındır; kamera CPU kazancı yazılımsal WebGL sorununu tamamen çözmez. [Ham ölçüm](performance/integration/perf-comparison.json), [ölçüm betiği](../scripts/measure-perf-integration.cjs).

## Yüksek DPI ve 120 saniye

Temiz main DPR2: Ultra gerçek renderer oranı 1.5, CSS 766×476, çizim tamponu 1149×714; Blender araç varlıkları kullanımda, hata yok. DPR2'de üst sınırdaki piksel sayısı önceki DPR2 çizime göre %43.75 azalır. [DPI kaydı](performance/integration/post/high-dpi.json).

120 saniyelik test dört başarılı tam paketin tamamında çalıştı; tabloda ilk ve son kayıt gösterilir; 4× oynatma ve tur sonrasında tekrar başlatma ile 12 ara kaynak örneği alındı. Ara örneklerin tamamında renderer hazır, geometri <500, doku <100, zaman ilerliyor; page/console hatası yok.

| Soak | Gerçek gözlem | Son geometri / doku | Draw call |
|---|---:|---:|---:|
| Birleştirme öncesi | 120.181 sn | 481 / 30 | 174 |
| Temiz main | 120.683 sn | 485 / 30 | 188 |

[Önceki 12 örnek](performance/integration/pre/measurement.json), [temiz main 12 örnek](performance/integration/post/measurement.json). GPU/FPS/resolution ham kayıtlardadır; adaptif soak ile adaptif kapalı runtime karşılaştırması farklı koşullardır, doğrudan FPS kıyası yapılmaz.

## Sınırlar ve çalıştırma

Fiziksel GPU bulunmadı (`/dev/dri` ve `/dev/nvidia0` yok); gerçek GPU testi yapılmadı. Chromium, ANGLE Vulkan SwiftShader kullandı. Kullanıcının Brave donanım hızlandırması ve gerçek cihazdaki akıcılığı bu ortamda doğrulanamadı. Bilinen kritik regresyon/test başarısızlığı kalmadı; fiziksel GPU ve daha uzun süreli bellek/FPS ölçümü açık doğrulama sınırıdır. Eski `performance/stutter/` kayıtları tarihsel PR #4 kayıtlarıdır.

```bash
npm ci
npm test
npm run serve
```

Uygulama: http://localhost:4173. [Güncel depo](https://github.com/hamitkaantokmak-jpg/tur-duellosu).
