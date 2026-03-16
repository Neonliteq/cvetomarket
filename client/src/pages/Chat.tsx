import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, MessageCircle, ArrowLeft, Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useLocation, useSearch } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import type { Message } from "@shared/schema";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

type MessageWithUsers = Message & { senderName?: string; receiverName?: string };
type ConversationUser = { id: string; name: string; unreadCount: number };

export default function Chat() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const search = useSearch();
  const urlUserId = new URLSearchParams(search).get("userId");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(urlUserId);
  const [showChat, setShowChat] = useState<boolean>(!!urlUserId);
  const [text, setText] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: conversations, isLoading: loadingConvs } = useQuery<ConversationUser[]>({
    queryKey: ["/api/messages/conversations"],
    enabled: !!user,
    refetchInterval: 5000,
  });

  const { data: messages, isLoading: loadingMessages } = useQuery<MessageWithUsers[]>({
    queryKey: ["/api/messages", selectedUserId],
    enabled: !!selectedUserId,
    refetchInterval: 3000,
  });

  const sendMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/messages", {
        receiverId: selectedUserId,
        content: text,
        imageUrl: imageUrl || undefined,
      }),
    onSuccess: () => {
      setText("");
      setImageUrl(null);
      setImagePreview(null);
      qc.invalidateQueries({ queryKey: ["/api/messages", selectedUserId] });
      qc.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
    },
    onError: (err: any) => {
      const msg = err?.message || "Ошибка отправки сообщения";
      toast({ title: msg, variant: "destructive" });
    },
  });

  useEffect(() => {
    if (urlUserId && urlUserId !== selectedUserId) {
      setSelectedUserId(urlUserId);
      setShowChat(true);
    }
  }, [urlUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (isLoading) return null;
  if (!user) {
    navigate("/auth");
    return null;
  }

  const handleSend = () => {
    if ((!text.trim() && !imageUrl) || !selectedUserId) return;
    sendMutation.mutate();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Можно прикреплять только изображения", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Файл слишком большой (максимум 10 МБ)", variant: "destructive" });
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("images", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setImageUrl(data.urls?.[0] || null);
    } catch {
      toast({ title: "Не удалось загрузить изображение", variant: "destructive" });
      setImagePreview(null);
      setImageUrl(null);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleRemoveImage = () => {
    setImageUrl(null);
    setImagePreview(null);
  };

  const handleSelectConversation = (id: string) => {
    setSelectedUserId(id);
    setShowChat(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleBack = () => {
    setShowChat(false);
  };

  const selected = conversations?.find((c) => c.id === selectedUserId);

  return (
    <div className="flex flex-col h-[calc(100dvh-3.5rem)] md:max-w-5xl md:mx-auto md:px-4 md:py-6 md:h-auto">
      <h1 className="hidden md:block text-2xl font-bold mb-4">Сообщения</h1>

      <div className="flex-1 md:flex-none md:h-[calc(100dvh-10rem)] border-0 md:border md:border-border md:rounded-xl overflow-hidden flex">

        {/* ── Conversation list ── */}
        <div
          className={cn(
            "w-full md:w-72 border-r border-border shrink-0 flex flex-col bg-background",
            "md:flex",
            showChat ? "hidden" : "flex"
          )}
        >
          <div className="p-4 border-b border-border flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm font-semibold">Диалоги</p>
          </div>
          <ScrollArea className="flex-1">
            {loadingConvs ? (
              <div className="p-3 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-2">
                    <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                    <Skeleton className="h-4 flex-1 rounded" />
                  </div>
                ))}
              </div>
            ) : conversations?.length ? (
              <div className="p-2 space-y-0.5">
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv.id)}
                    className={cn(
                      "w-full text-left px-3 py-3 rounded-lg flex items-center gap-3 transition-colors",
                      selectedUserId === conv.id && !showChat
                        ? "bg-accent"
                        : "hover:bg-accent/60 active:bg-accent"
                    )}
                    data-testid={`button-conversation-${conv.id}`}
                  >
                    <Avatar className="w-10 h-10 shrink-0">
                      <AvatarFallback className="text-sm font-medium">{conv.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{conv.name}</p>
                      {conv.unreadCount > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {conv.unreadCount} непрочитанных
                        </p>
                      )}
                    </div>
                    {conv.unreadCount > 0 && (
                      <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center shrink-0 font-medium">
                        {conv.unreadCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground px-6 text-center">
                <MessageCircle className="w-10 h-10 opacity-20" />
                <p className="text-sm">Нет диалогов</p>
              </div>
            )}
          </ScrollArea>
        </div>

        {/* ── Message thread ── */}
        <div
          className={cn(
            "flex-1 flex flex-col bg-background",
            "md:flex",
            showChat ? "flex" : "hidden"
          )}
        >
          {selectedUserId ? (
            <>
              {/* Thread header */}
              <div className="px-3 py-3 border-b border-border flex items-center gap-2 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden shrink-0 -ml-1"
                  onClick={handleBack}
                  data-testid="button-back-chat"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <Avatar className="w-8 h-8 shrink-0">
                  <AvatarFallback className="text-xs font-medium">
                    {selected?.name?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
                <p className="font-semibold text-sm flex-1 truncate">{selected?.name}</p>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 px-4 py-3">
                {loadingMessages ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className={cn("flex", i % 2 ? "justify-end" : "justify-start")}>
                        <Skeleton className={cn("h-10 rounded-2xl", i % 2 ? "w-40" : "w-52")} />
                      </div>
                    ))}
                  </div>
                ) : messages?.length ? (
                  <div className="space-y-2 pb-1">
                    {messages.map((msg) => {
                      const isMe = msg.senderId === user.id;
                      return (
                        <div key={msg.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                          <div
                            className={cn(
                              "max-w-[75%] rounded-2xl text-sm leading-relaxed overflow-hidden",
                              isMe
                                ? "bg-primary text-primary-foreground rounded-br-sm"
                                : "bg-muted rounded-bl-sm"
                            )}
                          >
                            {msg.imageUrl && (
                              <a href={msg.imageUrl} target="_blank" rel="noopener noreferrer">
                                <img
                                  src={msg.imageUrl}
                                  alt="Фото"
                                  className="max-w-full max-h-64 object-cover block"
                                />
                              </a>
                            )}
                            {msg.content && (
                              <div className="px-4 py-2.5">
                                <p className="break-words">{msg.content}</p>
                              </div>
                            )}
                            <div className={cn("px-4 pb-2", !msg.content && msg.imageUrl ? "" : "-mt-1")}>
                              {msg.createdAt && (
                                <p className={cn(
                                  "text-[11px] text-right",
                                  isMe ? "text-primary-foreground/60" : "text-muted-foreground"
                                )}>
                                  {format(new Date(msg.createdAt), "HH:mm")}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full min-h-40 gap-2 text-muted-foreground">
                    <MessageCircle className="w-8 h-8 opacity-20" />
                    <p className="text-sm">Начните диалог</p>
                  </div>
                )}
              </ScrollArea>

              {/* Image preview */}
              {imagePreview && (
                <div className="px-3 pt-2 border-t border-border">
                  <div className="relative w-fit">
                    <img
                      src={imagePreview}
                      alt="Предпросмотр"
                      className="h-20 w-auto rounded-lg object-cover border border-border"
                    />
                    {uploading && (
                      <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center">
                        <span className="text-white text-xs">Загрузка...</span>
                      </div>
                    )}
                    <button
                      onClick={handleRemoveImage}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                      data-testid="button-remove-image"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}

              {/* Input */}
              <div className="p-3 border-t border-border flex gap-2 shrink-0 bg-background items-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                  data-testid="input-file"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 rounded-full text-muted-foreground hover:text-foreground"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || sendMutation.isPending}
                  data-testid="button-attach"
                >
                  <Paperclip className="w-4 h-4" />
                </Button>
                <Input
                  ref={inputRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Введите сообщение..."
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  className="flex-1 rounded-full px-4"
                  data-testid="input-message"
                />
                <Button
                  size="icon"
                  onClick={handleSend}
                  disabled={(!text.trim() && !imageUrl) || uploading || sendMutation.isPending}
                  className="rounded-full shrink-0"
                  data-testid="button-send"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </>
          ) : (
            <div className="hidden md:flex flex-1 items-center justify-center flex-col gap-3 text-muted-foreground">
              <MessageCircle className="w-14 h-14 opacity-15" />
              <p className="text-sm">Выберите диалог слева</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
