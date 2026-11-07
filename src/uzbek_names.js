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
  return value.replace(/[.*+?^${}()|[\\]\\]/g, "\\return value.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");");
}

function hasName(text, forms) {
  const alternatives = forms.map(form => form.trim().split(/\\s+/).map(escapeRegex).join("\\\\s+")).join("|");
  const pattern = new RegExp("(^|[^\\p{L}])(?:" + alternatives + ")(?=$|[^\\p{L}])", "iu");
  return pattern.test(String(text));
}

export function restoreKnownUzbekNames(corrected, original) {
  let result = String(corrected);
  const source = String(original);
  for (const rule of NAME_RULES) {
    if (!hasName(source, rule.sourceForms)) continue;
    const alternatives = rule.outputForms.map(form => form.trim().split(/\\s+/).map(escapeRegex).join("\\\\s+")).join("|");
    const pattern = new RegExp("(^|[^\\p{L}])(?:" + alternatives + ")(?=$|[^\\p{L}])", "giu");
    result = result.replace(pattern, (_match, prefix) => prefix + rule.canonical);
  }
  return result;
}
