import { areas, type Page } from '../lib/navigation';

export default function AreaHeading({ page }: { page: Page }) {
  const area = areas[page];
  return <h1 className="area-heading"><span>{area.number}</span><span aria-hidden="true"> / </span>{area.label.toLocaleUpperCase('sv-SE')}</h1>;
}
