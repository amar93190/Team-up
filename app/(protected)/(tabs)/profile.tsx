import { Image, ScrollView, View, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop, Path } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { H1, Muted } from "@/components/ui/typography";
import { useAuth } from "@/context/supabase-provider";
import { useEffect, useState } from "react";
import { getProfile } from "@/lib/profiles";
import { supabase } from "@/config/supabase";
import { useRouter } from "expo-router";

export default function ProfileScreen() {
	const { signOut, session } = useAuth();
	const userId = session?.user.id as string;
	const [profile, setProfile] = useState<any>(null);
	const [sports, setSports] = useState<string[]>([]);
	const [regionName, setRegionName] = useState<string | null>(null);
	const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
	const [myEvents, setMyEvents] = useState<any[]>([]);
	const [activeTab, setActiveTab] = useState<'events' | 'media' | 'favorites'>('events');
	const router = useRouter();

	useEffect(() => {
		(async () => {
			if (!userId) return;
			const p = await getProfile(userId);
			setProfile(p);
			if (p?.region_id) {
				const { data: r } = await supabase
					.from("regions")
					.select("name")
					.eq("id", p.region_id)
					.maybeSingle();
				setRegionName(r?.name ?? null);
			}
			// Avatar: use stored URL or derive from storage path
			if (p?.avatar_url) setAvatarUrl(p.avatar_url);
			else {
				const { data } = supabase.storage.from("public").getPublicUrl(`avatars/${userId}.jpg`);
				if (data?.publicUrl) setAvatarUrl(data.publicUrl);
			}
			const { data } = await supabase
				.from("user_sports")
				.select("sport:sports(name,emoji)")
				.eq("user_id", userId);
			if (data) {
				setSports(
					data.map((row: any) => `${row.sport.emoji ?? ""} ${row.sport.name}`.trim()),
				);
			}
			const ev = await supabase
				.from("events")
				.select("id,title,cover_url,start_at")
				.eq("owner_id", userId)
				.order("created_at", { ascending: false });
			setMyEvents(ev.data ?? []);
		})();
	}, [userId]);

	return (
		<SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
			{/* subtle full-page rainbow gradient */}
			<LinearGradient
				colors={["#F59E0B", "#10B981", "#06B6D4", "#3B82F6"]}
				start={{ x: 0, y: 0 }}
				end={{ x: 1, y: 1 }}
				style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.16 }}
				pointerEvents="none"
			/>
			<ScrollView className="flex-1" style={{ position: "relative", zIndex: 1 }}>
				{/* Gradient header with deeper rounded bottom */}
				<View style={{ height: 180, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: "hidden", position: "relative", zIndex: 2, backgroundColor: "transparent" }}>
					<Svg width="100%" height="100%" viewBox="0 0 400 200" preserveAspectRatio="none">
						<Defs>
							<SvgLinearGradient id="profileGrad" x1="0" y1="0" x2="1" y2="1">
								<Stop offset="0%" stopColor="#F59E0B" />
								<Stop offset="33%" stopColor="#10B981" />
								<Stop offset="66%" stopColor="#06B6D4" />
								<Stop offset="100%" stopColor="#3B82F6" />
							</SvgLinearGradient>
						</Defs>
						{/* Rectangle top with very rounded bottom curve */}
						<Path d="M0 0 H400 V110 C320 240 80 240 0 110 Z" fill="url(#profileGrad)" />
					</Svg>
				</View>

				{/* Content under header (no colored container) */}
				<View className="p-4 gap-y-6">
					<View className="items-center gap-y-3" style={{ marginTop: -96 }}>
						<View className="h-40 w-40 rounded-full items-center justify-center overflow-hidden bg-muted" style={{ borderWidth: 4, borderColor: "#FFFFFF", position: "relative", zIndex: 3 }}>
							{avatarUrl ? (
								<Image source={{ uri: avatarUrl }} style={{ width: 160, height: 160, borderRadius: 80 }} />
							) : null}
						</View>
						<View className="items-center">
							<View className="flex-row items-baseline gap-x-2">
								<Text className="text-xl">
									{profile?.first_name ?? "-"} {profile?.last_name ?? ""}
								</Text>
								{typeof profile?.age === "number" ? (
									<Muted className="text-base">{profile.age} ans</Muted>
								) : null}
							</View>
							{profile?.role ? (
								<View className="mt-1 rounded-full bg-secondary px-3 py-1">
									<Text className="text-secondary-foreground text-xs">
										{profile.role === "organizer"
											? "Organisateur"
											: profile.role === "participant"
											? "Participant"
											: "Les deux"}
									</Text>
								</View>
							) : null}
							<Muted className="mt-1">{regionName ?? "Région non définie"}</Muted>
						</View>
					</View>

					<View className="rounded-lg border border-border bg-card p-4 gap-y-2">
						<View className="gap-y-2">
							<Muted>Sports</Muted>
							<View className="flex-row flex-wrap gap-2">
								{sports.length
									? sports.map((s, idx) => (
										<View key={`${s}-${idx}`} className="rounded-full border border-border bg-muted px-3 py-1">
											<Text className="text-sm">{s}</Text>
										</View>
									))
									: <Text>-</Text>}
							</View>
						</View>
					</View>

					{/* TikTok-like segmented control + Tab content on white background */}
					<View className="bg-white" style={{ marginHorizontal: -16 }}>
						<View className="px-0">
							<View className="flex-row">
								<Pressable
									className="flex-1 items-center py-2"
									onPress={() => setActiveTab('events')}
									style={{ borderBottomWidth: 2, borderBottomColor: activeTab==='events' ? '#000' : 'transparent' }}
								>
									<Ionicons name="calendar" size={20} color={activeTab==='events' ? '#111827' : '#6B7280'} />
								</Pressable>
								<Pressable
									className="flex-1 items-center py-2"
									onPress={() => setActiveTab('media')}
									style={{ borderBottomWidth: 2, borderBottomColor: activeTab==='media' ? '#000' : 'transparent' }}
								>
									<Ionicons name="images" size={20} color={activeTab==='media' ? '#111827' : '#6B7280'} />
								</Pressable>
								<Pressable
									className="flex-1 items-center py-2"
									onPress={() => setActiveTab('favorites')}
									style={{ borderBottomWidth: 2, borderBottomColor: activeTab==='favorites' ? '#000' : 'transparent' }}
								>
									<Ionicons name="heart" size={20} color={activeTab==='favorites' ? '#111827' : '#6B7280'} />
								</Pressable>
							</View>
						</View>

						{/* Tab content */}
						<View className="p-4 gap-y-6">
							{activeTab === 'events' ? (
								<View className="gap-y-3">
									<Muted>Mes événements</Muted>
									<View className="flex-row flex-wrap justify-between gap-y-4">
										{myEvents.map((e) => (
											<Pressable
												key={e.id}
												style={{ width: '32%' }}
												className="rounded-md overflow-hidden bg-card border border-border"
												onPress={() => router.push(`/(protected)/events/${e.id}`)}
											>
												<View className="w-full" style={{ height: 200 }}>
													{e.cover_url ? (
														<Image source={{ uri: e.cover_url }} style={{ width: '100%', height: '100%' }} />
													) : (
														<View className="w-full h-full bg-muted" />
													)}
												</View>
												<View className="p-2">
													<Text className="text-sm font-medium" numberOfLines={1}>{e.title}</Text>
												</View>
											</Pressable>
										))}
									</View>
								</View>
							) : activeTab === 'media' ? (
								<View className="gap-3">
									<Muted>Médias</Muted>
									<View className="flex-row flex-wrap justify-between gap-y-3">
										{Array.from({ length: 9 }).map((_, i) => (
											<View key={i} style={{ width: '32%' }} className="aspect-square bg-muted rounded-md" />
										))}
									</View>
									<Muted>À venir…</Muted>
								</View>
							) : (
								<View className="items-center py-8">
									<Text>Pas de favoris pour le moment</Text>
									<Muted>Ajoute des favoris bientôt</Muted>
								</View>
							)}
						</View>
					</View>

					<Button className="m-4" variant="default" onPress={async () => {
						await signOut();
					}}>
						<Text>Se déconnecter</Text>
					</Button>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}


