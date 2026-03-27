import SiteLayout from "@/components/site/SiteLayout";
import { useSiteContent } from "@/content/siteContent";
import { Button } from "@/components/ui/button";
import { Copy, Mail, MessageCircle } from "lucide-react";
import { toast } from "sonner";

function getIcon(type: string) {
  if (type === "email") return Mail;
  return MessageCircle;
}

export default function Contact() {
  const { content } = useSiteContent();
  const contact = content.contact;

  const copyValue = async (value: string) => {
    await navigator.clipboard.writeText(value);
    toast.success("已复制到剪贴板");
  };

  return (
    <SiteLayout>
      <main className="container max-w-4xl mx-auto py-10 space-y-6">
        <section className="glass-card rounded-3xl p-7 sm:p-10">
          <h1 className="text-3xl sm:text-4xl text-foreground">{contact.title}</h1>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground">{contact.intro}</p>
        </section>

        <section className="grid sm:grid-cols-2 gap-4">
          {contact.channels.map((channel) => {
            const Icon = getIcon(channel.type);
            return (
              <article key={channel.label} className="glass-card rounded-2xl p-5 space-y-4">
                <div className="w-10 h-10 rounded-xl bg-primary/12 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{channel.label}</p>
                  <p className="text-base font-medium text-foreground break-all">{channel.value}</p>
                  {channel.note && <p className="text-xs text-muted-foreground mt-1">{channel.note}</p>}
                </div>
                <Button variant="outline" className="w-full soft-action" onClick={() => copyValue(channel.value)}>
                  <Copy className="w-4 h-4 mr-1" />
                  复制
                </Button>
              </article>
            );
          })}
        </section>
      </main>
    </SiteLayout>
  );
}
