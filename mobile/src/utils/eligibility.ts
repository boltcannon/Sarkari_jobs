export type EligibilityResult = "eligible" | "over_age" | "under_age" | "unknown";

function getAge(dob: string): number | null {
  try {
    const birth = new Date(dob);
    if (isNaN(birth.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age >= 0 && age < 100 ? age : null;
  } catch {
    return null;
  }
}

export function checkAgeEligibility(
  ageLimitText: string | null | undefined,
  dob: string | null | undefined
): EligibilityResult {
  if (!ageLimitText || !dob) return "unknown";
  const age = getAge(dob);
  if (age === null) return "unknown";

  const text = ageLimitText.toLowerCase();

  // "18-25 years" or "18 to 30 years"
  const rangeMatch = text.match(/(\d+)\s*(?:-|to)\s*(\d+)\s*year/);
  if (rangeMatch) {
    const min = parseInt(rangeMatch[1]);
    const max = parseInt(rangeMatch[2]);
    if (age < min) return "under_age";
    if (age > max) return "over_age";
    return "eligible";
  }

  // "below 30" / "not exceeding 35" / "maximum 28" / "upto 32"
  const maxMatch = text.match(/(?:below|not exceeding|maximum|max\.?|upto|up to|under)\s*(\d+)/);
  if (maxMatch) {
    const max = parseInt(maxMatch[1]);
    if (age > max) return "over_age";
    return "eligible";
  }

  // "minimum 18" / "at least 21"
  const minMatch = text.match(/(?:minimum|min\.?|at least)\s*(\d+)/);
  if (minMatch) {
    const min = parseInt(minMatch[1]);
    if (age < min) return "under_age";
    return "eligible";
  }

  // single "35 years"
  const singleMatch = text.match(/(\d+)\s*year/);
  if (singleMatch) {
    const max = parseInt(singleMatch[1]);
    if (age > max) return "over_age";
    return "eligible";
  }

  return "unknown";
}

export function eligibilityBadge(
  result: EligibilityResult
): { icon: string; text: string; color: string; bg: string } | null {
  switch (result) {
    case "eligible":
      return { icon: "✅", text: "You may be eligible", color: "#2E7D32", bg: "#E8F5E9" };
    case "over_age":
      return { icon: "❌", text: "Age limit exceeded",  color: "#D32F2F", bg: "#FFEBEE" };
    case "under_age":
      return { icon: "⏳", text: "Too young currently", color: "#E65100", bg: "#FFF3E0" };
    default:
      return null;
  }
}
