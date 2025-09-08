import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { supabase } from "@/config/supabase";
import { useAuth } from "@/context/supabase-provider";
import { SafeAreaView } from "@/components/safe-area-view";
import { Text } from "@/components/ui/text";
import { H1, Muted } from "@/components/ui/typography";

type Conversation = {
  id: string;
  title: string | null;
  created_at: string | null;
  event?: { title: string | null; sport?: { emoji?: string | null; name?: string | null } | null } | null;
};

export default function ConversationListScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);

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

  if (!session) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center p-6">
        <Muted>Veuillez vous connecter pour voir vos messages.</Muted>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-4 pt-2 pb-4">
        <H1>Messages</H1>
        <Muted>Vos conversations d'événements</Muted>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : conversations.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center">Aucune conversation pour le moment.</Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <View className="h-px bg-muted" />}
          renderItem={({ item }) => {
            const prefix = item.event?.sport?.emoji ? `${item.event.sport.emoji} ` : "";
            const displayTitle = item.event?.title ? `${prefix}${item.event.title}` : (item.title ?? "Conversation");
            return (
              <Pressable
                className="px-4 py-3 active:opacity-80"
                onPress={() => router.push({ pathname: "/(protected)/chat/[id]", params: { id: item.id } })}
              >
                <Text className="text-base font-semibold">{displayTitle}</Text>
                <Muted>{new Date(item.created_at ?? Date.now()).toLocaleString()}</Muted>
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}


