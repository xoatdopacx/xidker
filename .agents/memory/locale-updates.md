---
name: Adding UI text to all 33 locale files
description: How to add or change many UI strings across every locale JSON without breaking key order or missing a language.
---

For more than a handful of strings, do not edit 33 JSON files by hand. Write the strings per language into a Node script (split into two or three files to keep each one readable), merge them by key path into each locale so every file follows `vi.json`'s key order, back up the old files first, then check that every file has exactly `vi.json`'s key paths.
**Why:** the English fallback hides a missing key, so a skipped language looks fine until someone reads it in that language; the merge script plus the key-path check catches it. This worked for the 42-key support chat text.
**How to apply:** any change that adds or renames keys in more than a couple of locales; afterwards run the web-landing typecheck and look at one RTL language (ar) in the browser.

Second use, 45 sample-picker strings (2026-10-15): one array per language in vi.json key order, spread over three source files, merged by a script that refused to write unless every language was present, every array had the right length, no string was empty, each string's `{placeholder}` set matched en, and no two neighbouring strings were identical (a duplicated line shifts every later string into the wrong key). Match each file's existing wording: the package word follows its `thanks.pkg`, and the formality follows its existing text (zh-CN 您, id "Anda", ms lowercase "anda", pl capitalized Ciebie/Twój, pt "o Whop").
**Why:** these checks caught shifted and placeholder errors before anything was written; the result passed the key-path check on the first merge.
**How to apply:** reuse the same checks for the next batch.
