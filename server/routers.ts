import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { nanoid } from "nanoid";
import { invokeLLM } from "./_core/llm";
import {
  createUploadRecord,
  updateUploadRecord,
  getUploadRecordsByUser,
  getUploadRecordById,
  createExtractedEvents,
  getEventsByUploadId,
  getEventsByUserId,
  updateExtractedEvent,
  deleteExtractedEvent,
  createCalendarShare,
  getCalendarShareById,
  getCalendarSharesByUser,
} from "./db";
import { TRPCError } from "@trpc/server";

// ─── ICS Generation Helper ─────────────────────────────────────────────────

interface ICSEvent {
  date: string;
  startTime: string;
  endTime: string;
  title: string;
  location?: string;
  notes?: string;
}

function generateICS(events: ICSEvent[]): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Calendar Assistant//CN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const event of events) {
    const uid = nanoid();
    const dtStart = formatICSDateTime(event.date, event.startTime);
    const dtEnd = formatICSDateTime(event.date, event.endTime || event.startTime);

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${uid}@calendar-assistant`);
    lines.push(`DTSTART:${dtStart}`);
    lines.push(`DTEND:${dtEnd}`);
    lines.push(`SUMMARY:${escapeICS(event.title || "Untitled Event")}`);
    if (event.location) {
      lines.push(`LOCATION:${escapeICS(event.location)}`);
    }
    if (event.notes) {
      lines.push(`DESCRIPTION:${escapeICS(event.notes)}`);
    }
    lines.push(`DTSTAMP:${formatICSNow()}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

function formatICSDateTime(date: string, time: string): string {
  const d = date.replace(/-/g, "");
  const t = (time || "00:00").replace(/:/g, "") + "00";
  return `${d}T${t}`;
}

