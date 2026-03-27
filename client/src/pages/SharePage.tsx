import { trpc } from "@/lib/trpc";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Calendar, Download, ExternalLink } from "lucide-react";

export default function SharePage() {
  const params = useParams<{ shareId: string }>();
  const shareId = params.shareId || "";

  const { data: share, isLoading, error } = trpc.calendar.getShare.useQuery(
    { shareId },
    { enabled: !!shareId }
  );

  const baseUrl = window.location.origin;
  const httpUrl = `${baseUrl}/api/calendars/${shareId}`;
  const webcalUrl = httpUrl.replace(/^https?:\/\//, "webcal://");

  const handleDownload = () => {
    window.open(httpUrl, "_blank");
  };

  return (
    <div className="min-h-screen relative">
      <div className="gradient-bg" />
      <div className="container max-w-2xl mx-auto py-16 px-4">
        <div className="glass-card rounded-2xl p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Calendar className="w-8 h-8 text-primary" />
          </div>

          {isLoading && (
            <div className="space-y-3">
              <div className="h-6 bg-muted rounded-lg w-48 mx-auto animate-pulse" />
              <div className="h-4 bg-muted rounded-lg w-32 mx-auto animate-pulse" />
            </div>
          )}

          {error && (
            <div className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">日历未找到</h2>
              <p className="text-muted-foreground">该分享链接可能已过期或不存在</p>
            </div>
          )}

          {share && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold text-foreground mb-2">共享日历</h2>
                <p className="text-muted-foreground">
                  包含 {share.eventCount} 个日程事件
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={handleDownload} className="gap-2">
                  <Download className="w-4 h-4" />
                  下载 ICS 文件
                </Button>
                <Button
                  variant="outline"
                  className="gap-2 bg-card/50"
                  onClick={() => window.open(webcalUrl)}
                >
                  <ExternalLink className="w-4 h-4" />
                  订阅日历
                </Button>
              </div>

              <div className="pt-4 border-t border-border/50 space-y-3">
                <div className="text-left">
                  <p className="text-xs font-medium text-muted-foreground mb-1">HTTP 下载链接</p>
                  <code className="text-xs bg-muted/50 px-3 py-2 rounded-lg block break-all text-foreground/80">
                    {httpUrl}
                  </code>
                </div>
                <div className="text-left">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Webcal 订阅链接</p>
                  <code className="text-xs bg-muted/50 px-3 py-2 rounded-lg block break-all text-foreground/80">
                    {webcalUrl}
                  </code>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
