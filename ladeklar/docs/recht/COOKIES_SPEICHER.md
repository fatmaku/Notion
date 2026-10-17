# Hinweis zu lokal gespeicherten Informationen (§ 25 TDDDG)

> **Hinweis – Muster, keine Rechtsberatung.**
> Dieses Dokument ist ein Mustertext für LADEKLAR. Es ersetzt keine Rechtsberatung und ist vor Verwendung anwaltlich prüfen zu lassen. Platzhalter in [eckigen Klammern] ausfüllen. Die Namen der Einträge in Ziffer 3 entsprechen dem Code-Stand vom 17.10.2026 (`server/index.js`, `web/js`, `web/sw.js`); bei jeder neuen App-Version erneut abgleichen. Mit „Prüfhinweis“ gekennzeichnete Anmerkungen sind vor Veröffentlichung zu entfernen. Recherchestand: 16.10.2026.

Anbieter: [Firma] [Rechtsform], [Anschrift] · Stand: [Datum]

---

## 1. Kurz gesagt

Website und App von LADEKLAR speichern nur Informationen auf Ihrem Gerät, die für den von Ihnen gewünschten Dienst unbedingt erforderlich sind: Anmeldung, Sprache, Offline-Funktion, installierbare App und – nur nach Ihrer Freigabe – Push-Benachrichtigungen. Wir verwenden keine Cookies oder vergleichbaren Techniken für Analyse, Werbung oder Tracking und laden keine Inhalte von Drittanbietern (keine externen Schriften, keine eingebetteten Karten, keine Social-Media-Plugins). Deshalb zeigen wir kein Einwilligungsbanner. Auf den Standort Ihres Geräts greift die App nur mit Ihrer Freigabe zu (Ziffer 4).

## 2. Rechtsgrundlage

(1) Nach § 25 Abs. 1 TDDDG ist die Speicherung von Informationen in Ihrem Endgerät und der Zugriff auf dort gespeicherte Informationen grundsätzlich nur mit Ihrer Einwilligung zulässig.

(2) Eine Einwilligung ist nicht erforderlich, wenn die Speicherung oder der Zugriff unbedingt erforderlich ist, damit wir einen von Ihnen ausdrücklich gewünschten digitalen Dienst bereitstellen können (§ 25 Abs. 2 Nr. 2 TDDDG). Auf diese Ausnahme stützen sich alle Einträge in Ziffer 3.

(3) Die weitere Verarbeitung personenbezogener Daten richtet sich nach der DSGVO (Art. 6 Abs. 1 lit. b bzw. lit. f). Einzelheiten enthalten die Datenschutzerklärung und – für Daten in der App eines Unternehmens – dessen Datenschutzhinweise.

## 3. Übersicht der gespeicherten Informationen

| Name | Art | Zweck | Speicherdauer | Erforderlich, weil |
|---|---|---|---|---|
| `lk_sid` | Cookie (`HttpOnly`, `SameSite=Lax`, `Secure` beim Betrieb über HTTPS), erstanbieterseitig | hält Sie nach der Anmeldung angemeldet; enthält nur eine zufällige Kennung (256 Bit); der Server speichert davon nur einen Hash | Fahrer 90 Tage, Büro-Zugänge und Lizenzgeber 14 Tage; jede Nutzung verlängert die Frist; Abmelden löscht den Cookie sofort | ohne Sitzung ist die Nutzung des Kontos nicht möglich |
| `lk.lang` | lokaler Speicher (localStorage) | von Ihnen gewählte Sprache der App (DE, EN, PL, RO, CS, TR, RU, UK) | bis Sie die Sprache ändern oder die Browserdaten löschen | Darstellung in der gewünschten Sprache, auch vor der Anmeldung |
| `lk.me` | lokaler Speicher | Kopie Ihrer Konto- und Firmenangaben aus der letzten Anmeldung (z. B. Name, Rolle, Handynummer bzw. E-Mail, Sprache, Firmenname, Logo-Verweis, Einstellungen des Unternehmens), damit die App auch ohne Netz startet | bis zur Abmeldung; die nächste Anmeldung überschreibt ihn; bleibt erhalten, wenn die Abmeldung ohne Verbindung scheitert oder die Sitzung abläuft | Start der App ohne Netz (Offline-Funktion) |
| `lk.lockLater` | lokaler Speicher (nur Fahrer-App) | Zeitpunkt, bis zu dem die App nicht erneut nach der Standortfreigabe für die Fahrsperre fragt, nachdem Sie „Später“ gewählt haben | die Frage bleibt 7 Tage ausgeblendet; der Eintrag selbst bleibt bis zum Löschen der Browserdaten | Ihre Entscheidung „Später“ wird beachtet |
| `ladeklar` (Datenbank), Speicher `outbox` | IndexedDB (nur Fahrer-App) | Warteschlange ohne Netz: Bestätigen, Statusschritte, Rückgängig, Notizen und Problemmeldungen mit allen Angaben (falls freigegeben auch der Standort des Tippens), Fotos, PDF-Lieferscheine und die Unterschrift des Empfängers; die App sendet sie der Reihe nach | bis zur erfolgreichen Übertragung; lehnt der Server einen Eintrag ab, löscht die App ihn ebenfalls und zeigt einen Hinweis | Funktion der App bei Funklöchern |
| `/sw.js` und Cache `lk-1.0.0` | Service Worker und Cache Storage | Programmdateien der App (Startseite, Oberfläche, Skripte, Schriften, Symbole) für schnellen Start und Offline-Betrieb; keine Antworten der Schnittstelle (`/api/`) und damit keine Lieferdaten | bis zur nächsten App-Version (der alte Cache wird dann gelöscht) oder bis zum Löschen der Browserdaten | installierbare App und Offline-Funktion |
| Push-Abonnement | im Browser gespeichertes Abonnement (Endpunkt und Schlüssel) | Zustellung von Push-Benachrichtigungen | bis zur Abmeldung in der App, bis Sie Benachrichtigungen im Browser abschalten oder bis der Push-Dienst das Abonnement aufhebt | nur nach Ihrer ausdrücklichen Freigabe von Benachrichtigungen |
| `ladeklar.demo.v2` | lokaler Speicher (nur Online-Demo) | Zustand der Online-Demo mit Beispieldaten (Firmen, Nutzer, Fahrzeuge, Lieferungen, Mitteilungen, Dateien, Protokoll) | bis „Demo zurücksetzen“ oder zum Löschen der Browserdaten | Funktion der Demo |
| `lk.demo.<Bereich>`, `lk.demo.mode` | Sitzungsspeicher (sessionStorage, nur Online-Demo) | in der Demo gewählte Rolle je Bildschirmbereich und gewählte Ansicht | bis zum Schließen des Browser-Tabs oder „Demo zurücksetzen“ | Funktion der Demo |
| `lk.t` | lokaler Speicher (nur Online-Demo) | Prüfung, ob der Browser lokales Speichern erlaubt | wird sofort wieder gelöscht | Funktion der Demo |

