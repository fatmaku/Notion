# Project 3 – Inner Compass (Innenkompass)

**Working title:** Innenkompass | İçPusula | Inner Compass  
**Product type:** multilingual, hybrid reflection companion  
**Launch languages:** German, Turkish and English  
**Research status:** October 8, 2026, re-checked on October 9, 2026

## 1. Product description

Inner Compass helps people reflect on dreams, feelings, recurring signs and spiritual experiences. The app asks personal, open questions and lets people articulate their own connections. It does not predict the future, does not claim universal symbol meanings and does not give diagnoses.

**Guiding slogans:**

- German: „Keine Prophezeiung. Gute Fragen, die bei dir anfangen.“
- Turkish: „Kehanet değil; kendi anlamını bulmana yardımcı sorular.“
- English: “No predictions. Questions that help you find your own meaning.”

The product should not be called "Schamanastrologie" (shaman-astrology). That sounds like astrology and like a claim to spiritual authority. Spiritual and shamanic traditions can appear as clearly labelled perspectives, provided they are carefully researched and developed together with relevant experts.

## 2. Market and product positioning

The market already includes apps with dream journals, personal context, recurring patterns, AI-generated questions and multiple spiritual perspectives. Ruya describes eleven interpretation methods in three families (its Amazon store listing mentions twelve): psychology (cognitive, Jungian, existential, narrative therapy, lucid dreaming), spirituality (signs and synchronicities, spirit guides and angels, energy/chakras, shamanic dreamwork) and religion (Christian, Islamic following Ibn Sirin). Before each interpretation, the app asks guided context questions and tracks recurring people, places and symbols. Oniri offers voice notes, emotions, people, places and actions per dream, statistics and PDF export (export and statistics are part of the premium subscription). A dedicated nightmare analysis could not be verified in the descriptions reviewed. [Ruya – 11 methods](https://ruya.co/en-US/articles/how-dream-interpretation-works-methods-explained), [Ruya on Google Play](https://play.google.com/store/apps/details?id=co.ruya), [Oniri on the App Store](https://apps.apple.com/ca/app/oniri-your-dream-journal/id968737914)

According to its Google Play description, Felek guides users step by step through the coffee ritual (brewing, making a wish, swirling, turning the cup over, waiting) and interprets a photo of the cup using AI; the App Store description additionally mentions horoscopes and birth charts. The previously noted claims of "85 traditional symbols", "sources" and "journal" could not be confirmed on re-checking (see [RECHERCHE-PRUEFUNG.md](RECHERCHE-PRUEFUNG.md) (German)). BakFal bundles eight forms of reading (including coffee grounds, palm, tarot, dream interpretation, horoscope and birth chart), describes itself as entertainment and self-reflection rather than factual prediction, states that it deletes photos immediately after the reading and offers one free reading per day. [Felek on Google Play](https://play.google.com/store/apps/details?id=com.cvpkdigitalstudio.felek), [BakFal](https://bakfal.com/en/)

It follows that "no predictions" or "personal patterns" alone are not a sufficient differentiator. Inner Compass must work differently in concrete ways: every pattern statement cites its evidence, users determine their own meaning, corrections remain visible and deletable, and the app can be used without internet in guided mode.

The research is based on public websites, store pages and described product flows. It is not an independent audit of vendor backends or model quality.

## 3. Topic areas

- Dreams and recurring dream images
- Animals, numbers, places, colours and other recurring signs
- Feelings, conflicts, wishes and personal decisions
- Coffee cup images and the cultural practice of fal (Turkish fortune-reading traditions)
- Astrological terms as a starting point for self-reflection, not as prediction
- Jinn (cin), ghosts, angels, the deceased, ancestors and other spiritual experiences

## 4. Conversation flow

Every session follows a clear, understandable sequence:

1. **What happened?** Distinguish between a dream, a waking experience, a memory, a story or uncertainty.
2. **What did you notice?** The person describes it themselves before the app makes any suggestions.
3. **What feeling was there?** A selection with free text, "none of these" and "I don't know".
4. **What personal connection is there?** Memory, family, culture, religion, a wish or a worry.
5. **What was going on at the time?** Context only as far as the person wants to share it.
6. **What other perspectives might fit?** For example, coincidence, heightened attention, an everyday memory or a cultural narrative.
7. **What does the person themselves think?** The app summarises their answers and asks for confirmation or correction.
8. **How should things continue?** Keep writing, choose a next question, plan a small step or end the session.

Every path offers "No answer fits", "Something else", "Unsure", "Skip" and "End". The app does not promise to already have every possible meaning in a list.

## 5. Jinn, ghosts and religion

This content gets its own optional topic path. The app first asks whether it concerns a dream, a personal experience, a religious belief, a cultural narrative or something uncertain. The person can choose whether they want to see only personal reflection, a cultural/religious perspective, or both.

The app must not mock the person or blanket-pathologise their beliefs. Equally, it must not claim that a jinn or ghost is actually present, is speaking through the app or has a particular intention. Cultural and religious sources must be labelled with their tradition, source and context; there is no single interpretation that applies to all believers. This requires paid consultation with several appropriate cultural and religious experts.

If someone feels acutely threatened, is at risk, or a voice is telling them to cause harm, the app stops the interpretation path and offers a clearly recognisable way to seek human support. It does not make a diagnosis. [NHS: information on hallucinations and hearing voices](https://www.nhs.uk/mental-health/feelings-symptoms-behaviours/feelings-and-symptoms/hallucinations-hearing-voices/)

Ghost or jinn detection via camera, microphone or magnetometer is not part of the product. A separate horror/folklore game could be developed later as fiction, clearly separated from personal guidance.

## 6. Learning from repetition and mistakes

### Personal patterns

The first version does not need a self-training language model. Local pattern logic can count which explicitly saved terms, feelings or custom tags recur. Example:

> "You have mentioned a raven in three entries over the last two months. In two of them you noted curiosity. Would you like to look at these entries together?"

Each pattern card shows the time period, the count and links to the entries. It does not interpret causes and does not claim that a recurring symbol reveals a hidden motive.

### Personal correction

After a summary, the app asks: "Fits", "partly", "no" or "change". It remembers a personal association only with explicit consent. The person can edit, reset or delete it at any time.

### Product improvement

Feedback must not directly alter the live model without review. The process is: data-minimal and voluntary feedback, human review, changes to rules or questions, testing in all three languages, and only then a versioned update with the option to roll back. Raw journal texts are not used for model training by default.

## 7. App modes and architecture

### Offline guided mode

Editorially prepared decision paths, questions and the journal work without internet. Users can choose topics and save their own entries locally. The system can find recurring tags and self-confirmed connections on the device. It does not analyse free-form narratives as flexibly as a large language model.

### Optional online AI dialogue

The person can choose to send free text or voice input to an AI service. Beforehand, the app explains what will be transmitted. The AI selects suitable follow-up questions, organises answers and creates a summary. It does not produce predictions of the future, diagnoses or authoritative statements. The person must be able to actively switch on data transmission.

### Local data

Journal stored locally by default, access protection via device features, export and permanent deletion. Sync is optional. Sensitive entries are not used for advertising profiles and are not used for model training by default.

### Later local AI

On-device models can be evaluated later, once they run quickly, compactly and with sufficient language quality on supported devices. Apple Core ML and Android ML Kit offer local ML processing; actual language model performance and device coverage must be tested separately. [Apple Machine Learning HIG](https://developer.apple.com/design/human-interface-guidelines/machine-learning), [Google ML Kit privacy](https://developers.google.cn/ml-kit/terms)

## 8. Models for UX and features

- **Quick start:** one large button, "Capture a dream or thought"; voice input for moments when typing is hard.
- **Journal timeline:** dreams, feelings and voluntarily noted events in chronological order, searchable and with custom tags.
- **Pattern view:** a few verifiable cards instead of opaque AI graphics; each card leads to the entries.
- **Choice of perspective:** select a personal, cultural, religious or sceptical view on request; display perspectives side by side without marking any one as universally valid.
- **Coffee ritual:** step-by-step flow and cultural sources; first let the person describe what they see, then optional, cautious image recognition.
- **Calm design:** warm illustrations, simple navigation, highly legible typography, screen reader support and read-aloud function.
- **Healthy use:** reminders are optional; no daily streaks, manipulative countdown offers or purchases during distressing sessions.

## 9. MVP and implementation plan

1. Define the product promise, boundaries and target groups.
2. Conduct interviews in German, Turkish and English, including various religious and non-religious perspectives as well as people who do not want esotericism.
3. Build three core paths: dreams, recurring signs, and feelings/decisions.
4. Add an offline journal, local pattern cards and optional online AI.
5. Publish ghost/jinn content only with sources and review by appropriate experts.
6. Beta-test for leading questions, false certainty, understanding of data protection, accessibility and translation quality.
7. Carry out legal, data protection, store and – for Turkey – advertising review before release.
8. After launch, review feedback, version content and be able to roll back problematic flows.

As a rough estimate, several months are appropriate for a serious trilingual MVP. The scope depends on team size, choice of model and the extent of human review.

## 10. Business model

- Free entry tier with some reflection paths and a local journal.
- Optional monthly subscription for new reviewed topic packs and a transparent online AI quota.
- One-time purchase for permanently available offline packs.
- No "credits per anxious question", no paid prophecies and no automatic purchase prompts in moments of crisis.

The app must disclose that subscription renewal regularly requires a connection to the store and that online AI requires internet. The offline part remains usable for downloaded content.

## 11. Quality standards

- Users can always object, correct, skip and delete.
- Every pattern statement shows the time period and the underlying entries.
- Users understand when content leaves the device and when AI is involved.
- The app claims neither a true symbol dictionary nor contact with supernatural beings.
- All core paths work in German, Turkish and English and are editorially reviewed by native speakers.
- Success is measured by whether users feel respected and not pushed into an interpretation – not by whether they consider an AI interpretation "accurate".

## Sources and competitor examples

- [Ruya – 11 interpretation methods explained](https://ruya.co/en-US/articles/how-dream-interpretation-works-methods-explained)
- [Ruya – Google Play](https://play.google.com/store/apps/details?id=co.ruya)
- [Oniri – App Store](https://apps.apple.com/ca/app/oniri-your-dream-journal/id968737914)
- [Felek – Google Play](https://play.google.com/store/apps/details?id=com.cvpkdigitalstudio.felek)
- [Felek – privacy and AI processing](https://felek.app/en/privacy/) (not re-checked, see research review)
- [BakFal – multilingual self-reflection positioning](https://bakfal.com/en/)
- [NHS – hallucinations and hearing voices](https://www.nhs.uk/mental-health/feelings-symptoms-behaviours/feelings-and-symptoms/hallucinations-hearing-voices/)
