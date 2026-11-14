import { useState } from 'react';
import type { Votes } from '../shared/ballot';
import { PickScreen } from './PickScreen';
import { StandingsScreen } from './StandingsScreen';
import { ThanksScreen } from './ThanksScreen';
import { VersionChip } from './VersionChip';

type Screen = 'pick' | 'thanks' | 'standings';

/**
 * King Size Showdown: kids give their 3 votes to the candies they like best, one kid after
 * another on the same device, and anyone can open the standings.
 */
export function App() {
  const [screen, setScreen] = useState<Screen>('pick');
  const [votes, setVotes] = useState<Votes>({});

  const nextVoter = () => {
    setVotes({});
    setScreen('pick');
  };

  return (
    <>
      {screen === 'pick' && (
        <PickScreen
          votes={votes}
          onChange={setVotes}
          onSaved={() => setScreen('thanks')}
          onShowStandings={() => setScreen('standings')}
        />
      )}
      {screen === 'thanks' && <ThanksScreen onNext={nextVoter} />}
      {screen === 'standings' && <StandingsScreen onBack={() => setScreen('pick')} />}
      <VersionChip />
    </>
  );
}