Nicht gespeichert werden der Firmencode (er ergibt sich aus der Adresse, z. B. `/t/KAYA`, einer Subdomain oder der eigenen Domain des Unternehmens) und ein Schutz-Token gegen untergeschobene Anfragen (die App sendet dafür bei jeder schreibenden Anfrage eine feste Kopfzeile mit; der Cookie hat `SameSite=Lax`).

> **Prüfhinweis (Technik):** Die Liste ist mit dem Code abgeglichen (Cookie: `server/index.js`, `startSession`; lokaler Speicher: `web/js/i18n.js`, `web/js/app.js`, `web/js/api-http.js`, `web/js/views/driver.js`, `web/js/api-local.js`, `web/js/demo.js`; IndexedDB: `web/js/api-http.js`; Cache: `web/sw.js`). `Secure` setzt der Server nur, wenn `BASE_URL` mit `https://` beginnt; im Betrieb muss das so sein. Die automatische Darstellung im Dunkelmodus nutzt die Systemeinstellung (`prefers-color-scheme`) und speichert nichts. `lk.me` enthält personenbezogene Daten und liegt unverschlüsselt im Browser; die Einordnung als „unbedingt erforderlich“ stützt sich auf den Start ohne Netz. Neue Einträge vor jeder Version ergänzen und prüfen, ob sie unbedingt erforderlich sind; reine Komfortfunktionen können eine Einwilligung erfordern.

## 4. Zugriff auf Gerätefunktionen

| Funktion | Wann | Grundlage |
|---|---|---|
| **Kamera bzw. Dateiauswahl** | nur wenn Sie auf „Lieferschein fotografieren“, „Weitere Seite“, „Hinzufügen“ oder beim Melden eines Problems auf „Foto hinzufügen (optional)“ tippen | von Ihnen ausgelöst; unbedingt erforderlich für die gewünschte Foto-Funktion (§ 25 Abs. 2 Nr. 2 TDDDG) |
| **Benachrichtigungen** | nur nach Ihrer Freigabe | Ihre Freigabe; Einzelheiten in der Datenschutzerklärung |
| **Standort für die Fahrsperre** | nur wenn Ihr Unternehmen die Fahrsperre eingeschaltet hat (Voreinstellung: eingeschaltet) und Sie den Standort freigeben. Die App erklärt vorher auf der Startseite, wofür sie ihn braucht; danach fragt Ihr Gerät die Berechtigung ab. Die App liest daraus nur die Geschwindigkeit, im Gerät; sie speichert und sendet den Standort dafür nicht. | **Einwilligung** nach § 25 Abs. 1 TDDDG über die Berechtigungsabfrage Ihres Geräts; jederzeit widerruflich in den Geräte- bzw. Browsereinstellungen |
| **Standort beim Statuswechsel** | nur wenn Ihr Unternehmen „Standort beim Statuswechsel speichern“ eingeschaltet hat, Sie in der App mit „Ja, teilen“ zugestimmt und den Standort im Gerät freigegeben haben. Die App fragt den Standort dann nur beim Tippen auf einen Statusschritt oder beim Melden eines Problems ab und sendet ihn mit dieser Meldung. | **Einwilligung** nach § 25 Abs. 1 TDDDG; widerruflich in der App unter „Mehr“ (Schalter „Standort beim Status-Tipp teilen“) oder in den Geräteeinstellungen |

