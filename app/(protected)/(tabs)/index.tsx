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

export default function Home() {
    const { session } = useAuth();
    const [checkedProfile, setCheckedProfile] = useState(false);
    const [events, setEvents] = useState<any[]>([]);

    useEffect(() => {
        (async () => {
            const userId = session?.user.id;
            if (!userId) return;
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

    if (!checkedProfile) {
        return <View className="flex-1 bg-background" />;
    }
	return (
		<SafeAreaView className="flex-1 bg-background">
			<View className="p-4 gap-y-4">
				<View className="flex-row items-center justify-between">
					<H1>Événements</H1>
					<Pressable
						accessibilityRole="button"
						className="h-10 w-10 items-center justify-center rounded-full bg-primary"
						onPress={() => router.push("/(protected)/chat")}
					>
						<Ionicons name="chatbubble-ellipses" size={18} color="white" />
					</Pressable>
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
