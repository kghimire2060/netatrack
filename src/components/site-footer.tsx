import Link from "next/link";
import { getTranslator } from "@/lib/locale-server";
import { FlagMark } from "./brand";

export async function SiteFooter() {
  const { t } = await getTranslator();

  return (
    <footer className="footer">
      <div className="wrap">
        <div className="cols">
          <div>
            <div className="brand" style={{ marginBottom: ".5rem" }}>
              <FlagMark size={30} />
              <span className="brand-text">
                <span className="brand-name" style={{ fontSize: "1.15rem" }}>
                  Neta<em>Track</em>
                </span>
                <span className="brand-tag">{t("brand.tagline")}</span>
              </span>
            </div>
            <p style={{ maxWidth: "34ch" }}>{t("footer.blurb")}</p>
            <p className="small" style={{ color: "#8ea7ca" }}>
              {t("notice.notAuthority")}
            </p>
          </div>
          <div>
            <h4>{t("footer.explore")}</h4>
            <Link href="/candidates">{t("nav.candidates")}</Link>
            <Link href="/constituencies">{t("nav.constituencies")}</Link>
            <Link href="/elections">{t("nav.elections")}</Link>
            <Link href="/results">{t("nav.results")}</Link>
            <Link href="/calendar">{t("nav.calendar")}</Link>
          </div>
          <div>
            <h4>{t("footer.participate")}</h4>
            <Link href="/opinion">{t("footer.pollsRatings")}</Link>
            <Link href="/report">{t("footer.reportIssue")}</Link>
            <Link href="/track">{t("footer.trackIssue")}</Link>
            <Link href="/promises">{t("footer.promises")}</Link>
            <Link href="/fact-checks">{t("footer.factChecks")}</Link>
          </div>
          <div>
            <h4>{t("footer.trust")}</h4>
            <Link href="/methodology">{t("footer.methodology")}</Link>
            <Link href="/about">{t("footer.about")}</Link>
            <Link href="/privacy">{t("footer.privacy")}</Link>
            <Link href="/terms">{t("footer.terms")}</Link>
            <Link href="/portal/researcher">{t("footer.researcher")}</Link>
          </div>
        </div>
        <div className="legal">
          <span>
            © {new Date().getFullYear()} NetaTrack. {t("footer.rights")}
          </span>
          <span>{t("brand.statement")}</span>
        </div>
      </div>
    </footer>
  );
}
