import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Image, Pressable, View, ScrollView } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Path } from "react-native-svg";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { H1, Muted } from "@/components/ui/typography";
import { useAuth } from "@/context/supabase-provider";
import { getProfile, isProfileIncomplete } from "@/lib/profiles";
import { supabase } from "@/config/supabase";
import { useToast } from "@/components/ui/toast";
import { useNotificationCenter } from "@/context/notification-center";
import { registerForPushNotificationsAsync, savePushToken } from "@/lib/push";
import { listFavoriteEventIds, toggleEventFavorite } from "@/lib/favorites";

export default function Home() {
    const { session } = useAuth();
    const toast = useToast();
    const { unreadCount, add, markAllRead } = useNotificationCenter();
    const [checkedProfile, setCheckedProfile] = useState(false);
    const [events, setEvents] = useState<any[]>([]);
    const insets = useSafeAreaInsets();
    const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

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
                    const favIds = await listFavoriteEventIds(userId);
                    setFavoriteIds(favIds);
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
    // Split events into non-overlapping groups
    const firstCount = 6;
    const secondCount = 8;
    const section1 = events.slice(0, firstCount);
    const section2 = events.slice(firstCount, firstCount + secondCount);
    const section3 = events.slice(firstCount + secondCount);
    // Fallback client-side sort by start_at if needed
    const sortWithPastLast = (arr: any[]) => {
        const now = Date.now();
        const withDate = arr.filter((e) => e.start_at);
        const noDate = arr.filter((e) => !e.start_at);
        const upcoming = withDate.filter((e) => new Date(e.start_at).getTime() >= now).sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
        const past = withDate.filter((e) => new Date(e.start_at).getTime() < now).sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
        arr.splice(0, arr.length, ...upcoming, ...noDate, ...past);
    };
    [section1, section2, section3].forEach(sortWithPastLast);

    const headerTop = Math.max(insets.top + 8, 20);

    return (
        <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
            {/* Subtle full-page gradient background */}
            <View
                pointerEvents="none"
                style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.16, zIndex: 0 }}
           >
                <LinearGradient
                    colors={["#F59E0B", "#10B981", "#06B6D4", "#3B82F6"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ flex: 1 }}
                />
            </View>

            {/* Fixed actions bar */}
            <View style={{ position: "absolute", top: headerTop, right: 16, zIndex: 5 }} className="flex-row gap-x-2">
                <Pressable
                    accessibilityRole="button"
                    className="h-10 w-10 items-center justify-center rounded-full bg-white/80 relative"
                    onPress={() => {
                        if (unreadCount > 0) {
                            const s = unreadCount > 1 ? 'notifications' : 'notification';
                            toast.show(`${unreadCount} ${s} non lues`, 'Notifications');
                            markAllRead();
                        } else {
                            toast.show('Aucune nouvelle notification');
                        }
                    }}
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

            <ScrollView className="flex-1" style={{ position: "relative", zIndex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
                {/* Wave header */}
                <View style={{ height: 180, marginBottom: 8, position: "relative" }}>
                    <Svg width="100%" height="100%" viewBox="0 0 400 200" preserveAspectRatio="none">
                        <Defs>
                            <SvgLinearGradient id="homeGrad" x1="0" y1="0" x2="1" y2="1">
                                <Stop offset="0%" stopColor="#F59E0B" />
                                <Stop offset="33%" stopColor="#10B981" />
                                <Stop offset="66%" stopColor="#06B6D4" />
                                <Stop offset="100%" stopColor="#3B82F6" />
                            </SvgLinearGradient>
                        </Defs>
                        <Path d="M0 0 H400 V120 C320 180 150 110 0 160 Z" fill="url(#homeGrad)" />
                    </Svg>
                    <View className="absolute left-4" style={{ top: headerTop }}>
                        <H1 className="text-white">Événements</H1>
                    </View>
                </View>

                <View className="p-4 pt-0 gap-y-6">
                    {/* Section 1: grid 2x2 with horizontal scroll (6 items) */}
                    <View className="gap-y-3">
                        <Text className="text-base font-semibold">Nouveaux événements</Text>
                        {(() => {
                            const cols = Array.from({ length: Math.ceil(section1.length / 2) }, (_, i) => section1.slice(i * 2, i * 2 + 2));
                            return (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                                    {cols.map((col, idx) => (
                                        <View key={idx} style={{ width: 260 }} className="gap-y-3">
                                            {col.map((e) => (
                                                <Pressable
                                                    key={e.id}
                                                    className="rounded-lg bg-card overflow-hidden"
                                                    onPress={() => router.push(`/(protected)/events/${e.id}`)}
                                                >
                                                    {e.cover_url ? (
                                                        <Image source={{ uri: e.cover_url }} style={{ width: '100%', height: 150 }} />
                                                    ) : (
                                                        <View className="h-36 bg-muted" />
                                                    )}
                                                    <Pressable
                                                        onPress={async () => {
                                                            const userId = session?.user.id;
                                                            if (!userId) return;
                                                            const newState = await toggleEventFavorite(userId, String(e.id));
                                                            setFavoriteIds((prev) => {
                                                                const key = String(e.id);
                                                                const has = prev.includes(key);
                                                                if (newState && !has) return [...prev, key];
                                                                if (!newState && has) return prev.filter((id) => id !== key);
                                                                return prev;
                                                            });
                                                        }}
                                                        className="absolute top-2 right-2 h-9 w-9 items-center justify-center rounded-full bg-white/90"
                                                    >
                                                        <Ionicons name={favoriteIds.includes(String(e.id)) ? "heart" : "heart-outline"} size={18} color={favoriteIds.includes(String(e.id)) ? "#EF4444" : "#111827"} />
                                                    </Pressable>
                                                    <View className="p-2 gap-y-0.5">
                                                        <Text className="text-sm" numberOfLines={1}>{e.title}</Text>
                                                        <Muted className="text-xs">{e.address_text ?? ''}</Muted>
                                                    </View>
                                                </Pressable>
                                            ))}
                                        </View>
                                    ))}
                                </ScrollView>
                            );
                        })()}
                    </View>

                    {/* Section 2: gradient band with 1x1 image-only cards */}
                    <View className="gap-y-3">
                        <Text className="text-base font-semibold">Suggestions pour vous</Text>
                        <LinearGradient
                            colors={["#F59E0B", "#10B981", "#06B6D4", "#3B82F6"]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={{ paddingVertical: 20, marginHorizontal: -16 }}
                        >
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, gap: 16 }}
                            >
                                {section2.map((e) => (
                                    <Pressable
                                        key={e.id}
                                        className="rounded-lg bg-card overflow-hidden"
                                        style={{ width: 190 }}
                                        onPress={() => router.push(`/(protected)/events/${e.id}`)}
                                    >
                                        {e.cover_url ? (
                                            <Image source={{ uri: e.cover_url }} style={{ width: '100%', height: 190 }} />
                                        ) : (
                                            <View className="bg-muted" style={{ width: '100%', height: 190 }} />
                                        )}
                                        <Pressable
                                            onPress={async () => {
                                                const userId = session?.user.id;
                                                if (!userId) return;
                                                const newState = await toggleEventFavorite(userId, String(e.id));
                                                setFavoriteIds((prev) => {
                                                    const key = String(e.id);
                                                    const has = prev.includes(key);
                                                    if (newState && !has) return [...prev, key];
                                                    if (!newState && has) return prev.filter((id) => id !== key);
                                                    return prev;
                                                });
                                            }}
                                            className="absolute top-2 right-2 h-9 w-9 items-center justify-center rounded-full bg-white/90"
                                        >
                                            <Ionicons name={favoriteIds.includes(String(e.id)) ? "heart" : "heart-outline"} size={18} color={favoriteIds.includes(String(e.id)) ? "#EF4444" : "#111827"} />
                                        </Pressable>
                                        <View className="p-2 gap-y-0.5">
                                            <Text numberOfLines={1}>{e.title}</Text>
                                            <Muted className="text-xs" numberOfLines={1}>{e.address_text ?? ''}</Muted>
                                        </View>
                                    </Pressable>
                                ))}
                            </ScrollView>
                        </LinearGradient>
                    </View>

                    {/* Section 3: large list below */}
                    <View className="gap-y-3">
                        <Text className="text-base font-semibold">Tous les événements</Text>
                        {section3.map((e) => (
                            <Pressable key={e.id} className="rounded-none border border-border bg-card overflow-hidden" onPress={() => router.push(`/(protected)/events/${e.id}`)}>
                                {e.cover_url ? (
                                    <View style={{ position: 'relative' }}>
                                        <Image source={{ uri: e.cover_url }} style={{ width: '100%', height: 200 }} />
                                        {typeof e.capacity === 'number' ? (
                                            <View className="absolute top-2 right-2 rounded-full bg-primary px-2 py-1">
                                                <Text className="text-primary-foreground text-xs">{e.capacity} pers.</Text>
                                            </View>
                                        ) : null}
                                        <Pressable
                                            onPress={async () => {
                                                const userId = session?.user.id;
                                                if (!userId) return;
                                                const newState = await toggleEventFavorite(userId, String(e.id));
                                                setFavoriteIds((prev) => {
                                                    const key = String(e.id);
                                                    const has = prev.includes(key);
                                                    if (newState && !has) return [...prev, key];
                                                    if (!newState && has) return prev.filter((id) => id !== key);
                                                    return prev;
                                                });
                                            }}
                                            className="absolute top-2 left-2 h-9 w-9 items-center justify-center rounded-full bg-white/90"
                                        >
                                            <Ionicons name={favoriteIds.includes(String(e.id)) ? "heart" : "heart-outline"} size={18} color={favoriteIds.includes(String(e.id)) ? "#EF4444" : "#111827"} />
                                        </Pressable>
                                    </View>
                                ) : (
                                    <View className="h-52 bg-muted" />
                                )}
                                <View className="p-3 gap-y-1">
                                    <Text className="text-lg">{e.title}</Text>
                                    <Muted>{e.address_text ?? ''}</Muted>
                                </View>
                            </Pressable>
                        ))}
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
