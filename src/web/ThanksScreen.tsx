/** Shown after a kid's vote saves: hand the device to the next kid. */
export function ThanksScreen({ onNext }: { onNext: () => void }) {
  return (
    <main className="screen thanks">
      <img
        className="vortex"
        src="/matilda-vortex.jpg"
        alt="Roald Dahl's Matilda The Musical, glowing"
        width={600}
        height={720}
      />
      <h1 className="title">Your vote is in!</h1>
      <p className="lede">Now pass it to the next friend so they can pick their favorites.</p>
      <button type="button" className="primary big" onClick={onNext}>
        Next voter
      </button>
    </main>
  );
}