Die Standortabfrage ist keine Ausnahme nach § 25 Abs. 2 TDDDG, weil sie nicht für einen von Ihnen selbst ausdrücklich gewünschten Dienst unbedingt erforderlich ist. Sie erfolgt deshalb nur mit Ihrer Einwilligung. Die App funktioniert ohne Standort vollständig; ohne Freigabe ist nur die Fahrsperre aus.

> **Prüfhinweis:** Die Fahrsperre ist in der Software voreingestellt eingeschaltet und unabhängig von der Einstellung „Standort beim Statuswechsel“; die App bittet Fahrer deshalb auch dann um die Standortfreigabe, wenn das Unternehmen keine Standorte speichert. Offen ist, (a) ob das Auslesen der Geschwindigkeit durch App-Code, der nur im Gerät läuft und nichts überträgt, ein „Zugriff“ im Sinne des § 25 Abs. 1 TDDDG ist, (b) ob der Erklärungstext auf der Startseite zusammen mit der Berechtigungsabfrage des Browsers den Anforderungen an eine informierte Einwilligung genügt und (c) ob die Einwilligung im Beschäftigungsverhältnis freiwillig ist, wenn der Arbeitgeber die Fahrsperre vorgibt. Für die Freiwilligkeit spricht, dass die App ohne Freigabe voll funktioniert und „Später“ die Frage für 7 Tage ausblendet.

## 5. Begründung, warum kein Einwilligungsbanner erforderlich ist

1. **Sitzungs-Cookie:** Wer sich anmeldet, wünscht ausdrücklich die Nutzung seines Kontos. Ohne Sitzungskennung müsste bei jedem Aufruf neu angemeldet werden; die Kennung ist daher unbedingt erforderlich. Die Laufzeit von 90 Tagen für Fahrer erspart ihnen die erneute Eingabe von Firmencode, Handynummer und PIN unterwegs; für Büro-Zugänge gelten 14 Tage. Jede Nutzung verlängert die Frist; sie endet mit der Abmeldung.
2. **Sprache und zwischengespeicherte Kontoangaben:** Die Anzeige in der gewählten Sprache und der Start der App ohne Netz sind Teil des gewünschten Dienstes. Es werden keine Profile gebildet.
3. **Offline-Warteschlange:** Die Speicherung ist Voraussetzung dafür, dass Meldungen bei fehlender Verbindung nicht verloren gehen. Die Einträge werden nach Übertragung gelöscht.
4. **Hinweis „Später“ bei der Fahrsperre:** Der Eintrag sorgt nur dafür, dass die App Ihre Entscheidung beachtet und nicht bei jedem Start erneut fragt.
5. **Service Worker und Cache:** Die installierbare App und der Offline-Betrieb setzen die lokale Speicherung der Programmdateien voraus. Der Cache enthält keine personenbezogenen Daten.
6. **Push-Abonnement:** Es entsteht erst durch die ausdrückliche Freigabe des Nutzers und dient allein dem gewünschten Dienst.
7. **Keine Drittanbieter:** Da weder Analyse- noch Werbedienste noch externe Inhalte eingebunden sind, gibt es keine einwilligungsbedürftigen Speichervorgänge oder Zugriffe Dritter.

> **Prüfhinweis:** Maßstab ist die Orientierungshilfe der DSK für Anbieter digitaler Dienste (Version 1.2, November 2024): Für § 25 TDDDG gibt es nur die Einwilligung oder die beiden Ausnahmen des Abs. 2, keine Interessenabwägung; „unbedingt erforderlich“ ist eng auszulegen. Die Einordnung von Service Worker und Cache Storage ist in der OH nicht ausdrücklich behandelt; die Argumentation stützt sich auf den vom Nutzer gewünschten Offline-Betrieb. Der Digital Omnibus (Vorschlag vom 19.11.2025) will die Regeln zur Endgerätespeicherung in die DSGVO überführen (Art. 88a/88b); er war am 16.10.2026 nicht verabschiedet.

## 6. Was Sie selbst tun können

1. Abmelden beendet die Sitzung, löscht den Sitzungs-Cookie und die zwischengespeicherten Kontoangaben (`lk.me`) und meldet Push-Benachrichtigungen für dieses Gerät ab. In der Fahrer-App ist „Abmelden“ gesperrt, solange noch Einträge auf das Senden warten.
2. Die Sprache ändern Sie in der App. Push-Benachrichtigungen schalten Sie in der App ein; abschalten können Sie sie in den Einstellungen Ihres Browsers bzw. Geräts oder durch Abmelden.
3. Über die Einstellungen Ihres Browsers können Sie alle gespeicherten Informationen löschen. Bitte beachten Sie, dass dann noch nicht gesendete Einträge der Offline-Warteschlange verloren gehen.
4. Die Standortberechtigung entziehen Sie in den Einstellungen Ihres Geräts bzw. Browsers. Die Zustimmung zum Speichern des Standorts beim Statuswechsel können Sie zusätzlich in der App unter „Mehr“ abschalten.

Stand: [Datum]
