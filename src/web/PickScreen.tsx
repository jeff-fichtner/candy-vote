import { useState } from 'react';
import type { Votes } from '../shared/ballot';
import { CANDIES, VOTES_PER_KID } from '../shared/candies';
import { saveBallot } from './api';
import { Header } from './Header';

interface Props {
  votes: Votes;
  onChange: (votes: Votes) => void;
  onSaved: () => void;
  onShowStandings: () => void;
}

/** Totals a kid's votes so far. */
export function votesUsed(votes: Votes): number {
  return Object.values(votes).reduce((sum, count) => sum + count, 0);
}

/** Gives `id` one more vote, unless every vote is used. */
export function addVote(votes: Votes, id: string): Votes {
  if (votesUsed(votes) >= VOTES_PER_KID) return votes;
  return { ...votes, [id]: (votes[id] ?? 0) + 1 };
}

/** Takes one vote back from `id`. */
export function removeVote(votes: Votes, id: string): Votes {
  const count = votes[id] ?? 0;
  const next = { ...votes };
  if (count <= 1) delete next[id];
  else next[id] = count - 1;
  return next;
}

function leftText(left: number): string {
  if (left === 0) return `All ${VOTES_PER_KID} votes used!`;
  return left === 1 ? '1 vote left' : `${left} votes left`;
}

/** The voting screen: tap a candy to give it a vote, up to 3, then "I'm done!". */
export function PickScreen({ votes, onChange, onSaved, onShowStandings }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const used = votesUsed(votes);
  const left = VOTES_PER_KID - used;

  const done = async () => {
    setSaving(true);
    setError(null);
    try {
      await saveBallot(votes);
      onSaved();
    } catch {
      setError("Your vote didn't save. Ask a grown-up, then tap I'm done! again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="screen pick">
      <Header />
      <h1 className="title">King Size Showdown</h1>
      <p className="lede">
        You get <b>{VOTES_PER_KID} votes</b>. Tap a candy to give it a vote. Love one a lot? Give it
        2 or all 3!
      </p>

      <ul className="candies" aria-label="Candies">
        {CANDIES.map((candy) => {
          const count = votes[candy.id] ?? 0;
          const label =
            count > 0
              ? `${candy.name}, ${count} ${count === 1 ? 'vote' : 'votes'}`
              : `${candy.name}, no votes`;
          return (
            <li key={candy.id} className={count > 0 ? 'candy has-votes' : 'candy'}>
              <button
                type="button"
                className="candy-add"
                style={{ borderLeftColor: count > 0 ? undefined : candy.color }}
                disabled={left === 0}
                aria-label={left > 0 ? `${label}. Give it a vote` : label}
                onClick={() => onChange(addVote(votes, candy.id))}
              >
                <span className="candy-name">{candy.name}</span>
                {count > 0 && (
                  <span className="dots" aria-hidden="true">
                    {Array.from({ length: count }, (_, i) => (
                      <span key={i} className="dot" />
                    ))}
                  </span>
                )}
              </button>
              {count > 0 && (
                <button
                  type="button"
                  className="candy-remove"
                  aria-label={`Take a vote back from ${candy.name}`}
                  onClick={() => onChange(removeVote(votes, candy.id))}
                >
                  <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12">
                    <path
                      d="M2 6h8"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <footer className="tray">
        <div className="tray-top">
          <span className="tray-label">My votes</span>
          <button type="button" className="link" onClick={onShowStandings}>
            See the standings
          </button>
        </div>
        <div className="slots-row">
          <span className="slots" aria-hidden="true">
            {Array.from({ length: VOTES_PER_KID }, (_, i) => (
              <span key={i} className={i < used ? 'slot used' : 'slot'} />
            ))}
          </span>
          <span className="left" role="status">
            {leftText(left)}
          </span>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="tray-buttons">
          <button
            type="button"
            className="secondary"
            disabled={used === 0 || saving}
            onClick={() => onChange({})}
          >
            Start over
          </button>
          <button
            type="button"
            className="primary"
            disabled={used === 0 || saving}
            onClick={() => void done()}
          >
            {saving ? 'Saving…' : "I'm done!"}
          </button>
        </div>
      </footer>
    </main>
  );
}
