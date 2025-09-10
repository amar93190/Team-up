import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { supabase } from "@/config/supabase";
import { useAuth } from "@/context/supabase-provider";
import { SafeAreaView } from "@/components/safe-area-view";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { H1, Muted } from "@/components/ui/typography";

type Message = {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
};

export default function ConversationScreen() {
  const params = useLocalSearchParams();
  const rawId = (params?.id ?? "") as string | string[];
  const idCandidate = Array.isArray(rawId) ? rawId[0] : rawId;
  // Redirect away if someone navigated to /chat/index by mistake
  useEffect(() => {
    if (idCandidate === "index") {
      router.replace("/(protected)/chat");
    }
  }, [idCandidate]);
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const conversationId = typeof idCandidate === "string" && uuidRegex.test(idCandidate) ? idCandidate : null;
  const { session } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>("");
  const listRef = useRef<FlatList>(null);
  const [headerTitle, setHeaderTitle] = useState<string>("Conversation");

  useEffect(() => {
    const loadHeader = async () => {
      if (!conversationId) return;
      const { data: conv } = await supabase
        .from("conversations")
        .select("id, title, event_id")
        .eq("id", conversationId)
        .maybeSingle();
      if (conv?.event_id) {
        const { data: ev } = await supabase
          .from("events")
          .select("title, sport:sports(name,emoji)")
          .eq("id", conv.event_id)
          .maybeSingle();
        if (ev) {
          const prefix = ev?.sport?.emoji ? `${ev.sport.emoji} ` : "";
          setHeaderTitle(`${prefix}${ev.title}`);
          return;
        }
      }
      if (conv?.title) setHeaderTitle(conv.title);
    };
    loadHeader();
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId || !session) return;
    let mounted = true;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("messages")
        .select("id, user_id, body, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (error) console.error("load messages error", error);
      if (mounted) setMessages(data ?? []);
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 50);
    };
    load();

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as unknown as Message]);
          setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [conversationId, session?.user?.id]);

  const send = async () => {
    const trimmed = input.trim();
    if (!trimmed || !session || !conversationId) return;
    setInput("");
    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      user_id: session.user.id,
      body: trimmed,
    });
    if (error) {
      console.error("send message error", error);
    }
  };

  if (!session) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center p-6">
        <Muted>Veuillez vous connecter pour voir cette conversation.</Muted>
      </SafeAreaView>
    );
  }

  if (!conversationId) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center p-6">
        <Muted>Conversation introuvable.</Muted>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView behavior={Platform.select({ ios: "padding", android: undefined })} className="flex-1">
        <View className="px-4 pt-2 pb-3">
          <H1>{headerTitle}</H1>
          <Button variant="ghost" onPress={() => router.back()}>
            <Text>Retour</Text>
          </Button>
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const mine = item.user_id === session.user.id;
              return (
                <View className={`mb-2 flex-row ${mine ? "justify-end" : "justify-start"}`}>
                  <View className={`max-w-[80%] rounded-2xl px-3 py-2 ${mine ? "bg-blue-500" : "bg-muted"}`}>
                    <Text className={`${mine ? "text-white" : "text-foreground"}`}>{item.body}</Text>
                    <Muted className={`${mine ? "text-white/80" : "text-foreground/70"}`}>{
                      new Date(item.created_at).toLocaleTimeString()
                    }</Muted>
                  </View>
                </View>
              );
            }}
          />
        )}

        <View className="flex-row items-center gap-2 px-3 pb-3">
          <View className="flex-1 rounded-full bg-muted px-3 py-2">
            <TextInput
              placeholder="Votre message"
              value={input}
              onChangeText={setInput}
              onSubmitEditing={send}
              returnKeyType="send"
            />
          </View>
          <Button onPress={send} disabled={!input.trim()}>
            <Text>Envoyer</Text>
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}


