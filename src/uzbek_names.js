// Curated, source-aware Uzbek personal-name corrections.
// A name is restored only when the original user text contains its known form.
const NAME_RULES = [
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
];

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
