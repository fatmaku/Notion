# Third-party notices

LiveFX itself is our own work. The files listed below are bundled third-party material and remain under
their original licences.

## Microsoft Fluent Emoji (MIT)

- **What:** the reaction stickers in `memes/fluent/*.webp` (listed in `memes/index.json`), converted to
  WebP 160 px (animated or static) by `scripts/build-memes.js`. The images were resized and re-encoded;
  nothing else was changed.
- **Sources:**
  - Fluent Emoji Animated – https://github.com/microsoft/fluentui-emoji-animated (animated APNG)
  - Fluent Emoji – https://github.com/microsoft/fluentui-emoji (static 3D PNG, used where no animation exists)
- **Licence:** MIT, full text below (identical in both repositories).

```
MIT License

Copyright (c) Microsoft Corporation.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE
```

"Microsoft" and "Fluent" are trademarks of Microsoft Corporation. Using the emoji images under the MIT
licence does not imply endorsement by Microsoft.

## Noto Emoji (Apache 2.0)

Not bundled at the moment. If Noto Color Emoji images are added to `memes/`, add the Apache License 2.0
text and the `NOTICE` of https://github.com/googlefonts/noto-emoji here.

## Own content

The text sticker packs (`text-tr`, `text-de`, `text-en` in `js/packs.js`) are rendered live from text and
are our own work. Emoji characters shown as fallback come from the viewer's system font.
