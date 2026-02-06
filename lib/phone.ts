export function normalizeTurkishPhone(raw: string): string {
  if (!raw) {
    throw new Error("Phone is required");
  }

  // Remove everything except digits and leading +
  let phone = raw.trim();
  if (phone.startsWith("+")) {
    phone = phone.slice(1);
  }

  // Remove non-digit characters
  phone = phone.replace(/\D/g, "");

  // Expected outputs: 905XXXXXXXXX (12 digits, starts with 90)
  if (phone.length === 12 && phone.startsWith("90")) {
    return phone;
  }

  // 05XXXXXXXXX -> remove leading 0 and prefix 9
  if (phone.length === 11 && phone.startsWith("05")) {
    return "9" + phone.slice(1); // 90 + 5XXXXXXXX
  }

  // 5XXXXXXXXX -> prefix 90
  if (phone.length === 10 && phone.startsWith("5")) {
    return "90" + phone;
  }

  // 90XXXXXXXXXX (already correct length but not starting with 90 5...)
  if (phone.length === 12 && phone.startsWith("905")) {
    return phone;
  }

  throw new Error("Invalid Turkish GSM phone format");
}

