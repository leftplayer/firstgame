# Web preview

GitHub Pages builds the DOM preview; these UI changes apply to web, not the Cocos scene.

Chinese uses original characters, including punctuation, and supports multi-character IME commits. Preedit starts the clock immediately when the browser receives a keystroke / insertion / composition update; validation waits for committed Chinese text. English preedit still updates immediately.

Incorrect characters remain in the input and are highlighted red in the original text. Later characters continue advancing normally. No error message is shown. Web rounds finish when the article character count is reached, even with errors. Chinese IME preedit starts timing but only committed text completes a round.

The viewport contains five lines. Row one stays at the top initially; afterward one previous row is retained so the active row stays second. Lower rows fade and blur. Result timer uses smaller typography.

Run `npm test` and `node scripts/build-web.mjs`. Mobile native IME behavior still needs real-device verification.

Rendered glyph cells have a fixed 37px line height. The article is translated by the actual previous row offset; an absolutely positioned caret cannot change wrapping. Assets and module imports use content hashes to avoid mixed cached deployments.


Feedback: Web Audio creates quiet clicks after user interaction, with an 8ms vibration request on supported devices. Sound and haptics are always enabled with no in-page controls; old saved toggle preferences are ignored. Wrong characters use a distinct low double tone, replacing a pending normal click. Repeated keyboard/composition notifications within 35ms are coalesced. Missing APIs are harmless.

Results: accuracy = correct positions / final input characters; speed = final input characters / elapsed minutes; character count includes punctuation and spaces, counts Unicode code points. Completion time freezes before the 650ms scatter effect. Only visible glyphs scatter; reduced-motion users skip the burst. Restart cancels pending animation and result reveal. Native share/copy includes all metrics.

English non-whitespace tokens are unbreakable word containers. The active timer turns orange immediately on first input and resets to gray on Restart.

Result metrics now show ACC / WPM / WORDS / CHARS. WPM counts actual English words per elapsed minute (not characters divided by five). Apostrophes and hyphens inside words are retained; punctuation alone is excluded. Chinese articles show a dash for English-only word metrics. Short test text: `cat and dog sun and sky`, with natural wrapping and no forced line breaks. English spaces are rendered at .35em. Result focus has no outer outline; buttons suppress text selection and use scale/opacity press feedback with a muted keyboard focus outline.
