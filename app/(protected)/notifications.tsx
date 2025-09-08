import { useEffect } from "react";
import { FlatList, Pressable, View } from "react-native";
import { SafeAreaView } from "@/components/safe-area-view";
import { Text } from "@/components/ui/text";
import { H1, Muted } from "@/components/ui/typography";
import { useNotificationCenter } from "@/context/notification-center";
import { router } from "expo-router";

export default function NotificationCenterScreen() {
  const { notifications, markAllRead, clear } = useNotificationCenter();

  useEffect(() => {
    markAllRead();
  }, [markAllRead]);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-4 pt-2 pb-3 flex-row items-center justify-between">
        <H1>Notifications</H1>
        <Pressable onPress={() => clear()} className="px-3 py-1 rounded-md bg-muted">
          <Text>Effacer</Text>
        </Pressable>
      </View>
      {notifications.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Muted>Aucune notification</Muted>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(n) => n.id}
          ItemSeparatorComponent={() => <View className="h-px bg-muted" />}
          renderItem={({ item }) => (
            <View className="px-4 py-3">
              {item.title ? <Text className="font-semibold mb-0.5">{item.title}</Text> : null}
              <Text>{item.message}</Text>
              <Muted>{new Date(item.createdAt).toLocaleString()}</Muted>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}


