// Helper to get ISO week number and start/end dates
export function getWeekInfo(date: Date = new Date()) {
  // Convert JS Date to Temporal.PlainDate (UTC)
  // We use UTC to match the previous implementation which used Date.UTC
  const plainDate = Temporal.Instant.fromEpochMilliseconds(date.getTime())
    .toZonedDateTimeISO('UTC')
    .toPlainDate();

  // Get week number
  const weekNumber = plainDate.weekOfYear;

  // Calculate Monday (Start of week)
  // dayOfWeek: 1 (Mon) to 7 (Sun)
  // To get Monday, subtract (dayOfWeek - 1) days
  const monday = plainDate.subtract({days: plainDate.dayOfWeek - 1});

  // Calculate Sunday (End of week)
  const sunday = monday.add({days: 6});

  // Format dates using German locale (dd.mm.yyyy)
  // Note: Temporal.PlainDate.toLocaleString supports options
  const formatOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  };

  // Convert Temporal.PlainDate back to JS Date for mondayDate return
  // We return a JS Date at UTC midnight to match previous behavior expected by callers
  const mondayDate = new Date(Date.UTC(monday.year, monday.month - 1, monday.day));

  return {
    weekNumber,
    start: monday.toLocaleString('de-DE', formatOptions),
    end: sunday.toLocaleString('de-DE', formatOptions),
    mondayDate // Return the actual Date object for Monday
  };
}
