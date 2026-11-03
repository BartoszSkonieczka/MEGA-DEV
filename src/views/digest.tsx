import type { DigestRow } from '../digest/types.js';

function MissingValue() {
  return <span class="mute">—</span>;
}

export function DigestPage({ night, rows }: { night: string; rows: DigestRow[] }) {
  if (rows.length === 0) return <p>nothing ran</p>;

  return (
    <>
      <h1>digest · {night}</h1>
      <table>
        <thead>
          <tr>
            <th>job</th>
            <th>owner</th>
            <th>runs</th>
            <th>retries</th>
            <th>last status</th>
            <th>last error</th>
            <th>first time</th>
            <th>last time</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr>
              <td>{row.job}</td>
              <td>{row.owner ?? <MissingValue />}</td>
              <td>{row.runs}</td>
              <td>
                {row.retries >= 3 ? <span class="warn">{row.retries}</span> : row.retries}
              </td>
              <td>
                {row.lastStatus === 'fail' ? <span class="warn">fail</span> : row.lastStatus}
              </td>
              <td>{row.lastError ?? <MissingValue />}</td>
              <td>{row.firstTime}</td>
              <td>{row.lastTime}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
