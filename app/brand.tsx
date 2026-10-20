/** An open coin, balanced ledger lines and one control point. */
export default function Brand({ compact = false }: { compact?: boolean }) {
  return <span className={`budget-brand${compact ? ' budget-brand--compact' : ''}`} role="img" aria-label="Budget OS">
    <svg className="budget-brand__mark" viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <path d="M34 20a14 14 0 1 1-14-14" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"/>
      <path d="M14 16.5h12m-12 7h12" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"/>
      <circle cx="31" cy="9" r="3" fill="currentColor"/>
    </svg>
    <span className="budget-brand__wordmark" aria-hidden="true">budget<span className="budget-brand__os">OS</span></span>
  </span>;
}
