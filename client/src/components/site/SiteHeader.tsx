import { Button } from "@/components/ui/button";
import { Calendar, Menu, X } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";

const navItems = [
  { href: "/", label: "首页" },
  { href: "/upload", label: "开始试用" },
  { href: "/faq", label: "常见问题" },
];

export default function SiteHeader() {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 glass-card border-b border-border/30 rounded-none">
      <div className="container h-16 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-primary/12 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-primary" />
          </div>
          <div className="leading-tight min-w-0">
            <p className="text-[1rem] font-semibold text-foreground truncate">Auto Calendar</p>
            <p className="text-[11px] text-muted-foreground hidden sm:block">
              智能识别日程，一键导入系统日历
            </p>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const active = location === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden md:block">
          <Link href="/upload">
            <Button size="sm" className="soft-action">
              立即体验
            </Button>
          </Link>
        </div>

        <button
          type="button"
          className="md:hidden w-9 h-9 rounded-lg bg-muted/50 border border-border/40 text-foreground inline-flex items-center justify-center"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-border/30 bg-card/70 backdrop-blur-xl">
          <div className="container py-3 flex flex-col gap-1">
            {navItems.map((item) => {
              const active = location === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                    active
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  }`}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}
