# V9 ölçüm protokolü — ana kabul koşusundan önce

Başlangıç main: `ad35d61f5b26ed1d5ff6d82a3ee43b91478cee94`. V5 `a237ca5`, V6.1 öncesi V6 `f295c01`, V6.1 `e5ffd22`, V7 `0d5deec`, V8 `ad35d61` arşivleri değiştirilmez. V6, ilk raporun yayımlanmış son V6 uygulamasıdır; V6.1 render batching değişikliğini içermez.

## Kabul kapsamı

- COTA, Spa, Meksika × takip/kokpit × Performans/Ultra × gerçek 1920×1080 / 2560×1440 çizim tamponu: sürüm başına 24 koşul.
- Her koşul/sürüm için üç ayrı pencere. Sıralar: V5→V6→V6.1→V7→V8, ters sıra, ardından V6.1→V7→V8→V5→V6. Üç sıra tüm pozisyonları tam Latin kare olarak dengelemez; sıralama etkisini azaltır, ham sıralar saklanır.
- Ölçümle desteklenen V9 adayı `e0bc346` ayrıca altıncı sürümdür: sabit açıklama metnine yapılan gereksiz DOM yazısını atlar. Altı sürümlü ana sıralar V5→V6→V6.1→V7→V8→V9, ters sıra ve V6.1→V7→V8→V9→V5→V6'dır. Toplam **432 ana pencere** planlanır. İlk A/B/A/B deneyi ayrı ve kabul dışıdır; 662.7/674.6 FPS özgün pencere ile 799.0/884.8 FPS aynı-metin-yazma-korumalı pencereyi, aynı draw call/üçgenle kaydetti. Bu dört pencere tek başına kabul değildir.
- Ana benchmark V9 için fetch edilebilir `12b85328235b095d2362a44e058cc28ec023d302` commit'ini kullanır. Önceki V9 denetim dosyaları korundu; uygulama/varlık ve 34 tarayıcı test dosyası yerel `e0bc346` ile byte düzeyinde eşittir. Ayrıntılı ağaç/dosya ayrımı `source-publication.json` kaydındadır.
- Genel koşullar: 6 s warmup, 8 s ölçüm; tur zamanı 10 s'den başlar. Tarihsel Spa 1440p Ultra takip/kokpit için eski raporla aynı 20 s warmup / 12 s ölçüm ve 10–22 s replay aralığı kullanılır. Gerçek gözlem süreleri ayrıca kaydedilir.
- DPR=1, adaptif çözünürlük kapalı, AO kapalı, rate=1. Yalnız kalite profilinin piksel oranı 1'e normalize edilir: Performansın varsayılan 0.85 değeri yükseltilir; hiçbir sürümün gerçek render çözünürlüğü düşürülmez. Geometri, LOD eşiği, gölge haritası, ışık ve materyaller sürümlerin yerel ayarlarında kalır. V5 COTA/Spa normalize XY ve düz zemindir; sonraki sürümler coğrafi referans/türetilmiş arazi kullanır. Bu aynı kullanıcı senaryosunun toplam maliyetidir, aynı mesh'lerin GPU mikrobenchmark'ı değildir.
- Altı sürümün sayfaları aynı tarayıcıda yerleşik, yalnız ölçülen sayfa oynar. Aynı anda başka test/profil/oynatma yapılmaz. GPU global VRAM kullanımı bu yerleşik bağlamları ve masaüstünü de kapsar; uygulamaya özel VRAM diye sunulmaz.

## Donanım kontrolü

Fiziksel NVIDIA UUID/sürücü, WebGL debug renderer, Chromium GPU bilgisi, AC bağlantısı, pil tasarruf durumu ve güç planı kaydedilir. SwiftShader/llvmpipe/software renderer veya yanlış tampon boyutu kabul edilmez. FPS benzersiz replay RAF'ında tamamlanan render sayısı / gerçek süre olarak ölçülür. Replay dışı render'lar ayrıca sayılır; sahte çoklu RAF başarısı sayılmaz.

Kontrolsüz pilotta aynı V5 senaryosu yaklaşık 159 ve 678 FPS verdi. Bu pilotlar kabul hesabına katılmaz. Yalnız bu çalışma için açılan Chrome'un CDP ile bildirilen süreçlerinde yürütme-hızı/timer güç kısıtlaması kapatılır ve Windows'un bildirdiği en yüksek EfficiencyClass CPU setine affinity uygulanır. Bu cihazda sınıf 1 / maske 65535, yani 16 mantıksal P-core işlemcidir. Ayarlar pencere öncesi/sonrası okunur; süreçler kapanınca ortadan kalkar. Kullanıcının diğer süreçlerine, sistem güç planına ve GPU saat politikasına dokunulmaz.

