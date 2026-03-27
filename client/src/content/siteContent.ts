import { useEffect, useState } from "react";

export interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
}

export interface ContactChannel {
  type: string;
  label: string;
  value: string;
  note?: string;
}

export interface SiteContent {
  landing: {
    badge: string;
    title: string;
    subtitle: string;
    ctaLabel: string;
    secondaryCtaLabel: string;
    featureBullets: string[];
  };
  faq: {
    title: string;
    intro: string;
    items: FAQItem[];
  };
  contact: {
    title: string;
    intro: string;
    channels: ContactChannel[];
  };
}

const defaultContent: SiteContent = {
  landing: {
    badge: "Auto Calendar",
    title: "智能识别日程，一键导入系统日历",
    subtitle: "把聊天记录、图片、PDF 或文本里的时间信息，快速整理成可订阅的日程文件。",
    ctaLabel: "开始试用",
    secondaryCtaLabel: "查看常见问题",
    featureBullets: [
      "支持图片 / PDF / 文本识别",
      "可编辑识别结果并修正细节",
      "一键生成 ICS，适配主流系统日历",
    ],
  },
  faq: {
    title: "常见问题",
    intro: "这里整理了从识别到导入系统日历的完整操作说明。",
    items: [],
  },
  contact: {
    title: "联系开发者",
    intro: "如果你有建议、定制需求或发现问题，欢迎直接联系我。",
    channels: [],
  },
};

let cache: SiteContent | null = null;

export async function getSiteContent(): Promise<SiteContent> {
  if (cache) return cache;
  const response = await fetch("/content/site-content.json");
  if (!response.ok) {
    throw new Error("Failed to load site content");
  }
  cache = (await response.json()) as SiteContent;
  return cache;
}

export function useSiteContent() {
  const [content, setContent] = useState<SiteContent>(defaultContent);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getSiteContent()
      .then((data) => {
        if (!cancelled) setContent(data);
      })
      .catch(() => {
        if (!cancelled) setContent(defaultContent);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { content, isLoading };
}
