import test from "node:test";
import assert from "node:assert/strict";
import { toNewAlphabet, latinToCyrillic, cyrillicToLatin, splitTelegramText, isUzbekText } from "../src/index.js";
import { restoreKnownUzbekNames } from "../src/uzbek_names.js";

test("new Uzbek alphabet converts apostrophe letters and digraphs", () => {
  assert.equal(toNewAlphabet("O‘zbekcha, g‘alaba, shahar, chiroy"), "Özbekça, ğalaba, şahar, çiroy");
});

test("Latin to Cyrillic keeps Uzbek X and H distinct", () => {
  assert.equal(latinToCyrillic("Xusan va Hilola"), "Хусан ва Ҳилола");
});

test("Cyrillic to new Latin uses the selected alphabet", () => {
  assert.equal(cyrillicToLatin("Ўзбекистон, шаҳар, чирой"), "Özbekiston, şahar, çiroy");
});

test("known name restoration fixes model corruption without changing the source name", () => {
  assert.equal(restoreKnownUzbekNames("Hilmola Jahangir bilan keldi", "Hilola va Jahongir"), "Hilola Jahongir bilan keldi");
});

test("Uzbek text detection recognizes common Uzbek words", () => {
  assert.equal(isUzbekText("bugun havo yaxshi"), true);
});

test("long Telegram replies are split under the limit without losing characters", () => {
  const source = ("Birinchi qator.\nIkkinchi qator. 😀 ").repeat(300);
  const parts = splitTelegramText(source, 3900);
  assert.ok(parts.length > 1);
  assert.ok(parts.every(part => part.length <= 3900));
  assert.equal(parts.join(""), source);
});
