# Partner-Café werden · Partner kafe olun

## Türkçe

**Cat Me If You Can**, Kadıköy'ün sokak kedilerini fotoğraflayıp toplayan bir oyun. Bir günde
**20 farklı kedi** yakalayan oyuncu, o gün partner kafelerde geçerli bir **indirim kuponu** alır.

**Ne kazanırsınız?** Gün içinde mahallede gezen yeni müşteriler, kedi dostu bir imaj ve sosyal
medyada paylaşılacak bir hikâye.

**Nasıl çalışır?**
1. İndirim oranını (ör. %20) ve gereken kedi sayısını (ör. 20) siz belirlersiniz. İsterseniz
   günlük bir sınır da koyabilirsiniz.
2. **Telefonla kurulum (en kolayı):** Cat Me ekibi size bir **kurulum QR kodu** gösterir (ya da
   bağlantısını gönderir). Kasadaki telefon/tabletin kamerasıyla okutun → kafenizin adı görünür →
   kendi **PIN**'inizi seçin (6–12 rakam, iki kez; `123456` gibi çok kolay PIN'ler olmaz) →
   **Kaydet ve başla**. Bitti: kafe ekranı açık.
   Sonra „**Ana ekrana ekle**“ (iPhone: Paylaş ⬆️ → „Ana Ekrana Ekle“, Android: menü ⋮ → „Ana ekrana
   ekle“) – ekran tek dokunuşla açılır. Kurulum QR'ı 7 gün geçerli ve bir kez kullanılır.
3. Başka cihazlarda: `…/partner.html` açılır, kafe seçilir, PIN girilir. PIN'i değiştirmek için ekipten
   yeni bir kurulum QR'ı isteyin (eski PIN ve eski oturumlar o an kapanır).
4. Müşteri kuponu gösterir. **QR tara** ya da kodu yazın (`CAT-XXXX-XXXX`), **Kontrol et**,
   sonra **Kullan**. Ekran yeşilse geçerli; kupon sadece **aynı gün** ve **bir kez** geçerlidir.
5. Gün sonunda bugünkü kullanımları aynı ekranda görürsünüz.
6. **Kendi QR kodunuz:** Aynı ekranın altında kafenize özel bir QR kod var. **Masa kartı yazdır**
   ile masa kartı, sticker ya da afiş basabilirsiniz. Kaç misafirin QR kodunuzla geldiğini de orada
   görürsünüz.

**İsteğe bağlı:** Her kupon için yakındaki bir mama noktasına 100 g mama bağışı. Oyunda
gösterilir.

## Deutsch

**Was das Café bekommt:** Laufkundschaft genau dann, wenn Leute unterwegs sind, ein
sympathisches Katzen-Image und einen Anlass für Social Media.

**Ablauf:**
1. Das Café legt Rabatt (z. B. 20 %), Schwelle (z. B. 20 Katzen) und optional ein Tageslimit fest.
2. Die Moderation legt das Café in `admin.html` → „Cafés & Orte“ an – am besten im Café am Handy:
   „Meinen Standort nehmen“ füllt die Koordinaten. Die **PIN darf leer bleiben**.
3. **Einrichtung per QR-Code:** Direkt nach dem Speichern zeigt die Moderation einen
   **Einrichtungs-QR** (später: Reiter „Einrichten“ → „Ein Café einrichten“, oder im Terminal
   `bash deploy/qr.sh kafe <placeId>`). Das Café scannt ihn mit seinem Kassen-Handy/Tablet →
   `partner.html` zeigt den Café-Namen → das Café wählt seine **PIN** selbst (6–12 Ziffern, zweimal)
   – zu leichte PINs wie 123456, 000000 oder 121212 lehnt die Seite ab – → angemeldet, danach der
   Hinweis „Zum Startbildschirm“ und die Karte mit dem eigenen QR-Code. Der
   Code gilt 7 Tage, einmal; ein neuer Einrichtungs-QR macht den alten ungültig. Er steht nur im
   Fragment der Adresse (`#setup=…`), die Seite entfernt ihn sofort aus der Adresszeile. Die PIN wird
   als scrypt-Hash gespeichert und nie angezeigt; beim Einrichten enden alle alten Café-Sitzungen.
   Weitere Geräte: `partner.html` öffnen, Café wählen, PIN eingeben (die Sitzung gilt 12 h; das
   zuletzt benutzte Café ist vorausgewählt). Die Moderation kann die PIN weiter auch selbst setzen.
4. Kund:in zeigt den Gutschein → **QR scannen** (oder Code eintippen) → **Prüfen** →
   **Einlösen**. Grün heißt gültig. Ein Gutschein gilt nur **am selben Tag** und **einmal**.
   Bei „schon eingelöst“ zeigt die App, wo und wann.
5. Die Liste „Heute eingelöst“ und die Gesamtzahl dienen zur Abrechnung, z. B. mit einem Sponsor.
6. **Eigener QR-Code:** Unten in derselben Ansicht steht der QR-Code des Cafés. Mit
   **Tischkarten drucken** gibt es Tischkarte, Sticker oder Poster (Details:
   [features/cafe.md](features/cafe.md)). Dort steht auch, wie viele Gäste über den QR-Code kamen.

**Technik:** Nichts zu installieren. Der Browser (Chrome/Safari) braucht die Kamera nur zum
Scannen; ohne Kamera tippt man den Code ein.
