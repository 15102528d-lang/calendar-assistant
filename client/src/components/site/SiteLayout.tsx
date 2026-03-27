import type { ReactNode } from "react";
import SiteHeader from "./SiteHeader";

interface SiteLayoutProps {
  children: ReactNode;
}

export default function SiteLayout({ children }: SiteLayoutProps) {
  return (
    <div className="min-h-screen relative">
      <div className="gradient-bg" />
      <div className="grain-overlay" />
      <div className="atmo-orb atmo-orb-1" />
      <div className="atmo-orb atmo-orb-2" />
      <SiteHeader />
      {children}
    </div>
  );
}
