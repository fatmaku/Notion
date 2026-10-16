# Hinweis zu lokal gespeicherten Informationen (§ 25 TDDDG)

> **Hinweis – Muster, keine Rechtsberatung.**
> Dieses Dokument ist ein Mustertext für LADEKLAR. Es ersetzt keine Rechtsberatung und ist vor Verwendung anwaltlich prüfen zu lassen. Platzhalter in [eckigen Klammern] ausfüllen. Die Namen der Einträge sind Platzhalter und müssen den tatsächlich im Code verwendeten Namen entsprechen. Mit „Prüfhinweis“ gekennzeichnete Anmerkungen sind vor Veröffentlichung zu entfernen. Recherchestand: 16.10.2026.

Anbieter: [Firma] [Rechtsform], [Anschrift] · Stand: [Datum]

---

## 1. Kurz gesagt

Website und App von LADEKLAR speichern nur Informationen auf Ihrem Gerät, die für den von Ihnen gewünschten Dienst unbedingt erforderlich sind: Anmeldung, Sprache, Offline-Funktion, installierbare App und – nur nach Ihrer Freigabe – Push-Benachrichtigungen. Wir verwenden keine Cookies oder vergleichbaren Techniken für Analyse, Werbung oder Tracking und laden keine Inhalte von Drittanbietern (keine externen Schriften, keine Karten, keine Social-Media-Plugins). Deshalb zeigen wir kein Einwilligungsbanner.

## 2. Rechtsgrundlage

(1) Nach § 25 Abs. 1 TDDDG ist die Speicherung von Informationen in Ihrem Endgerät und der Zugriff auf dort gespeicherte Informationen grundsätzlich nur mit Ihrer Einwilligung zulässig.

(2) Eine Einwilligung ist nicht erforderlich, wenn die Speicherung oder der Zugriff unbedingt erforderlich ist, damit wir einen von Ihnen ausdrücklich gewünschten digitalen Dienst bereitstellen können (§ 25 Abs. 2 Nr. 2 TDDDG). Auf diese Ausnahme stützen sich alle Einträge in Ziffer 3.

(3) Die weitere Verarbeitung personenbezogener Daten richtet sich nach der DSGVO (Art. 6 Abs. 1 lit. b bzw. lit. f). Einzelheiten enthalten die Datenschutzerklärung und – für Daten in der App eines Unternehmens – dessen Datenschutzhinweise.

## 3. Übersicht der gespeicherten Informationen

| Name | Art | Zweck | Speicherdauer | Erforderlich, weil |
|---|---|---|---|---|
| `[lk_session]` | Cookie (`HttpOnly`, `Secure`, `SameSite=[Lax]`), erstanbieterseitig | hält Sie nach der Anmeldung angemeldet; enthält nur eine zufällige Kennung, serverseitig nur als Hash gespeichert | bis zur Abmeldung, höchstens 90 Tage | ohne Sitzung ist die Nutzung des Kontos nicht möglich |
| `[lk_csrf]` | Cookie oder Formularfeld | Schutz vor untergeschobenen Anfragen (Cross-Site-Request-Forgery) | Sitzung | Sicherheit des gewünschten Dienstes |
| `[lk_lang]` | lokaler Speicher (localStorage) | von Ihnen gewählte Sprache der App (DE, EN, PL, RO, TR, RU, UK) | bis Sie die Sprache ändern oder die Browserdaten löschen | Darstellung in der gewünschten Sprache, auch vor der Anmeldung |
| `[lk_tenant]` | lokaler Speicher | zuletzt verwendeter Firmencode, damit Anmeldeseite, Logo und Farben Ihres Unternehmens angezeigt werden | bis zur Abmeldung oder zum Löschen der Browserdaten | Anmeldung und Branding des Unternehmens |
| `[lk_outbox]` | IndexedDB | Offline-Warteschlange: noch nicht gesendete Statusmeldungen, Notizen und Fotos | bis zur erfolgreichen Übertragung, dann automatisch gelöscht | Funktion der App bei Funklöchern |
| `[lk-app-v…]` | Service Worker und Cache Storage | Programmdateien der App (Oberfläche, Symbole, Schriften) für schnellen Start und Offline-Betrieb; keine personenbezogenen Daten | bis zur nächsten App-Aktualisierung oder Deinstallation | installierbare App und Offline-Funktion |
| Push-Abonnement | im Browser gespeichertes Abonnement (Endpunkt und Schlüssel) | Zustellung von Push-Benachrichtigungen | bis Sie Benachrichtigungen in der App oder im Browser abschalten | nur nach Ihrer ausdrücklichen Freigabe von Benachrichtigungen |
| `[lk_demo]` | lokaler Speicher (nur Online-Demo) | Zustand der Online-Demo mit Beispieldaten | bis zum Zurücksetzen der Demo oder Löschen der Browserdaten | Funktion der Demo |

