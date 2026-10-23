# Web preview

GitHub Pages builds the DOM preview; these UI changes apply to web, not the Cocos scene.

Chinese uses original characters, including punctuation, and supports multi-character IME commits. Preedit starts the clock immediately when the browser receives a keystroke / insertion / composition update; validation waits for committed Chinese text. English preedit still updates immediately.

Input is accepted only through the first matching prefix. A mismatch discards that character and the rest of the batch, highlights the expected character red, and does not advance. Users can immediately type the correct replacement. No error message is shown.

The viewport contains five lines. Row one stays at the top initially; afterward one previous row is retained so the active row stays second. Lower rows fade and blur. Result timer uses smaller typography.

Run `npm test` and `node scripts/build-web.mjs`. Mobile native IME behavior still needs real-device verification.
