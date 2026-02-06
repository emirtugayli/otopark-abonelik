export function getTodayTR(): string {
    return new Date().toLocaleDateString("en-CA", {
        timeZone: "Europe/Istanbul",
    });
}
