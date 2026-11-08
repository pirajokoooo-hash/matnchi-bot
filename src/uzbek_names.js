// Curated Uzbek personal-name dictionary.
// A name is corrected only when its spelling (or a known AI corruption)
// can be tied to a name explicitly present in the user's original text.
export const UZBEK_NAMES = [
  "Xusan", "Husan", "Hilola", "Jahongir", "Ali", "Vali", "Hasan",
  "Hasanali", "Husanboy", "Xusniddin", "Sardor", "Jasur", "Aziz",
  "Aziza", "Dilshod", "Dilnoza", "Madina", "Malika", "Shahzod",
  "Shohruh", "Shoxrux", "Bekzod", "Behruz", "Bobur", "Umar",
  "Umida", "Nigora", "Nargiza", "Nilufar", "Mohira", "Mohinur",
  "Muhammad", "Abdulloh", "Abdurahmon", "Islom", "Islombek",
  "Temur", "Temurbek", "Rustam", "Ravshan", "Farhod", "Farxod",
  "Farrux", "Oybek", "Oysha", "Zuhra", "Zaynab", "Humayra",
  "Umayra", "Hadiya", "Kumush"
];

const NAME_RULES = UZBEK_NAMES.map(name => ({
  canonical: name,
  sourceForms: [name.toLocaleLowerCase("uz")],
  outputForms: [name.toLocaleLowerCase("uz")]
}));

NAME_RULES.unshift(
  {
    canonical: "Jahongir",
    sourceForms: ["jahongir", "jaxongir", "johongir"],
    outputForms: ["jahongir", "jaxongir", "johongir", "jahangir", "jaxon gir"]
  },
  {
    canonical: "Hilola",
    sourceForms: ["hilola"],
    outputForms: ["hilola", "hilmola"]
  }
);

const SUFFIX = "(?:larining|laridan|lariga|larining|ning|dagi|gacha|lardan|larga|lari|lar|dan|ga|da|ni|ning|si|siga|sini|im|imiz|i)?";

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\"\\\\$&"");
}

function alternatives(forms) {
  return forms
    .slice()
    .sort((a, b) => b.length - a.length)
    .map(form => form.trim().split(/\\s+/).map(escapeRegex).join("\\s+"))
    .join("|");
}

function namePattern(forms, withSuffix = true) {
  return new RegExp(
    "(^|[^\\p{L}])(" + alternatives(forms) + ")" +
      (withSuffix ? "(" + SUFFIX + ")" : "") +
      "(?=$|[^\\p{L}])",
    "iu"
  );
}

function hasName(text, forms) {
  return namePattern(forms).test(String(text));
}

export function restoreKnownUzbekNames(corrected, original) {
  let result = String(corrected);
  const source = String(original);

  for (const rule of NAME_RULES) {
    const sourceMatch = source.match(namePattern(rule.sourceForms));
    if (!sourceMatch) continue;

    const sourceSuffix = sourceMatch[3] || "";
    const outputPattern = new RegExp(
      "(^|[^\\p{L}])(" + alternatives(rule.outputForms) + ")(" + SUFFIX + ")(?=$|[^\\p{L}])",
      "giu"
    );

    result = result.replace(outputPattern, (_match, prefix, _form, outputSuffix) =>
      prefix + rule.canonical + (outputSuffix || sourceSuffix)
    );
  }
  return result;
}

// Only pluralize a predicate when two known personal names are explicitly
// joined as the grammatical subject by "bilan". Object names are not matched.
export function fixKnownPluralAgreement(text) {
  let result = String(text);
  const nameAlt = UZBEK_NAMES
    .slice()
    .sort((a, b) => b.length - a.length)
    .map(escapeRegex)
    .join("|");
  const singularVerbs = [
    ["gaplashdi", "gaplashdilar"],
    ["suhbatlashdi", "suhbatlashdilar"],
    ["uchrashdi", "uchrashdilar"],
    ["ko‘rdi", "ko‘rdilar"],
    ["ko'rdi", "ko'rdilar"],
    ["bordi", "bordilar"],
    ["keldi", "keldilar"],
    ["ketdi", "ketdilar"],
    ["qoldi", "qoldilar"],
    ["oldi", "oldilar"],
    ["aytdi", "aytdilar"],
    ["yozdi", "yozdilar"]
  ];
  for (const [singular, plural] of singularVerbs) {
    const pattern = new RegExp(
      "\\b(?:" + nameAlt + ")\\s+bilan\\s+(?:" + nameAlt +
        ")(?:\\s+[^.!?]{0,100})?\\b" + escapeRegex(singular) + "\\b",
      "giu"
    );
    result = result.replace(pattern, match =>
      match.slice(0, match.length - singular.length) + plural
    );
  }
  return result;
}