Yöntem dayanağı: [Microsoft CPU set yapısı](https://learn.microsoft.com/en-us/windows/win32/api/winnt/ns-winnt-system_cpu_set_information) yüksek EfficiencyClass değerinin daha hızlı çekirdeği belirttiğini açıklar; [Microsoft SetProcessInformation](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-setprocessinformation) HighQoS ve timer çözünürlüğü kontrolünü belgeler. Bunun kontrolsüz pilot değişkenliğinin tek nedeni olduğu kanıtlanmış değildir; pilot düzelmesi bir tanı kanıtıdır.

GPU saat kilidi denemesi mevcut kullanıcı yetkisiyle reddedildi; kilit uygulanmadı. Hiçbir yönetici yetkisi veya sürücü ayarı değişikliği yapılmadı. Dinamik GPU boost bütünüyle sabit değildir. Saatler, bellek saatleri, P-state, watt, sıcaklık, GPU/bellek kullanımı ve global VRAM saniyelik örneklenir. Tarayıcı süreç CPU süresi, sayfa TaskDuration, JS heap, geometri/doku sayaçları ve CPU buffer/doku byte tahminleri ayrı alanlardır. GPU yürütme timer'ı desteklenirse tamamlanmış sorguların örnek sayısı ve dağılımı kaydedilir.

## Eşik ve başarısızlıkların ele alınması

**En fazla %10 FPS kaybı eşiği değişmez.** Bir koşulda her sürümün pencere ortalama FPS'lerinin medyanı ve p95 kare sürelerinin medyanı gösterilir. V6.1 ve mevcut V8/V9'un V5'e kaybı; ayrıca komşu sürüm değişimleri ve eşleşen tekrar kayıpları raporlanır. Tarihsel V6'nın geçememesi, kendiliğinden daha yeni sürümün başarısızlığı sayılmaz; V6 sonucu açıkça gösterilir.

Sürüm/koşulda pencere FPS değişim katsayısı %15'i aşarsa, kayıp %8–12 bandındaysa veya eşleşen tekrarlar %10 sınırının iki yanına düşerse, **o koşulun bütün sürümleri** için önceden tanımlanmış üç ek sıra uygulanır. Ek sonuçlar ilk üç pencereyle birlikte değerlendirilir; uygun sonuç seçilmez ve ilk pencereler silinmez. Bu tekrar sayısı veya aralıklar bir güven aralığı değildir. Altı pencereden sonra kararsızlık sürerse ilgili performans kabulü belirsiz/başarısız kalır; borç kapanmış sayılmaz.

Yanlış GPU/boyut, sayfa hatası, yetersiz kare, güç/kimlik değişimi veya bozulmuş süreç kontrolü bulunan pencere saklanır ve kabulü engeller. Yaklaşık 60 Hz tavanındaki sonuçlar sınırsız GPU kapasitesi kanıtı sayılmaz. Pilot, profil ve deneysel indeks denemeleri açıkça ayrı dosyalarda tutulur ve kabul FPS'ine karıştırılmaz.

Uzun koşu dışarıdan kesilirse `--resume`, yalnız blockers içermeyen aynı plan/script/source hash'li checkpoint'te tamamlanmış pencereleri koruyarak devam eder. Eski benchmark veya kendi Chrome'u hâlâ çalışıyorsa eşzamanlı GPU yükünü engellemek için devamı reddeder. GPU UUID/sürücü, Chromium, güç planı ve arşiv hash'leri yeniden doğrulanır; oturum sınırı ve PID kaydedilir. Geçersiz bitmiş pencereyi seçerek atlama yolu değildir. Yarım kalmış ve sonucu kaydedilmemiş pencere baştan ölçülür; kesinti kaydı raporlanır.

Yalnız profil/ölçümle desteklenen bir uygulama optimizasyonu gerekirse V8 arşivi korunur; yeni V9 aday sürümü ayrıca, aynı koşullar ve en az üç pencereyle ölçülür. Kalite/çözünürlük/eşik değiştirerek geçiş sağlanmaz. Kabul için mevcut kaynak testleri, en az 120 s kaynak kararlılığı ve eşlenmiş gerçek görseller de geçmelidir. Eksik veya geçmeyen koşul varken PR taslak bırakılır; main'e merge yapılmaz.

## Belgelenmiş sayaç kurtarması

İlk ana girişim 164. pencerede bir çift RAF zaman damgası yüzünden durdu. `main-attempt-01.json` ve günlüğü değiştirilmeden korunur. `counter-recovery-plan.json`, eski/yeni betik hashlerini, 162 tamamlanmış geçerli pencerenin prefix hashini ve tekrar edilecek bütün koşulu kaydeder. Tekrarlı callback artık ayrı FPS sayılmaz; aynı damganın son render bitişi kullanılarak maliyet korunur. Tekil damgalı girdilerin FPS ve p95 hesabı değişmez; dört yeni sayaç testi dahil 74 birim testi geçti. Eski 163. geçerli fakat yarım koşul penceresi de kabul setine seçilmedi; COTA 1440p Ultra kokpitin altı sürümü ve üç tekrarı bütünüyle yeniden ölçülür. Bu açık kurtarma sıradan aynı-betik `--resume` yoluyla geçersiz kayıt gizleme değildir. Eşik/kalite/kaynak/replay aralığı değişmez. RAF gönderim hızı fiziksel scanout hızı değildir; GPU tamamlanmış sorguları ayrıca gösterilir.
