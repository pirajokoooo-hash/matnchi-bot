import test from "node:test";
import assert from "node:assert/strict";
import { restoreKnownUzbekNames, fixKnownPluralAgreement } from "../src/uzbek_names.js";

test("restores Jahongir when AI changes it to Jahangir", () => {
  assert.equal(restoreKnownUzbekNames("Jahangir bugun keldi.", "bugun jahongir keldi"), "Jahongir bugun keldi.");
});

test("restores split Jaxon Gir to Jahongir", () => {
  assert.equal(restoreKnownUzbekNames("Jaxon Gir maktabga bordi.", "jaxongir maktabga bordi"), "Jahongir maktabga bordi.");
});

test("restores Hilola and never invents Hilmola", () => {
  assert.equal(restoreKnownUzbekNames("Hilmola kutubxonaga bordi.", "hilola kutubxonaga bordi"), "Hilola kutubxonaga bordi.");
});

test("does not change an original unknown name", () => {
  assert.equal(restoreKnownUzbekNames("Hilmola kutubxonaga bordi.", "hilmola kutubxonaga bordi"), "Hilmola kutubxonaga bordi.");
});

test("capitalizes several known names from the original text", () => {
  assert.equal(
    restoreKnownUzbekNames("xusan, dilnoza, umar va bobur keldi.", "xusan, dilnoza, umar va bobur keldi"),
    "Xusan, Dilnoza, Umar va Bobur keldi."
  );
});

test("preserves and capitalizes names with Uzbek case suffixes", () => {
  assert.equal(
    restoreKnownUzbekNames("humayra va jahongirni ko‘rdim.", "humayrani va jahongirni ko‘rdim"),
    "Humayrani va Jahongirni ko‘rdim."
  );
});

test("restores only names present in the original text", () => {
  assert.equal(restoreKnownUzbekNames("Jahangir va Hilmola.", "jahongir va hilola"), "Jahongir va Hilola.");
});

test("pluralizes a predicate for two named people joined by bilan", () => {
  assert.equal(
    fixKnownPluralAgreement("Bugun Jahongir bilan Hilola kutubxonaga bordi."),
    "Bugun Jahongir bilan Hilola kutubxonaga bordilar."
  );
});

test("pluralizes qoldi for two named people but leaves singular clauses alone", () => {
  assert.equal(
    fixKnownPluralAgreement("Dilshod bilan Madina Sardor va Humayrani ko‘rib qoldi. Keyin Jahongir kitob oldi."),
    "Dilshod bilan Madina Sardor va Humayrani ko‘rib qoldilar. Keyin Jahongir kitob oldi."
  );
});

test("does not pluralize a singular subject followed by bilan", () => {
  assert.equal(
    fixKnownPluralAgreement("Jahongir Hilola bilan uchrashdi."),
    "Jahongir Hilola bilan uchrashdi."
  );
});
