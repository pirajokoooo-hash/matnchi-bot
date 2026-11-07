import test from "node:test";
import assert from "node:assert/strict";
import { restoreKnownUzbekNames } from "../src/uzbek_names.js";

test("restores Jahongir when AI changes it to Jahangir", () => {
  assert.equal(restoreKnownUzbekNames("Jahangir bugun keldi.", "bugun jahongir keldi"), "Jahongir bugun keldi.");
});

test("restores split Jaxon Gir to Jahongir", () => {
  assert.equal(restoreKnownUzbekNames("Jaxon Gir maktabga bordi.", "jaxongir maktabga bordi"), "Jahongir maktabga bordi.");
});

test("preserves Hilola when AI changes it to Hilmola", () => {
  assert.equal(restoreKnownUzbekNames("Hilmola kutubxonaga bordi.", "hilola kutubxonaga bordi"), "Hilola kutubxonaga bordi.");
});

test("capitalizes and preserves common names already present in the source", () => {
  assert.equal(
    restoreKnownUzbekNames("xusan, dilnoza, umar va bobur keldi.", "xusan, dilnoza, umar va bobur keldi"),
    "Xusan, Dilnoza, Umar va Bobur keldi."
  );
});

test("does not rewrite an unrelated or unknown name", () => {
  assert.equal(restoreKnownUzbekNames("Hilmola kutubxonaga bordi.", "hilmola kutubxonaga bordi"), "Hilmola kutubxonaga bordi.");
});

test("restores only names present in the original text", () => {
  assert.equal(restoreKnownUzbekNames("Jahangir va Hilmola.", "jahongir va hilola"), "Jahongir va Hilola.");
});