> **Prüfhinweis (Technik):** Namen, Attribute und Laufzeiten mit dem Code abgleichen. Die automatische Darstellung im Dunkelmodus nutzt die Systemeinstellung (`prefers-color-scheme`) und speichert nichts. Falls weitere Einträge existieren (z. B. gewähltes Fahrzeug, Hinweis „Einführung gesehen“), ergänzen und prüfen, ob sie unbedingt erforderlich sind; reine Komfortfunktionen können eine Einwilligung erfordern.

## 4. Zugriff auf Gerätefunktionen

| Funktion | Wann | Grundlage |
|---|---|---|
| **Kamera bzw. Dateiauswahl** | nur wenn Sie auf „Lieferschein fotografieren“ oder „Foto hinzufügen“ tippen | von Ihnen ausgelöst; unbedingt erforderlich für die gewünschte Foto-Funktion (§ 25 Abs. 2 Nr. 2 TDDDG) |
| **Benachrichtigungen** | nur nach Ihrer Freigabe | Ihre Freigabe; Einzelheiten in der Datenschutzerklärung |
| **Standort** | nur wenn Ihr Unternehmen die Funktion „Standort beim Statuswechsel“ bzw. die Fahrsperre eingeschaltet hat und Sie zustimmen | **Einwilligung** nach § 25 Abs. 1 TDDDG, eingeholt über einen Hinweis in der App und die Berechtigungsabfrage Ihres Geräts; jederzeit widerruflich in den Geräteeinstellungen |

Die Standortabfrage ist keine Ausnahme nach § 25 Abs. 2 TDDDG, weil sie nicht für einen von Ihnen selbst ausdrücklich gewünschten Dienst unbedingt erforderlich ist. Sie erfolgt deshalb nur mit Ihrer Einwilligung. Die App funktioniert ohne Standort vollständig.

## 5. Begründung, warum kein Einwilligungsbanner erforderlich ist

1. **Sitzungs-Cookie:** Wer sich anmeldet, wünscht ausdrücklich die Nutzung seines Kontos. Ohne Sitzungskennung müsste bei jedem Aufruf neu angemeldet werden; die Kennung ist daher unbedingt erforderlich. Die Laufzeit von 90 Tagen entspricht dem Zweck, Fahrern eine erneute Eingabe von Firmencode und PIN unterwegs zu ersparen, und endet mit der Abmeldung.
2. **Sprache und Firmencode:** Die Anzeige in der gewählten Sprache und im Erscheinungsbild des Unternehmens ist Teil des gewünschten Dienstes. Es werden keine Profile gebildet.
3. **Offline-Warteschlange:** Die Speicherung ist Voraussetzung dafür, dass Meldungen bei fehlender Verbindung nicht verloren gehen. Die Einträge werden nach Übertragung gelöscht.
4. **Service Worker und Cache:** Die installierbare App und der Offline-Betrieb setzen die lokale Speicherung der Programmdateien voraus. Der Cache enthält keine personenbezogenen Daten.
5. **Push-Abonnement:** Es entsteht erst durch die ausdrückliche Freigabe des Nutzers und dient allein dem gewünschten Dienst.
6. **Keine Drittanbieter:** Da weder Analyse- noch Werbedienste noch externe Inhalte eingebunden sind, gibt es keine einwilligungsbedürftigen Speichervorgänge oder Zugriffe Dritter.

> **Prüfhinweis:** Maßstab ist die Orientierungshilfe der DSK für Anbieter digitaler Dienste (Version 1.2, November 2024): Für § 25 TDDDG gibt es nur die Einwilligung oder die beiden Ausnahmen des Abs. 2, keine Interessenabwägung; „unbedingt erforderlich“ ist eng auszulegen. Die Einordnung von Service Worker und Cache Storage ist in der OH nicht ausdrücklich behandelt; die Argumentation stützt sich auf den vom Nutzer gewünschten Offline-Betrieb. Der Digital Omnibus (Vorschlag vom 19.11.2025) will die Regeln zur Endgerätespeicherung in die DSGVO überführen (Art. 88a/88b); er war am 16.10.2026 nicht verabschiedet.

## 6. Was Sie selbst tun können

1. Abmelden beendet die Sitzung und entfernt den Sitzungs-Cookie.
2. Sprache und Benachrichtigungen ändern Sie in der App.
3. Über die Einstellungen Ihres Browsers können Sie alle gespeicherten Informationen löschen. Bitte beachten Sie, dass dann noch nicht gesendete Einträge der Offline-Warteschlange verloren gehen.
4. Die Standortberechtigung entziehen Sie in den Einstellungen Ihres Geräts.

Stand: [Datum]
