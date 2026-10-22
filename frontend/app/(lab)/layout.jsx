import Sidebar from "@/components/Sidebar";

export default function LabLayout({ children }) {
  return (
    <div className="shell">
      <Sidebar />
      <main className="sheet" id="main">{children}</main>
    </div>
  );
}
