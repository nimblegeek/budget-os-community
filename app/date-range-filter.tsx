'use client';
import { useId, useState } from 'react';
import { type DateRange, dateRangeLabel, monthRange, rangeError, yearToDate, previousYearRange } from '../lib/date-range';

export default function DateRangeFilter({ value, onChange, years=false }: { value: DateRange; onChange: (range: DateRange) => void; years?:boolean }) {
  const [draft, setDraft] = useState(value);
  const [custom, setCustom] = useState(false);
  const id = useId(), error = rangeError(draft);
  const current = monthRange(), previous = monthRange(undefined, -1);
  const same = (range: DateRange) => range.from === draft.from && range.to === draft.to;
  const preset = custom ? 'custom' : years&&same(yearToDate())?'year':years&&same(previousYearRange())?'lastyear':same(current) ? 'current' : same(previous) ? 'previous' : 'custom';
  const changed = value.from !== draft.from || value.to !== draft.to;
  return <section className="period-filter" aria-label="Visningsperiod">
    <div className="period-heading"><span className="eyebrow">Visningsperiod</span><strong aria-live="polite">{dateRangeLabel(value)}</strong></div>
    <form onSubmit={event => { event.preventDefault(); if (!error) onChange(draft); }}>
      <label>Snabbval<select value={preset} onChange={event => {
        if (event.target.value === 'custom') { setCustom(true); return; }
        const next = event.target.value === 'year'?yearToDate():event.target.value === 'lastyear'?previousYearRange():event.target.value === 'previous' ? previous : current;
        setCustom(false); setDraft(next); onChange(next);
      }}>{years&&<><option value="year">Hittills i år</option><option value="lastyear">Föregående år</option></>}<option value="current">Den här månaden</option><option value="previous">Föregående månad</option><option value="custom">Eget intervall</option></select></label>
      <label>Från<input type="date" required value={draft.from} aria-invalid={!!error} aria-describedby={error ? id : undefined} onChange={event => setDraft({ ...draft, from: event.target.value })}/></label>
      <label>Till<input type="date" required value={draft.to} aria-invalid={!!error} aria-describedby={error ? id : undefined} onChange={event => setDraft({ ...draft, to: event.target.value })}/></label>
      <button type="submit" className="btn" disabled={!!error || !changed}>Visa perioden</button>
    </form>
    {error && <p id={id} role="alert" className="period-error">{error}</p>}
    {!error && changed && <p className="small" role="status">Tryck på Visa perioden för att använda de nya datumen.</p>}
    <p className="small">Båda datumen ingår. Gäller registrerade inkomster, utgifter och transaktioner. Budgeten är fortfarande din månadsplan.</p>
  </section>;
}
