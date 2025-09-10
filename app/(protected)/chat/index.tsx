import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, View, TextInput } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { supabase } from "@/config/supabase";
import { useAuth } from "@/context/supabase-provider";
import { SafeAreaView } from "@/components/safe-area-view";
import { Text } from "@/components/ui/text";
import { H1, Muted } from "@/components/ui/typography";
import { useToast } from "@/components/ui/toast";

type Conversation = {
  id: string;
  title: string | null;
  created_at: string | null;
  event?: { title: string | null; sport?: { emoji?: string | null; name?: string | null } | null } | null;
};

export default function ConversationListScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState<boolean>(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [query, setQuery] = useState<string>("");

  const load = async () => {
    if (!session) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("conversations")
      .select("id, title, created_at, event:events(title, sport:sports(emoji,name))")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("load conversations error", error);
    } else {
      setConversations(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [session?.user?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  useEffect(() => {
    if (!session) return;
    const channel = supabase
      .channel("messages:all")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          try {
            const convId = (payload.new as any)?.conversation_id;
            if (!convId) return;
            const conv = conversations.find((c) => c.id === convId);
            const prefix = conv?.event?.sport?.emoji ? `${conv.event.sport.emoji} ` : "";
            const title = conv?.event?.title ? `${prefix}${conv.event.title}` : "Nouveau message";
            toast.show("Nouveau message", title);
          } catch {}
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id, conversations]);

  if (!session) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center p-6">
        <Muted>Veuillez vous connecter pour voir vos messages.</Muted>
      </SafeAreaView>
    );
  }

  const filtered = conversations.filter((c) => {
    const prefix = c.event?.sport?.emoji ? `${c.event.sport.emoji} ` : "";
    const title = c.event?.title ? `${prefix}${c.event.title}` : (c.title ?? "Conversation");
    return title.toLowerCase().includes(query.toLowerCase());
  });

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header + Search */}
      <View className="px-4 pt-2 pb-3 gap-y-2">
        <H1>Messages</H1>
        <View className="flex-row items-center rounded-full bg-muted px-3 py-2">
          <Text className="text-foreground/60">🔎</Text>
          <TextInput
            placeholder="Rechercher"
            value={query}
            onChangeText={setQuery}
            style={{ flex: 1, marginLeft: 8 }}
          />
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : filtered.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center">Aucune conversation.</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <View className="h-px bg-muted" />}
          renderItem={({ item }) => {
            const prefix = item.event?.sport?.emoji ? `${item.event.sport.emoji} ` : "";
            const displayTitle = item.event?.title ? `${prefix}${item.event.title}` : (item.title ?? "Conversation");
            const time = new Date(item.created_at ?? Date.now()).toLocaleTimeString();
            return (
              <Pressable
                className="px-4 py-3 active:opacity-80 flex-row items-center gap-x-3"
                onPress={() => router.push({ pathname: "/(protected)/chat/[id]", params: { id: item.id } })}
              >
                {/* Avatar (emoji circle) */}
                <View className="h-12 w-12 rounded-full bg-muted items-center justify-center">
                  <Text className="text-lg">{item.event?.sport?.emoji ?? "💬"}</Text>
                </View>
                {/* Middle: title + snippet/time */}
                <View className="flex-1">
                  <Text className="font-semibold" numberOfLines={1}>{displayTitle}</Text>
                  <Muted numberOfLines={1}>Dernier message • {time}</Muted>
                </View>
                {/* Right: time */}
                <Muted className="ml-2 text-xs">{time}</Muted>
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}


