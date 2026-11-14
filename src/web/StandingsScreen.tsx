import { useEffect, useState } from 'react';
import { eraseBallots, fetchBoard, setVoting, type Board } from './api';
import { Header } from './Header';

/** How many candies get the big rows at the top. */
const TOP = 5;

/** How often an open standings screen checks for new votes. */
const REFRESH_MS = 15_000;

type Load = { state: 'loading' } | { state: 'ready'; data: Board } | { state: 'failed' };

function votesText(n: number): string {
  return n === 1 ? '1 vote' : `${n} votes`;
}

function kidsText(n: number): string {
  return n === 1 ? '1 kid' : `${n} kids`;
}

interface Props {
  /** The owner's device: it can start and stop voting, take votes and erase them. */
  owner: boolean;
  /** This device was opened with a setup link the server refused. */
  badLink: boolean;
  /** Hands the device to the next kid. */
  onVote: () => void;
}

/**
 * The standings, which everyone sees: every candy's vote total, the top five large. On the owner's
 * device it also starts and stops voting and erases the votes.
 */
export function StandingsScreen({ owner, badLink, onVote }: Props) {
  const [load, setLoad] = useState<Load>({ state: 'loading' });
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const refresh = (quiet = false) => {
    if (!quiet) setLoad({ state: 'loading' });
    fetchBoard().then(
      (data) => setLoad({ state: 'ready', data }),
      () => {
        if (!quiet) setLoad({ state: 'failed' });
      },
    );
  };

  useEffect(() => {
    refresh();
    const timer = window.setInterval(() => refresh(true), REFRESH_MS);
    return () => window.clearInterval(timer);
  }, []);

  const act = async (action: () => Promise<void>, failure: string, after?: () => void) => {
    setBusy(true);
    setActionError(null);
    try {
      await action();
      after?.();
      refresh(true);
    } catch {
      setActionError(failure);
    } finally {
      setBusy(false);
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

      {badLink && (
        <p className="notice" role="alert">
          That setup link didn't work on this device.
        </p>
      )}
      {load.state === 'loading' && <p className="lede">Counting the votes…</p>}
      {load.state === 'failed' && (
        <div className="lede">
          <p role="alert">The standings didn't load.</p>
          <button type="button" className="secondary" onClick={() => refresh()}>
            Try again
          </button>
        </div>
      )}

      {data && (
        <>
          <p className={data.votingOpen ? 'voting-state open' : 'voting-state'}>
            {data.votingOpen ? 'Voting is open!' : 'Voting is closed.'}
          </p>
          <p className="lede">
            {data.voters === 0
              ? 'Nobody has voted yet.'
              : `${kidsText(data.voters)} ${data.voters === 1 ? 'has' : 'have'} voted so far`}
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

      {owner && data && (
        <div className="standings-buttons" role="group" aria-label="Owner controls">
          {actionError && (
            <p className="error" role="alert">
              {actionError}
            </p>
          )}
          {data.votingOpen ? (
            <>
              <button type="button" className="primary" disabled={busy} onClick={onVote}>
                Next voter
              </button>
              <button
                type="button"
                className="secondary"
                disabled={busy}
                onClick={() => void act(() => setVoting(false), "Voting didn't stop. Try again.")}
              >
                Stop voting
              </button>
            </>
          ) : (
            <button
              type="button"
              className="primary"
              disabled={busy}
              onClick={() =>
                void act(() => setVoting(true), "Voting didn't start. Try again.", onVote)
              }
            >
              Start voting
            </button>
          )}
          {data.voters > 0 && !confirming && (
            <button
              type="button"
              className="secondary"
              disabled={busy}
              onClick={() => setConfirming(true)}
            >
              Erase all votes
            </button>
          )}
          {confirming && (
            <div className="confirm" role="group" aria-label="Erase all votes?">
              <p>Erase the votes of all {kidsText(data.voters)}? This can't be undone.</p>
              <div className="confirm-buttons">
                <button
                  type="button"
                  className="secondary"
                  disabled={busy}
                  onClick={() => setConfirming(false)}
                >
                  Keep them
                </button>
                <button
                  type="button"
                  className="danger"
                  disabled={busy}
                  onClick={() =>
                    void act(eraseBallots, "Erasing didn't work. Try again.", () =>
                      setConfirming(false),
                    )
                  }
                >
                  {busy ? 'Erasing…' : 'Yes, erase'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
