import { Button } from "@/components/ui/button";
import SiteLayout from "@/components/site/SiteLayout";
import { ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { useSiteContent } from "@/content/siteContent";

export default function Landing() {
  const { content } = useSiteContent();
  const landing = content.landing;

  return (
    <SiteLayout>
      <main className="container max-w-5xl mx-auto py-8 sm:py-16">
        <section className="px-1 sm:px-4">
          <div className="animate-fade-up">
            <img
              src="/images/landing-workflow-transparent.png"
              alt="Auto Calendar workflow illustration"
              className="w-[92%] sm:w-[80%] max-w-4xl mx-auto object-contain drop-shadow-[0_18px_36px_rgba(86,74,52,0.16)]"
            />
          </div>

          <p className="mt-5 sm:mt-6 text-center text-[0.95rem] sm:text-[1.08rem] leading-relaxed text-muted-foreground animate-fade-up delay-1">
            {landing.subtitle}
          </p>

          <div className="mt-7 sm:mt-8 flex justify-center animate-fade-up delay-2">
            <Link href="/upload">
              <Button size="lg" className="soft-action px-8 cta-hero-animate w-full sm:w-auto">
                {landing.ctaLabel}
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </section>
      </main>
    </SiteLayout>
  );
}
