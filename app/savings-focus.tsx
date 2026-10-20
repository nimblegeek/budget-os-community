'use client';
import { Plus, Trash2, Info } from 'lucide-react';
import { type Budget, kr, sum } from '../lib/budget';
type Goal = Budget['goals'][number];
type Props = { goals: Goal[]; editable: boolean; busy: boolean; onAdd: () => void; onEdit: (goal: Goal) => void; onDelete: (goal: Goal) => void };

export default function SavingsFocus({ goals, editable, busy, onAdd, onEdit, onDelete }: Props) {
  return <div className="savings-focus">
    <section className="debt-summary" aria-label="Sparöversikt">
      <div className="debt-total"><span>Totalt sparat</span><output aria-live="polite" aria-atomic="true">{kr(sum(goals.map(x => x.saved)), 2)}</output></div>
      <div className="debt-monthly"><span>Månadssparande</span><output aria-live="polite" aria-atomic="true">{kr(sum(goals.map(x => x.monthly)), 2)}</output></div>
      <details className="focus-explainer"><summary><Info size={13} aria-hidden="true"/> Angivna belopp · ingen banksynk</summary><p>Sparat är det du har registrerat. Månadssparandet är en plan, inte en överföring. Ändringar flyttar inga pengar.</p></details>
    </section>
    {editable ? <button className="debt-add" disabled={busy} onClick={onAdd}><Plus size={19} aria-hidden="true"/> Lägg till sparmål</button> : <p className="focus-help">Du har läsbehörighet.</p>}
    <section className="loan-list" aria-label="Sparmål">
      {!goals.length && <p className="debt-empty">Inga sparmål ännu.</p>}
      {goals.map(goal => <div className="saving-item" key={goal.id}>
        <div className="loan-row">
          <button className="loan-edit" disabled={!editable || busy} onClick={() => onEdit(goal)} aria-label={`Ändra sparmål: ${goal.name}`}>
            <span><strong>{goal.name}</strong><small>{goal.saved >= goal.target ? 'Målet nått' : `Mål ${kr(goal.target)}`}</small></span>
            <span><strong>{kr(goal.saved, 2)}</strong><small>{kr(goal.monthly, 2)}/mån</small></span>
          </button>
          {editable && <button className="loan-delete" disabled={busy} onClick={() => onDelete(goal)} aria-label={`Ta bort sparmål: ${goal.name}`}><Trash2 size={17} aria-hidden="true"/></button>}
        </div>
        <div className="bar" aria-hidden="true"><i style={{ width: `${goal.target > 0 ? Math.min(100, Math.max(0, goal.saved / goal.target * 100)) : 0}%` }}/></div>
      </div>)}
    </section>
  </div>;
}
