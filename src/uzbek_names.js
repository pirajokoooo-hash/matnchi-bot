// Curated, source-aware Uzbek personal-name corrections.
// Only names found in the user's original text may be restored.
const BASE_NAMES = [
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

const NAME_RULES = BASE_NAMES.map(name => ({
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

function escapeRegex(value) {
  return value.split("").map(ch => "\\.^$|?*+()[]{}".includes(ch) ? "\\" + ch : ch).join("");
}

function makeAlternatives(forms) {
  return forms.map(form => form.trim().split(" ").map(escapeRegex).join("\\s+")).join("|");
}

function hasName(text, forms) {
  const pattern = new RegExp("(^|[^\\p{L}])(?:" + makeAlternatives(forms) + ")(?=$|[^\\p{L}])", "iu");
  return pattern.test(String(text));
}

export function restoreKnownUzbekNames(corrected, original) {
  let result = String(corrected);
  const source = String(original);
  for (const rule of NAME_RULES) {
    if (!hasName(source, rule.sourceForms)) continue;
    const pattern = new RegExp("(^|[^\\p{L}])(?:" + makeAlternatives(rule.outputForms) + ")(?=$|[^\\p{L}])", "giu");
    result = result.replace(pattern, (_match, prefix) => prefix + rule.canonical);
  }
  return result;
}
