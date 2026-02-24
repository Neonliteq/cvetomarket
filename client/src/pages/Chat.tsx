import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import type { Message } from "@shared/schema";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

type MessageWithUsers = Message & { senderName?: string; receiverName?: string };
type ConversationUser = { id: string; name: string; unreadCount: number };

export default function Chat() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
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

  const selected = conversations?.find((c) => c.id === selectedUserId);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Сообщения</h1>
      <div className="border border-border rounded-lg overflow-hidden flex h-[600px]">
        <div className="w-64 border-r border-border shrink-0 flex flex-col">
          <div className="p-3 border-b border-border">
            <p className="text-sm font-semibold text-muted-foreground">Диалоги</p>
          </div>
          <ScrollArea className="flex-1">
            {loadingConvs ? (
              <div className="p-3 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 rounded" />)}
              </div>
            ) : conversations?.length ? (
              <div className="p-2 space-y-1">
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedUserId(conv.id)}
                    className={cn(
                      "w-full text-left p-2.5 rounded-md flex items-center gap-2.5 transition-colors",
                      selectedUserId === conv.id ? "bg-accent" : "hover-elevate"
                    )}
                    data-testid={`button-conversation-${conv.id}`}
                  >
                    <Avatar className="w-8 h-8 shrink-0">
                      <AvatarFallback className="text-xs">{conv.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{conv.name}</p>
                    </div>
                    {conv.unreadCount > 0 && (
                      <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center shrink-0">
                        {conv.unreadCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground">Нет диалогов</div>
            )}
          </ScrollArea>
        </div>

        <div className="flex-1 flex flex-col">
          {selectedUserId ? (
            <>
              <div className="p-3 border-b border-border flex items-center gap-2">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="text-xs">{selected?.name?.[0] || "?"}</AvatarFallback>
                </Avatar>
                <p className="font-semibold text-sm">{selected?.name}</p>
              </div>
              <ScrollArea className="flex-1 p-4">
                {loadingMessages ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
                  </div>
                ) : messages?.length ? (
                  <div className="space-y-3">
                    {messages.map((msg) => {
                      const isMe = msg.senderId === user.id;
                      return (
                        <div key={msg.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                          <div
                            className={cn(
                              "max-w-xs px-3 py-2 rounded-lg text-sm",
                              isMe ? "bg-primary text-primary-foreground" : "bg-muted"
                            )}
                          >
                            <p>{msg.content}</p>
                            {msg.createdAt && (
                              <p className={cn("text-xs mt-1", isMe ? "text-primary-foreground/70" : "text-muted-foreground")}>
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
                  <div className="text-center text-muted-foreground text-sm py-12">Начните диалог</div>
                )}
              </ScrollArea>
              <div className="p-3 border-t border-border flex gap-2">
                <Input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Введите сообщение..."
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  data-testid="input-message"
                />
                <Button
                  size="icon"
                  onClick={handleSend}
                  disabled={!text.trim() || sendMutation.isPending}
                  data-testid="button-send"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center flex-col gap-3 text-muted-foreground">
              <MessageCircle className="w-12 h-12 opacity-20" />
              <p className="text-sm">Выберите диалог слева</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
