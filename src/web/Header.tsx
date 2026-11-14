/** The show's logo and the cast line above every screen's title. */
export function Header() {
  return (
    <header className="masthead">
      <img
        className="logo"
        src="/matilda-logo.jpg"
        alt="Roald Dahl's Matilda The Musical"
        width={600}
        height={291}
      />
      <p className="presents">Playhouse 395 cast presents</p>
    </header>
  );
}
