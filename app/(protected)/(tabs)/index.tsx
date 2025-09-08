import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Image, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { H1, Muted } from "@/components/ui/typography";
import { useAuth } from "@/context/supabase-provider";
import { getProfile, isProfileIncomplete } from "@/lib/profiles";
import { supabase } from "@/config/supabase";
import { useToast } from "@/components/ui/toast";
import { useNotificationCenter } from "@/context/notification-center";
import { registerForPushNotificationsAsync, savePushToken } from "@/lib/push";

export default function Home() {
    const { session } = useAuth();
    const toast = useToast();
    const { unreadCount, add } = useNotificationCenter();
    const [checkedProfile, setCheckedProfile] = useState(false);
    const [events, setEvents] = useState<any[]>([]);

    useEffect(() => {
        (async () => {
            const userId = session?.user.id;
            if (!userId) return;
            // Register for push token (best-effort)
            try {
                const token = await registerForPushNotificationsAsync();
                if (token) await savePushToken(userId, token);
            } catch {}
            try {
                const profile = await getProfile(userId);
                if (isProfileIncomplete(profile)) {
                    router.replace("/(protected)/onboarding");
                } else {
                    setCheckedProfile(true);
                    const { data } = await supabase
                        .from("events")
                        .select("id,title,cover_url,start_at,address_text,owner_id,capacity")
                        .neq("owner_id", userId)
                        .order("start_at", { ascending: true });
                    setEvents(data ?? []);
                }
            } catch (_e) {
                // On any read error (RLS/table missing), force onboarding
                router.replace("/(protected)/onboarding");
            }
        })();
    }, [session?.user.id]);

    // Toast when approval happens for current user
    useEffect(() => {
        const userId = session?.user.id;
        if (!userId) return;
        const channel = supabase
            .channel(`approvals:${userId}`)
            .on(
                "postgres_changes",
                { event: "UPDATE", schema: "public", table: "event_registrations", filter: `user_id=eq.${userId}` },
                (payload) => {
                    const newStatus = (payload.new as any)?.status;
                    if (newStatus === "approved") {
                        toast.show("Votre demande a été approuvée", "Inscription validée");
                        add("Votre demande a été approuvée", "Inscription validée");
                    }
                },
            )
            .subscribe();
        return () => {
            supabase.removeChannel(channel);
        };
    }, [session?.user.id]);

    if (!checkedProfile) {
        return <View className="flex-1 bg-background" />;
    }
	return (
		<SafeAreaView className="flex-1 bg-background">
			<View className="p-4 gap-y-4">
				<View className="flex-row items-center justify-between">
					<H1>Événements</H1>
					<View className="flex-row gap-x-2">
						<Pressable
							accessibilityRole="button"
							className="h-10 w-10 items-center justify-center rounded-full bg-muted relative"
							onPress={() => router.push("/(protected)/notifications")}
						>
							<Ionicons name="notifications" size={18} />
							{unreadCount > 0 ? (
								<View className="absolute -top-1 -right-1 h-5 min-w-5 rounded-full bg-primary items-center justify-center px-1">
									<Text className="text-primary-foreground text-[10px]">{unreadCount}</Text>
								</View>
							) : null}
						</Pressable>
						<Pressable
							accessibilityRole="button"
							className="h-10 w-10 items-center justify-center rounded-full bg-primary"
							onPress={() => router.push("/(protected)/chat")}
						>
							<Ionicons name="chatbubble-ellipses" size={18} color="white" />
						</Pressable>
					</View>
				</View>
				<View className="gap-y-3">
					{events.map((e) => (
						<Pressable key={e.id} className="rounded-lg border border-border bg-card overflow-hidden" onPress={() => router.push(`/(protected)/events/${e.id}`)}>
							{e.cover_url ? (
								<View style={{ position: "relative" }}>
									<Image source={{ uri: e.cover_url }} style={{ width: "100%", height: 160 }} />
									{typeof e.capacity === "number" ? (
										<View className="absolute top-2 right-2 rounded-full bg-primary px-2 py-1">
											<Text className="text-primary-foreground text-xs">{e.capacity} pers.</Text>
										</View>
									) : null}
								</View>
							) : (
								<View className="h-40 bg-muted" />
							)}
							<View className="p-3 gap-y-1">
								<Text className="text-lg">{e.title}</Text>
								<Muted>{e.address_text ?? ""}</Muted>
							</View>
						</Pressable>
					))}
				</View>
			</View>
		</SafeAreaView>
	);
}
