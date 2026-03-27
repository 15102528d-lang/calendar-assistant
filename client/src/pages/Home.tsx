
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import SiteLayout from "@/components/site/SiteLayout";
import { toast } from "sonner";
import {
  Calendar, Upload, FileText, Image, Type, X, Trash2,
  Sparkles, Download, Share2, Copy, ExternalLink,
  ChevronRight, Clock, MapPin, AlertCircle, Check,
  LogIn, LogOut, History, Plus, Loader2, Eye, Pencil,
} from "lucide-react";
import { useState, useCallback, useRef, useMemo } from "react";
import type { ChangeEvent, DragEvent } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface EventRow {
  id?: number;
  date: string;
  startTime: string;
  endTime: string;
  title: string;
  location: string;
  notes: string;
  confidence: number;
}

interface UploadedFile {
  file: File;
  id?: number;
  preview?: string;
}

type WorkflowStep = "upload" | "recognize" | "edit" | "export";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileType(file: File): string {
  if (file.type.startsWith("image/")) return "image";
  if (file.type === "application/pdf") return "pdf";
  return "text";
}

function getConfidenceLevel(confidence: number): "high" | "medium" | "low" {
  if (confidence >= 80) return "high";
  if (confidence >= 50) return "medium";
  return "low";
}

function isMissingField(value: string | undefined | null): boolean {
  return !value || value.trim() === "";
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function Home() {
  // Auth disabled - all users can use the app without login
  const isAuthenticated = true;

  const [currentStep, setCurrentStep] = useState<WorkflowStep>("upload");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [textInput, setTextInput] = useState("");
  const [inputMode, setInputMode] = useState<"file" | "text">("file");
  const [events, setEvents] = useState<EventRow[]>([]);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [recognizeProgress, setRecognizeProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [shareInfo, setShareInfo] = useState<{ shareId: string; icsContent: string } | null>(null);
  const [editingCell, setEditingCell] = useState<{ rowIdx: number; field: string } | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = trpc.upload.create.useMutation();
  const recognizeMutation = trpc.recognize.extract.useMutation();
  const updateEventMutation = trpc.events.update.useMutation();
  const deleteEventMutation = trpc.events.delete.useMutation();
  const generateICSMutation = trpc.calendar.generateICS.useMutation();
  const { data: uploadHistory } = trpc.upload.list.useQuery(undefined, {
    enabled: showHistory,
  });

  // ─── File Upload ────────────────────────────────────────────────────────

  const handleFiles = useCallback((files: FileList | File[]) => {
    const newFiles: UploadedFile[] = Array.from(files).map(file => {
      const preview = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;
      return { file, preview };
    });
    setUploadedFiles(prev => [...prev, ...newFiles]);
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleFileInput = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

  const removeFile = useCallback((index: number) => {
    setUploadedFiles(prev => {
      const file = prev[index];
      if (file?.preview) URL.revokeObjectURL(file.preview);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  // ─── Recognition ────────────────────────────────────────────────────────

  const handleRecognize = useCallback(async () => {
    setIsRecognizing(true);
    setRecognizeProgress(10);
    setCurrentStep("recognize");

    try {
      const allEvents: EventRow[] = [];

      if (inputMode === "text" && textInput.trim()) {
        setRecognizeProgress(20);

        // Upload text as a record
        const uploadResult = await uploadMutation.mutateAsync({
          fileName: "text-input.txt",
          fileType: "text",
          fileSize: new Blob([textInput]).size,
          fileContent: btoa(unescape(encodeURIComponent(textInput))),
          mimeType: "text/plain",
        });

        setRecognizeProgress(40);

        const result = await recognizeMutation.mutateAsync({
          uploadId: uploadResult.id,
          textContent: textInput,
        });

        setRecognizeProgress(90);
        allEvents.push(...result.events.map(e => ({
          id: e.id,
          date: e.date || "",
          startTime: e.startTime || "",
          endTime: e.endTime || "",
          title: e.title || "",
          location: e.location || "",
          notes: e.notes || "",
          confidence: e.confidence ?? 80,
        })));
      } else if (inputMode === "file" && uploadedFiles.length > 0) {
        const progressPerFile = 70 / uploadedFiles.length;

        for (let i = 0; i < uploadedFiles.length; i++) {
          const { file } = uploadedFiles[i];
          setRecognizeProgress(15 + i * progressPerFile);

          // Read file as base64
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
              const result = reader.result as string;
              resolve(result.split(",")[1] || "");
            };
            reader.readAsDataURL(file);
          });

          const fileType = getFileType(file);

          const uploadResult = await uploadMutation.mutateAsync({
            fileName: file.name,
            fileType,
            fileSize: file.size,
            fileContent: base64,
            mimeType: file.type,
          });

          setRecognizeProgress(15 + i * progressPerFile + progressPerFile * 0.4);

          // For text files, read content directly
          let textContent = "";
          if (fileType === "text") {
            textContent = await file.text();
          }

          const result = await recognizeMutation.mutateAsync({
            uploadId: uploadResult.id,
            textContent,
            imageUrl: fileType === "image" ? uploadResult.fileUrl || undefined : undefined,
          });

          setRecognizeProgress(15 + (i + 1) * progressPerFile);
          allEvents.push(...result.events.map(e => ({
            id: e.id,
            date: e.date || "",
            startTime: e.startTime || "",
            endTime: e.endTime || "",
            title: e.title || "",
            location: e.location || "",
            notes: e.notes || "",
            confidence: e.confidence ?? 80,
          })));
        }
      }

      setRecognizeProgress(100);
      setEvents(allEvents);
      setCurrentStep("edit");

      if (allEvents.length === 0) {
        toast.info("未能识别到日程信息，请检查输入内容");
      } else {
        toast.success(`成功识别 ${allEvents.length} 条日程`);
      }
    } catch (error: any) {
      toast.error(error.message || "识别失败，请重试");
      setCurrentStep("upload");
    } finally {
      setIsRecognizing(false);
    }
  }, [inputMode, textInput, uploadedFiles, uploadMutation, recognizeMutation]);

  // ─── Event Editing ──────────────────────────────────────────────────────

  const handleCellEdit = useCallback((rowIdx: number, field: string, value: string) => {
    setEvents(prev => {
      const updated = [...prev];
      updated[rowIdx] = { ...updated[rowIdx], [field]: value };
      return updated;
    });
  }, []);

  const handleCellBlur = useCallback((rowIdx: number, field: string) => {
    const event = events[rowIdx];
    if (event?.id) {
      updateEventMutation.mutate({ id: event.id, [field]: (event as any)[field] });
    }
    setEditingCell(null);
  }, [events, updateEventMutation]);

  const handleDeleteEvent = useCallback((rowIdx: number) => {
    const event = events[rowIdx];
    if (event?.id) {
      deleteEventMutation.mutate({ id: event.id });
    }
    setEvents(prev => prev.filter((_, i) => i !== rowIdx));
  }, [events, deleteEventMutation]);

  const handleAddEvent = useCallback(() => {
    setEvents(prev => [...prev, {
      date: new Date().toISOString().split("T")[0],
      startTime: "09:00",
      endTime: "10:00",
      title: "",
      location: "",
      notes: "",
      confidence: 100,
    }]);
  }, []);

  // ─── Export ─────────────────────────────────────────────────────────────

  const handleExport = useCallback(async () => {
    if (events.length === 0) {
      toast.error("没有可导出的日程");
      return;
    }

    try {
      const result = await generateICSMutation.mutateAsync({
        events: events.map(e => ({
          date: e.date,
          startTime: e.startTime,
          endTime: e.endTime,
          title: e.title,
          location: e.location,
          notes: e.notes,
        })),
      });

      setShareInfo(result);
      setCurrentStep("export");

      // Auto-download ICS
      const blob = new Blob([result.icsContent], { type: "text/calendar" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "calendar.ics";
      a.click();
      URL.revokeObjectURL(url);

      toast.success("ICS 文件已生成并下载");
    } catch (error: any) {
      toast.error(error.message || "导出失败");
    }
  }, [events, generateICSMutation]);

  const handleCopyLink = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("链接已复制到剪贴板");
  }, []);

  // ─── Workflow Steps ─────────────────────────────────────────────────────

  const steps = useMemo(() => [
    { id: "upload" as const, label: "上传", icon: Upload },
    { id: "recognize" as const, label: "识别", icon: Sparkles },
    { id: "edit" as const, label: "编辑", icon: Pencil },
    { id: "export" as const, label: "导出", icon: Download },
  ], []);

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  const canRecognize = inputMode === "text" ? textInput.trim().length > 0 : uploadedFiles.length > 0;

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <SiteLayout>
      <main className="container max-w-5xl mx-auto py-6 sm:py-8 space-y-5 sm:space-y-6">
        <section className="glass-card rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl text-foreground">上传并生成日历</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">从文件或文本提取日程，生成可导入系统日历的 ICS 文件</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground gap-1.5 self-start sm:self-auto"
            onClick={() => setShowHistory(!showHistory)}
          >
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">历史</span>
          </Button>
        </section>

        {/* Workflow Progress */}
        <div className="glass-card rounded-2xl p-4 sm:p-6 transition-glass">
          <div className="overflow-x-auto">
            <div className="flex items-center justify-between min-w-[540px]">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              const isActive = idx === currentStepIndex;
              const isCompleted = idx < currentStepIndex;
              return (
                <div key={step.id} className="flex items-center flex-1 last:flex-initial">
                  <div className="flex flex-col items-center gap-1.5">
                    <div className={`
                      w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300
                      ${isActive ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" :
                        isCompleted ? "bg-primary/15 text-primary" :
                        "bg-muted/60 text-muted-foreground"}
                    `}>
                      {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                    </div>
                    <span className={`text-xs font-medium ${isActive ? "text-primary" : isCompleted ? "text-primary/70" : "text-muted-foreground"}`}>
                      {step.label}
                    </span>
                  </div>
                  {idx < steps.length - 1 && (
                    <div className={`flex-1 h-px mx-3 mb-5 transition-colors duration-300 ${
                      idx < currentStepIndex ? "bg-primary/40" : "bg-border/60"
                    }`} />
                  )}
                </div>
              );
            })}
            </div>
          </div>
        </div>

        {/* Upload Section */}
        {currentStep === "upload" && (
          <div className="glass-card glass-upload rounded-2xl p-4 sm:p-6 space-y-5 transition-glass">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-foreground">输入内容</h2>
              <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as "file" | "text")}>
                <TabsList className="bg-muted/50">
                  <TabsTrigger value="file" className="gap-1.5 text-xs">
                    <Upload className="w-3.5 h-3.5" />
                    文件上传
                  </TabsTrigger>
                  <TabsTrigger value="text" className="gap-1.5 text-xs">
                    <Type className="w-3.5 h-3.5" />
                    文本输入
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {inputMode === "file" ? (
              <div className="space-y-4">
                {/* Drop Zone */}
                <div
                  className={`
                    relative border-2 border-dashed rounded-xl p-6 sm:p-8 text-center transition-all duration-200
                    ${isDragging
                      ? "border-primary bg-primary/5 scale-[1.01]"
                      : "border-border/60 hover:border-primary/40 hover:bg-primary/[0.02]"}
                  `}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf,.txt,.md,.csv"
                    className="hidden"
                    onChange={handleFileInput}
                  />
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-primary/8 flex items-center justify-center">
                      <Upload className="w-7 h-7 text-primary/70" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        拖拽文件到此处，或点击选择
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        支持图片、PDF、文本文件，可同时上传多个
                      </p>
                    </div>
                  </div>
                </div>

                {/* File List */}
                {uploadedFiles.length > 0 && (
                  <div className="space-y-2">
                    {uploadedFiles.map((uf, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/30 group">
                        <div className="w-10 h-10 rounded-lg bg-primary/8 flex items-center justify-center flex-shrink-0">
                          {uf.preview ? (
                            <img src={uf.preview} alt="" className="w-10 h-10 rounded-lg object-cover" />
                          ) : uf.file.type === "application/pdf" ? (
                            <FileText className="w-5 h-5 text-primary/70" />
                          ) : (
                            <Type className="w-5 h-5 text-primary/70" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{uf.file.name}</p>
                          <p className="text-xs text-muted-foreground">{formatFileSize(uf.file.size)}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                          onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <textarea
                className="w-full h-48 p-4 rounded-xl bg-muted/20 border border-border/40 text-sm text-foreground placeholder:text-muted-foreground/60 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
                placeholder="粘贴包含日程信息的文本内容...&#10;&#10;例如：&#10;3月28日 上午9:00-11:00 团队周会 会议室A&#10;3月29日 下午2:00 客户拜访 科技园B座"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
              />
            )}

            <div className="flex justify-end">
              <Button
                className="gap-2 px-6 soft-action w-full sm:w-auto"
                disabled={!canRecognize}
                onClick={handleRecognize}
              >
                <Sparkles className="w-4 h-4" />
                开始识别
              </Button>
            </div>
          </div>
        )}

        {/* Recognition Progress */}
        {currentStep === "recognize" && isRecognizing && (
          <div className="glass-card rounded-2xl p-6 sm:p-8 text-center space-y-5 transition-glass">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Sparkles className="w-8 h-8 text-primary animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">正在智能识别...</h3>
              <p className="text-sm text-muted-foreground mt-1">AI 正在分析您的内容并提取日程信息</p>
            </div>
            <div className="max-w-md mx-auto">
              <Progress value={recognizeProgress} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">{Math.round(recognizeProgress)}%</p>
            </div>
          </div>
        )}

        {/* Event Table */}
        {(currentStep === "edit" || currentStep === "export") && events.length > 0 && (
          <div className="glass-card rounded-2xl overflow-hidden transition-glass">
            <div className="p-4 sm:p-5 border-b border-border/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-foreground">识别结果</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  共 {events.length} 条日程，点击单元格可编辑
                </p>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button variant="outline" size="sm" className="gap-1.5 bg-card/50 soft-action" onClick={handleAddEvent}>
                  <Plus className="w-3.5 h-3.5" />
                  添加
                </Button>
                <Button size="sm" className="gap-1.5 soft-action" onClick={handleExport} disabled={generateICSMutation.isPending}>
                  {generateICSMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  生成 ICS
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30 border-b border-border/30">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground w-[120px]">日期</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground w-[90px]">开始</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground w-[90px]">结束</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground min-w-[180px]">事件</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground min-w-[120px]">地点</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground w-[70px]">置信度</th>
                    <th className="w-[50px]"></th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event, rowIdx) => {
                    const level = getConfidenceLevel(event.confidence);
                    return (
                      <tr key={rowIdx} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                        {(["date", "startTime", "endTime", "title", "location"] as const).map(field => {
                          const value = event[field];
                          const missing = isMissingField(value);
                          const isEditing = editingCell?.rowIdx === rowIdx && editingCell?.field === field;
                          return (
                            <td
                              key={field}
                              className={`px-4 py-2.5 ${missing ? "confidence-low" : ""}`}
                              onClick={() => setEditingCell({ rowIdx, field })}
                            >
                              {isEditing ? (
                                <input
                                  autoFocus
                                  className="w-full bg-transparent border-b-2 border-primary/50 outline-none text-sm py-0.5 text-foreground"
                                  value={value}
                                  onChange={(e) => handleCellEdit(rowIdx, field, e.target.value)}
                                  onBlur={() => handleCellBlur(rowIdx, field)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handleCellBlur(rowIdx, field);
                                    if (e.key === "Escape") setEditingCell(null);
                                    if (e.key === "Tab") {
                                      e.preventDefault();
                                      const fields = ["date", "startTime", "endTime", "title", "location"];
                                      const currentIdx = fields.indexOf(field);
                                      const nextField = fields[(currentIdx + 1) % fields.length];
                                      const nextRow = currentIdx === fields.length - 1 ? rowIdx + 1 : rowIdx;
                                      if (nextRow < events.length) {
                                        handleCellBlur(rowIdx, field);
                                        setEditingCell({ rowIdx: nextRow, field: nextField });
                                      }
                                    }
                                  }}
                                />
                              ) : (
                                <span className={`${missing ? "text-destructive/60 italic text-xs" : "text-foreground"}`}>
                                  {missing ? (
                                    <span className="flex items-center gap-1">
                                      <AlertCircle className="w-3 h-3" />
                                      待补充
                                    </span>
                                  ) : (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="block truncate max-w-[200px]">{value}</span>
                                      </TooltipTrigger>
                                      {value.length > 20 && (
                                        <TooltipContent>{value}</TooltipContent>
                                      )}
                                    </Tooltip>
                                  )}
                                </span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-3 py-2.5">
                          <Badge variant={level === "high" ? "default" : level === "medium" ? "secondary" : "destructive"} className="text-[10px] px-1.5 py-0">
                            {event.confidence}
                          </Badge>
                        </td>
                        <td className="px-2 py-2.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-7 h-7 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteEvent(rowIdx)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="p-4 border-t border-border/20 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm confidence-low" />
                缺失字段
              </span>
              <span className="flex items-center gap-1.5">
                <AlertCircle className="w-3 h-3" />
                点击编辑
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">Tab</kbd>
                切换单元格
              </span>
            </div>
          </div>
        )}

        {/* Export / Share Section */}
        {currentStep === "export" && shareInfo && (
          <div className="glass-card rounded-2xl p-6 space-y-5 transition-glass">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                <Check className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">导出成功</h2>
                <p className="text-xs text-muted-foreground">ICS 文件已下载，您也可以通过以下链接分享</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {/* HTTP Link */}
              <div className="p-4 rounded-xl bg-muted/20 border border-border/30 space-y-2">
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">HTTP 下载链接</span>
                </div>
                <code className="text-xs bg-muted/40 px-3 py-2 rounded-lg block break-all text-foreground/70">
                  {`${window.location.origin}/api/calendars/${shareInfo.shareId}`}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5 bg-card/50 soft-action"
                  onClick={() => handleCopyLink(`${window.location.origin}/api/calendars/${shareInfo.shareId}`)}
                >
                  <Copy className="w-3.5 h-3.5" />
                  复制链接
                </Button>
              </div>

              {/* Webcal Link */}
              <div className="p-4 rounded-xl bg-muted/20 border border-border/30 space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Webcal 订阅链接</span>
                </div>
                <code className="text-xs bg-muted/40 px-3 py-2 rounded-lg block break-all text-foreground/70">
                  {`${window.location.origin}/api/calendars/${shareInfo.shareId}`.replace(/^https?:\/\//, "webcal://")}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5 bg-card/50 soft-action"
                  onClick={() => handleCopyLink(`${window.location.origin}/api/calendars/${shareInfo.shareId}`.replace(/^https?:\/\//, "webcal://"))}
                >
                  <Copy className="w-3.5 h-3.5" />
                  复制链接
                </Button>
              </div>
            </div>

            {/* Share page link */}
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/15 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-primary" />
                <span className="text-sm text-foreground">分享页面</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 bg-card/50 soft-action"
                onClick={() => handleCopyLink(`${window.location.origin}/share/${shareInfo.shareId}`)}
              >
                <Copy className="w-3.5 h-3.5" />
                复制分享链接
              </Button>
            </div>

            <div className="flex justify-center">
              <Button
                variant="outline"
                className="gap-2 bg-card/50 soft-action"
                onClick={() => {
                  setCurrentStep("upload");
                  setEvents([]);
                  setUploadedFiles([]);
                  setTextInput("");
                  setShareInfo(null);
                }}
              >
                <Plus className="w-4 h-4" />
                新建识别
              </Button>
            </div>
          </div>
        )}

        {/* History Panel */}
        {showHistory && uploadHistory && (
          <div className="glass-card rounded-2xl p-6 space-y-4 transition-glass">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">上传历史</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowHistory(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            {uploadHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">暂无上传记录</p>
            ) : (
              <div className="space-y-2">
                {uploadHistory.map((record) => (
                  <div key={record.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border/20">
                    <div className="w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center flex-shrink-0">
                      {record.fileType === "image" ? <Image className="w-4 h-4 text-primary/70" /> :
                       record.fileType === "pdf" ? <FileText className="w-4 h-4 text-primary/70" /> :
                       <Type className="w-4 h-4 text-primary/70" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{record.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(record.createdAt).toLocaleString("zh-CN")} · {formatFileSize(record.fileSize)}
                      </p>
                    </div>
                    <Badge variant={
                      record.status === "completed" ? "default" :
                      record.status === "failed" ? "destructive" :
                      "secondary"
                    } className="text-xs">
                      {record.status === "completed" ? "已完成" :
                       record.status === "failed" ? "失败" :
                       record.status === "processing" ? "处理中" : "待处理"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-8 text-center">
        <p className="text-xs text-muted-foreground/60">
          Calendar Assistant · 智能日程识别与日历生成
        </p>
      </footer>
    </SiteLayout>
  );
}
