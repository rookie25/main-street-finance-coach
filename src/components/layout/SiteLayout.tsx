import { Outlet } from "react-router-dom";
import SiteNav from "./SiteNav";
import SiteFooter from "./SiteFooter";

export default function SiteLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <main className="flex-1 pt-20">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}
