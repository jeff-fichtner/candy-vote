import { useEffect, useState } from 'react';
import type { Votes } from '../shared/ballot';
import { fetchIsOwner } from './api';
import { claimKeyFromLocation, forgetKey, hasKey } from './owner';
import { PickScreen } from './PickScreen';
import { StandingsScreen } from './StandingsScreen';
import { ThanksScreen } from './ThanksScreen';
import { VersionChip } from './VersionChip';

type Screen = 'standings' | 'pick' | 'thanks';

/**
 * King Size Showdown. Everyone sees the standings. The owner's device can also start and stop
 * voting, and while voting is open it is passed from kid to kid: each gives their 3 votes to the
 * candies they like best.
 */
export function App() {
  const [screen, setScreen] = useState<Screen>('standings');
  const [owner, setOwner] = useState(false);
  const [badLink, setBadLink] = useState(false);
  const [votes, setVotes] = useState<Votes>({});

  useEffect(() => {
    const fromLink = window.location.hash.startsWith('#owner=');
    claimKeyFromLocation();
    if (!hasKey()) return;
    fetchIsOwner().then(
      (isOwner) => {
        setOwner(isOwner);
        if (!isOwner) {
          forgetKey();
          setBadLink(fromLink);
        }
      },
      () => setOwner(false),
    );
  }, []);

  const startVoter = () => {
    setVotes({});
    setScreen('pick');
  };

  return (
    <>
      {screen === 'standings' && (
        <StandingsScreen owner={owner} badLink={badLink} onVote={startVoter} />
      )}
      {screen === 'pick' && owner && (
        <PickScreen
          votes={votes}
          onChange={setVotes}
          onSaved={() => setScreen('thanks')}
          onShowStandings={() => setScreen('standings')}
        />
      )}
      {screen === 'thanks' && owner && (
        <ThanksScreen onNext={startVoter} onShowStandings={() => setScreen('standings')} />
      )}
      <VersionChip />
    </>
  );
}
