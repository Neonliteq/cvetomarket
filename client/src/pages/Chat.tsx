import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, MessageCircle, ArrowLeft } from "lucide-react";
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

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
    mutationFn: () => apiRequest("POST", "/api/messages", { receiverId: selectedUserId, content: text }),
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["/api/messages", selectedUserId] });
      qc.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
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
    if (!text.trim() || !selectedUserId) return;
    sendMutation.mutate();
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
                              "max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed",
                              isMe
                                ? "bg-primary text-primary-foreground rounded-br-sm"
                                : "bg-muted rounded-bl-sm"
                            )}
                          >
                            <p className="break-words">{msg.content}</p>
                            {msg.createdAt && (
                              <p className={cn(
                                "text-[11px] mt-1 text-right",
                                isMe ? "text-primary-foreground/60" : "text-muted-foreground"
                              )}>
                                {format(new Date(msg.createdAt), "HH:mm")}
                              </p>
                            )}
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

              {/* Input */}
              <div className="p-3 border-t border-border flex gap-2 shrink-0 bg-background">
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
                  disabled={!text.trim() || sendMutation.isPending}
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
