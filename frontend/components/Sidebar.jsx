"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "./Mark";
import { useData } from "./Providers";

const NAV = [
  ["/overview", "Overview", "Dashboard of the whole archive"],
  ["/archive", "Archive", "Browse and search reports"],
  ["/analyze", "Analyze", "Upload a new report"],
  ["/connections", "Connections", "Similarity network"],
  ["/clusters", "Clusters", "Groups found in the archive"],
  ["/compare", "Compare", "Two reports side by side"],
];

export default function Sidebar() {
  const path = usePathname();
  const { status, metrics } = useData();
  return (
    <aside className="rail">
      <div className="brand"><Link href="/" aria-label="RELIC home" style={{ textDecoration: "none" }}><Wordmark size={28} /></Link></div>
      <nav aria-label="Main">
        {NAV.map(([href, label, tip]) => (
          <Link key={href} href={href} title={tip} aria-current={path === href || path.startsWith(href + "/") ? "page" : undefined}>{label}</Link>
        ))}
      </nav>
      <div className="foot">
        <span className={`apidot ${status === "ready" ? "ok" : status === "error" ? "bad" : ""}`} />
        {status === "ready" ? `API online · ${metrics.n_sites} reports` : status === "error" ? "API offline" : "Connecting…"}
      </div>
    </aside>
  );
}
