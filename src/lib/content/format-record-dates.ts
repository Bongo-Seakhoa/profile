export function formatRecordDates(
  start: string | null,
  end: string | null,
  current: boolean,
  note?: string,
): string {
  if (start === null) {
    if (current || end !== null || !note)
      throw new TypeError(
        "Undated records require an explicit completed-record note",
      );
    return note;
  }
  const formatter = new Intl.DateTimeFormat("en-GB", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  const format = (value: string): string =>
    formatter.format(new Date(value + "-01T00:00:00Z"));
  if (!current && end === null)
    throw new TypeError("Completed dated records require an end date");
  return format(start) + " to " + (current ? "Present" : format(end!));
}
