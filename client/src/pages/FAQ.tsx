import SiteLayout from "@/components/site/SiteLayout";
import { useSiteContent } from "@/content/siteContent";
import { ChevronDown, HelpCircle } from "lucide-react";
import { useMemo, useState } from "react";

export default function FAQ() {
  const { content, isLoading } = useSiteContent();
  const [openId, setOpenId] = useState<string | null>(null);
  const faq = content.faq;

  const groups = useMemo(() => {
    const map = new Map<string, typeof faq.items>();
    for (const item of faq.items) {
      const prev = map.get(item.category) ?? [];
      map.set(item.category, [...prev, item]);
    }
    return Array.from(map.entries());
  }, [faq.items]);

  return (
    <SiteLayout>
      <main className="container max-w-4xl mx-auto py-10 space-y-6">
        <section className="glass-card rounded-3xl p-7 sm:p-10">
          <div className="flex items-center gap-2 text-primary">
            <HelpCircle className="w-5 h-5" />
            <span className="text-sm font-medium">Support Center</span>
          </div>
          <h1 className="mt-3 text-3xl sm:text-4xl text-foreground">{faq.title}</h1>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground">{faq.intro}</p>
        </section>

        {isLoading && (
          <section className="glass-card rounded-2xl p-6">
            <p className="text-sm text-muted-foreground">正在加载常见问题...</p>
          </section>
        )}

        {!isLoading &&
          groups.map(([category, items]) => (
            <section key={category} className="glass-card rounded-2xl p-4 sm:p-5">
              <h2 className="text-base sm:text-lg font-semibold text-foreground">{category}</h2>
              <div className="mt-3 space-y-2">
                {items.map((item) => {
                  const open = openId === item.id;
                  return (
                    <article key={item.id} className="rounded-xl border border-border/40 bg-card/40 overflow-hidden">
                      <button
                        type="button"
                        className="w-full text-left px-4 py-3 flex items-center justify-between gap-3"
                        onClick={() => setOpenId((prev) => (prev === item.id ? null : item.id))}
                      >
                        <span className="text-sm sm:text-base text-foreground">{item.question}</span>
                        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
                      </button>
                      {open && (
                        <div className="px-4 pb-4">
                          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                            {item.answer}
                          </p>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
      </main>
    </SiteLayout>
  );
}
