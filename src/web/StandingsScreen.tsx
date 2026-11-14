import { useEffect, useState } from 'react';
import type { Standings } from '../shared/ballot';
import { eraseBallots, fetchStandings } from './api';
import { Header } from './Header';

/** How many candies get the big rows at the top. */
const TOP = 5;

type Load = { state: 'loading' } | { state: 'ready'; data: Standings } | { state: 'failed' };

function votesText(n: number): string {
  return n === 1 ? '1 vote' : `${n} votes`;
}

/** The standings: every candy's vote total, the top five large, and "Erase all votes". */
export function StandingsScreen({ onBack }: { onBack: () => void }) {
  const [load, setLoad] = useState<Load>({ state: 'loading' });
  const [confirming, setConfirming] = useState(false);
  const [erasing, setErasing] = useState(false);
  const [eraseError, setEraseError] = useState(false);

  const refresh = () => {
    setLoad({ state: 'loading' });
    fetchStandings().then(
      (data) => setLoad({ state: 'ready', data }),
      () => setLoad({ state: 'failed' }),
    );
  };

  useEffect(refresh, []);

  const erase = async () => {
    setErasing(true);
    setEraseError(false);
    try {
      await eraseBallots();
      setConfirming(false);
      refresh();
    } catch {
      setEraseError(true);
    } finally {
      setErasing(false);
    }
  };

  const data = load.state === 'ready' ? load.data : null;
  const voted = data ? data.rows.filter((row) => row.votes > 0) : [];
  const top = voted.slice(0, TOP);
  const rest = voted.slice(TOP);
  const none = data ? data.rows.filter((row) => row.votes === 0) : [];

  return (
    <main className="screen standings">
      <Header />
      <h1 className="title">The Standings</h1>

      {load.state === 'loading' && <p className="lede">Counting the votes…</p>}
      {load.state === 'failed' && (
        <div className="lede">
          <p role="alert">The standings didn't load.</p>
          <button type="button" className="secondary" onClick={refresh}>
            Try again
          </button>
        </div>
      )}

      {data && (
        <>
          <p className="lede">
            {data.voters === 0
              ? 'Nobody has voted yet.'
              : data.voters === 1
                ? '1 kid has voted so far'
                : `${data.voters} kids have voted so far`}
          </p>
          {data.voters > 0 && (
            <>
              <ol className="stack" aria-label="Top five">
                {top.map((row, index) => (
                  <li key={row.id} className={`book book-${index + 1}`}>
                    <span className="place">{row.place}</span>
                    <span className="book-name">{row.name}</span>
                    <span className="book-votes">{votesText(row.votes)}</span>
                  </li>
                ))}
              </ol>
              {rest.length > 0 && (
                <section className="rest" aria-label="The rest, in order">
                  <h2>The rest, in order</h2>
                  <ol>
                    {rest.map((row) => (
                      <li key={row.id}>
                        <span className="place">{row.place}</span> {row.name}{' '}
                        <span className="rest-votes">{votesText(row.votes)}</span>
                      </li>
                    ))}
                  </ol>
                </section>
              )}
              {none.length > 0 && (
                <section className="rest" aria-label="No votes yet">
                  <h2>No votes yet</h2>
                  <ul className="none">
                    {none.map((row) => (
                      <li key={row.id}>{row.name}</li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </>
      )}

      <div className="standings-buttons">
        <button type="button" className="primary" onClick={onBack}>
          Back to voting
        </button>
        {data && data.voters > 0 && !confirming && (
          <button type="button" className="secondary" onClick={() => setConfirming(true)}>
            Erase all votes
          </button>
        )}
        {data && confirming && (
          <div className="confirm" role="group" aria-label="Erase all votes?">
            <p>
              Erase all {data.voters} {data.voters === 1 ? 'vote' : 'votes'}? This can't be undone.
            </p>
            {eraseError && <p role="alert">Erasing didn't work. Try again.</p>}
            <div className="confirm-buttons">
              <button
                type="button"
                className="secondary"
                disabled={erasing}
                onClick={() => setConfirming(false)}
              >
                Keep them
              </button>
              <button
                type="button"
                className="danger"
                disabled={erasing}
                onClick={() => void erase()}
              >
                {erasing ? 'Erasing…' : 'Yes, erase'}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
