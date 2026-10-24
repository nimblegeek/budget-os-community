export type DateRange = { from: string; to: string };
export function yearToDate(reference=stockholmDate()):DateRange{
 if(!validDate(reference))throw Error('Ogiltigt datum.');
 return {from:reference.slice(0,4)+'-01-01',to:reference};
}
export function previousYearRange(reference=stockholmDate()):DateRange{
 if(!validDate(reference))throw Error('Ogiltigt datum.');
 const year=Number(reference.slice(0,4))-1;
 return {from:year+'-01-01',to:year+'-12-31'};
}
export function stockholmDate(now = new Date()) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Stockholm', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T12:00:00Z');
  return Number.isFinite(+date) && date.toISOString().slice(0, 10) === value;
}
export function rangeError(range: DateRange) {
  if (!validDate(range.from) || !validDate(range.to)) return 'Välj ett giltigt från- och tilldatum.';
  return range.from > range.to ? 'Tilldatum måste vara samma dag som eller efter fråndatum.' : '';
}
export function monthRange(reference = stockholmDate(), offset = 0): DateRange {
  if (!validDate(reference)) throw new Error('Ogiltigt datum.');
  const start = new Date(reference + 'T12:00:00Z');
  start.setUTCDate(1);
  start.setUTCMonth(start.getUTCMonth() + offset);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1, 0);
  return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
}
export function inDateRange(date: string, range: DateRange) {
  return date >= range.from && date <= range.to;
}
export function isCalendarMonth(range: DateRange) {
  if (rangeError(range)) return false;
  const month = monthRange(range.from);
  return range.from === month.from && range.to === month.to;
}
export function isPastCalendarMonth(range:DateRange,reference=stockholmDate()){
  return isCalendarMonth(range)&&range.to<monthRange(reference).from;
}
export function dateRangeLabel(range: DateRange) {
  if (rangeError(range)) return 'Ogiltig period';
  const format = (date: string) => new Intl.DateTimeFormat('sv-SE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(date + 'T12:00:00Z'));
  return range.from === range.to ? format(range.from) : `${format(range.from)} – ${format(range.to)}`;
}
export function transactionRange(rows: { date: string }[], fallback: DateRange): DateRange {
  const dates = rows.map(row => row.date).filter(validDate).sort();
  return dates.length ? { from: dates[0], to: dates[dates.length - 1] } : fallback;
}
export function periodSummary<T extends { date: string; kind: string; amount: number }>(rows: T[], range: DateRange) {
  if (rangeError(range)) throw new Error(rangeError(range));
  const transactions = rows.filter(row => inDateRange(row.date, range));
  const cents = (kind: string) => transactions.filter(row => row.kind === kind).reduce((sum, row) => sum + Math.round(row.amount * 100), 0);
  return { transactions, income: cents('income') / 100, expense: (0 - cents('expense')) / 100 };
}