function formatICSNow(): string {
  const now = new Date();
  return now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeICS(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

// ─── LLM Schedule Extraction ────────────────────────────────────────────────

const EXTRACTION_SYSTEM_PROMPT = `你是一个专业的日程提取助手。你的任务是从用户提供的文本中提取所有日程事件信息。

请严格按照以下 JSON 格式返回结果：
{
  "events": [
    {
      "date": "YYYY-MM-DD",
      "startTime": "HH:mm",
      "endTime": "HH:mm",
      "title": "事件标题（简洁明了）",
      "location": "地点",
      "notes": "备注信息",
      "confidence": 85
    }
  ]
}

规则：
1. date 必须是 YYYY-MM-DD 格式。如果只有相对日期（如"明天"、"下周一"），请根据当前日期推算。
2. startTime 和 endTime 必须是 HH:mm 格式（24小时制）。
3. 如果缺少结束时间，默认设为开始时间后1小时。
4. title 应该简洁，不超过30个字。
5. confidence 是 0-100 的整数，表示你对该条目提取准确性的信心。
6. 如果某个字段无法确定，设为空字符串 ""，并降低 confidence。
7. 当前日期是：${new Date().toISOString().split("T")[0]}`;

const VALIDATION_SYSTEM_PROMPT = `你是一个日程数据校验助手。请检查以下日程数据，修正格式错误、补全缺失字段、推断合理的时区和持续时间。

规则：
1. 确保日期格式为 YYYY-MM-DD
2. 确保时间格式为 HH:mm（24小时制）
3. 如果结束时间缺失，根据事件类型推断合理的持续时间
4. 如果地点缺失但可以从上下文推断，请补充
5. 修正明显的OCR识别错误（如数字混淆）
6. 返回相同的 JSON 格式`;

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Upload ─────────────────────────────────────────────────────────────
  upload: router({
    create: publicProcedure
      .input(z.object({
        fileName: z.string(),
        fileType: z.string(),
        fileSize: z.number(),
        fileContent: z.string(), // base64 encoded
        mimeType: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.user?.id || 0;

        // In no-storage mode, keep image content as data URL for vision models.
        let fileUrl: string | null = null;
        let fileKey: string | null = null;

        if (input.fileType === "image") {
          const mime = input.mimeType || "image/jpeg";
          fileUrl = `data:${mime};base64,${input.fileContent}`;
        }

        let recordId = Date.now();
        try {
          recordId = await createUploadRecord({
            userId,
            fileName: input.fileName,
            fileType: input.fileType,
            fileSize: input.fileSize,
            fileUrl,
            fileKey,
            status: "pending",
          });
        } catch {
          // Allow no-database mode for lightweight deployments.
        }

        return { id: recordId, fileUrl };
      }),

    list: publicProcedure.query(async ({ ctx }) => {
      const userId = ctx.user?.id || 0;
      return getUploadRecordsByUser(userId);
    }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const record = await getUploadRecordById(input.id);
        return record;
      }),
  }),

  // ─── Recognition ────────────────────────────────────────────────────────
  recognize: router({
    extract: publicProcedure
      .input(z.object({
        uploadId: z.number(),
        textContent: z.string(),
        imageUrl: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.user?.id || 0;

        try {
          await updateUploadRecord(input.uploadId, { status: "processing", rawText: input.textContent });
        } catch {
          // Ignore when database is not configured.
        }

        try {
          // Step 1: Extract events using LLM
          const messages: any[] = [
            { role: "system" as const, content: EXTRACTION_SYSTEM_PROMPT },
          ];

          if (input.imageUrl) {
            messages.push({
              role: "user" as const,
              content: [
                { type: "image_url" as const, image_url: { url: input.imageUrl, detail: "high" as const } },
                { type: "text" as const, text: `请从这张图片中提取所有日程信息。${input.textContent ? `\n\nOCR识别的文本内容：\n${input.textContent}` : ""}` },
              ],
            });
          } else {
            messages.push({
              role: "user" as const,
              content: `请从以下文本中提取所有日程信息：\n\n${input.textContent}`,
            });
          }

          const extractionResult = await invokeLLM({
            messages,
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "schedule_extraction",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    events: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          date: { type: "string", description: "YYYY-MM-DD" },
                          startTime: { type: "string", description: "HH:mm" },
                          endTime: { type: "string", description: "HH:mm" },
                          title: { type: "string" },
                          location: { type: "string" },
                          notes: { type: "string" },
                          confidence: { type: "integer" },
                        },
                        required: ["date", "startTime", "endTime", "title", "location", "notes", "confidence"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["events"],
                  additionalProperties: false,
                },
              },
            },
          });

          let content = extractionResult.choices[0]?.message?.content;
          if (typeof content !== "string") {
            content = JSON.stringify(content);
          }

          let parsed: { events: any[] };
          try {
            parsed = JSON.parse(content);
          } catch {
            // Try to extract JSON from markdown code blocks
            const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) {
              parsed = JSON.parse(jsonMatch[1]);
            } else {
              throw new Error("Failed to parse LLM response");
            }
          }

          // Step 2: Validate and enhance with second LLM pass
          const validationResult = await invokeLLM({
            messages: [
              { role: "system" as const, content: VALIDATION_SYSTEM_PROMPT },
              { role: "user" as const, content: `请校验并优化以下日程数据：\n\n${JSON.stringify(parsed.events, null, 2)}` },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "schedule_validation",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    events: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          date: { type: "string" },
                          startTime: { type: "string" },
                          endTime: { type: "string" },
                          title: { type: "string" },
                          location: { type: "string" },
                          notes: { type: "string" },
                          confidence: { type: "integer" },
                        },
                        required: ["date", "startTime", "endTime", "title", "location", "notes", "confidence"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["events"],
                  additionalProperties: false,
                },
              },
            },
          });

          let validatedContent = validationResult.choices[0]?.message?.content;
          if (typeof validatedContent !== "string") {
            validatedContent = JSON.stringify(validatedContent);
          }

          let validated: { events: any[] };
          try {
            validated = JSON.parse(validatedContent);
          } catch {
            const jsonMatch = validatedContent.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) {
              validated = JSON.parse(jsonMatch[1]);
            } else {
              validated = parsed; // fallback to original
            }
          }

          // Step 3: Save to database
          const eventsToInsert = validated.events.map((e: any) => ({
            uploadId: input.uploadId,
            userId,
            date: e.date || "",
            startTime: e.startTime || "",
            endTime: e.endTime || "",
            title: e.title || "",
            location: e.location || "",
            notes: e.notes || "",
            confidence: e.confidence ?? 80,
          }));

          try {
            await createExtractedEvents(eventsToInsert);
            await updateUploadRecord(input.uploadId, { status: "completed" });

            const savedEvents = await getEventsByUploadId(input.uploadId);
            return { events: savedEvents };
          } catch {
            // Fallback response when database is not configured.
            return {
              events: eventsToInsert.map((event, idx) => ({
                ...event,
                id: -(idx + 1),
              })),
            };
          }
        } catch (error: any) {
          try {
            await updateUploadRecord(input.uploadId, { status: "failed" });
          } catch {
            // Ignore when database is not configured.
          }
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `识别失败: ${error.message}`,
          });
        }
      }),
  }),

  // ─── Events ─────────────────────────────────────────────────────────────
  events: router({
    listByUpload: publicProcedure
      .input(z.object({ uploadId: z.number() }))
      .query(async ({ ctx, input }) => {
        return getEventsByUploadId(input.uploadId);
      }),

    listAll: publicProcedure.query(async ({ ctx }) => {
      const userId = ctx.user?.id || 0;
      return getEventsByUserId(userId);
    }),

    update: publicProcedure
      .input(z.object({
        id: z.number(),
        date: z.string().optional(),
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        title: z.string().optional(),
        location: z.string().optional(),
        notes: z.string().optional(),
        confidence: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        try {
          await updateExtractedEvent(id, data);
        } catch {
          // Allow editing in no-database mode.
        }
        return { success: true };
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        try {
          await deleteExtractedEvent(input.id);
        } catch {
          // Allow deleting in no-database mode.
        }
        return { success: true };
      }),
  }),

  // ─── Calendar / ICS ────────────────────────────────────────────────────
  calendar: router({
    generateICS: publicProcedure
      .input(z.object({
        events: z.array(z.object({
          date: z.string(),
          startTime: z.string(),
          endTime: z.string(),
          title: z.string(),
          location: z.string().optional(),
          notes: z.string().optional(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        const icsContent = generateICS(input.events);
        const shareId = nanoid(12);

        const userId = ctx.user?.id || 0;
        try {
          await createCalendarShare({
            userId,
            shareId,
            icsContent,
            eventCount: input.events.length,
          });
        } catch {
          // In no-database mode, still return downloadable ICS content.
        }

        return {
          icsContent,
          shareId,
        };
      }),

    getShare: publicProcedure
      .input(z.object({ shareId: z.string() }))
      .query(async ({ input }) => {
        const share = await getCalendarShareById(input.shareId);
        if (!share) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Calendar share not found" });
        }
        return share;
      }),

    listShares: publicProcedure.query(async ({ ctx }) => {
      const userId = ctx.user?.id || 0;
      return getCalendarSharesByUser(userId);
    }),
  }),
});

export type AppRouter = typeof appRouter;
