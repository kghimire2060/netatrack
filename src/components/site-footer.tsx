import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="cols">
          <div>
            <div className="brand" style={{ fontSize: "1.15rem" }}>
              Neta<span>Track</span>
            </div>
            <p style={{ marginTop: ".5rem", maxWidth: "34ch" }}>
              Nepal&apos;s independent digital platform for election information and citizen
              accountability.
            </p>
            <p className="small" style={{ color: "#8ea7ca" }}>
              NetaTrack is not an election authority. Public-opinion figures are never presented as
              official election results.
            </p>
          </div>
          <div>
            <h4>Explore</h4>
            <Link href="/candidates">Candidates</Link>
            <Link href="/constituencies">Constituencies</Link>
            <Link href="/elections">Elections</Link>
            <Link href="/results">Results</Link>
            <Link href="/calendar">Election calendar</Link>
          </div>
          <div>
            <h4>Participate</h4>
            <Link href="/opinion">Polls &amp; ratings</Link>
            <Link href="/report">Report an issue</Link>
            <Link href="/track">Track an issue</Link>
            <Link href="/promises">Promise tracker</Link>
            <Link href="/fact-checks">Fact checks</Link>
          </div>
          <div>
            <h4>Trust</h4>
            <Link href="/methodology">Rating methodology</Link>
            <Link href="/about">About &amp; neutrality</Link>
            <Link href="/privacy">Privacy policy</Link>
            <Link href="/terms">Terms of use</Link>
            <Link href="/portal/researcher">Researcher access</Link>
          </div>
        </div>
        <div className="legal">
          <span>© {new Date().getFullYear()} NetaTrack. Independent civic platform.</span>
          <span>Know. Vote. Track.</span>
        </div>
      </div>
    </footer>
  );
}
