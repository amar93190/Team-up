import { Image, ScrollView, View, Pressable, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop, Path } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { H1, Muted } from "@/components/ui/typography";
import { useAuth } from "@/context/supabase-provider";
import { useEffect, useState, useCallback } from "react";
import { getProfile } from "@/lib/profiles";
import { listFavoriteEvents } from "@/lib/favorites";
import { supabase } from "@/config/supabase";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { uploadUserMedia, listUserMedia, UserMedia } from "@/lib/media";
import { Video, ResizeMode } from "expo-av";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ProfileScreen() {
	const { signOut, session } = useAuth();
	const userId = session?.user.id as string;
	const [profile, setProfile] = useState<any>(null);
	const [sports, setSports] = useState<string[]>([]);
	const [regionName, setRegionName] = useState<string | null>(null);
	const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
	const [myEvents, setMyEvents] = useState<any[]>([]);
	const [activeTab, setActiveTab] = useState<'events' | 'media' | 'favorites'>('events');
	const [favoriteEvents, setFavoriteEvents] = useState<any[]>([]);
	const router = useRouter();
	const [media, setMedia] = useState<UserMedia[]>([]);
	const [viewerOpen, setViewerOpen] = useState(false);
	const [viewerItem, setViewerItem] = useState<UserMedia | null>(null);
	const insets = useSafeAreaInsets();

	async function pickAndUpload() {
		try {
			const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
			if (status !== 'granted') return;
			const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All, allowsEditing: false, quality: 0.85 });
			if (res.canceled) return;
			const asset = res.assets[0];
			const mime = (asset as any).mimeType || (asset.type === 'video' ? 'video/mp4' : 'image/jpeg');
			const uploaded = await uploadUserMedia(userId, asset.uri, mime);
			if (uploaded) setMedia((prev) => [uploaded, ...prev]);
		} catch {}
	}

	// Fonction pour recharger toutes les données du profil
	const reloadProfileData = async () => {
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
			.order("start_at", { ascending: true });
		{
			const data = ev.data ?? [];
			const now = Date.now();
			const withDate = data.filter((e: any) => !!e.start_at);
			const noDate = data.filter((e: any) => !e.start_at);
			const upcoming = withDate
				.filter((e: any) => new Date(e.start_at).getTime() >= now)
				.sort((a: any, b: any) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
			const past = withDate
				.filter((e: any) => new Date(e.start_at).getTime() < now)
				.sort((a: any, b: any) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
			setMyEvents([...upcoming, ...noDate, ...past]);
		}
		const favs = await listFavoriteEvents(userId);
		setFavoriteEvents(favs);
		const mm = await listUserMedia(userId);
		setMedia(mm);
	};

	useEffect(() => {
		reloadProfileData();
	}, [userId]);

	// Recharger les données quand l'utilisateur revient sur cette page
	useFocusEffect(
		useCallback(() => {
			reloadProfileData();
		}, [userId])
	);

	return (
		<SafeAreaView className="flex-1 bg-background" edges={["top","bottom"]}>
			{/* subtle full-page rainbow gradient */}
			<LinearGradient
				colors={["#F59E0B", "#10B981", "#06B6D4", "#3B82F6"]}
				start={{ x: 0, y: 0 }}
				end={{ x: 1, y: 1 }}
				style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.16 }}
				pointerEvents="none"
			/>
			{/* Settings gear button */}
			<View style={{ position: 'absolute', top: Math.max(insets.top + 8, 20), right: 16, zIndex: 5 }}>
				<Pressable accessibilityRole="button" className="h-10 w-10 items-center justify-center rounded-full bg-white/80" onPress={() => router.push('/(protected)/settings')}>
					<Ionicons name="settings" size={18} />
				</Pressable>
			</View>
			{/* Edit pencil button */}
			<View style={{ position: 'absolute', top: Math.max(insets.top + 8, 20), left: 16, zIndex: 5 }}>
				<Pressable accessibilityRole="button" className="h-10 w-10 items-center justify-center rounded-full bg-white/80" onPress={() => router.push('/(protected)/profile-edit')}>
					<Ionicons name="pencil" size={18} />
				</Pressable>
			</View>

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
					</View>

					{/* Tab content */}
					<View className="p-4 gap-y-6">
						{activeTab === 'events' ? (
							<View className="gap-y-3">
								<Muted>Mes événements</Muted>
								<View className="flex-row flex-wrap justify-between gap-y-4">
									{myEvents.map((e) => {
										const isPast = e?.start_at ? new Date(e.start_at).getTime() < Date.now() : false;
										return (
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
												{isPast ? (
													<View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
														<View style={{ width: '100%', backgroundColor: 'rgba(244,63,94,0.95)', paddingVertical: 10 }}>
															<Text className="text-white text-center text-base font-semibold">TERMINÉ</Text>
														</View>
													</View>
												) : null}
											</View>
											<View className="p-2">
												<Text className="text-sm font-medium" numberOfLines={1}>{e.title}</Text>
											</View>
										</Pressable>
									);
									})}
								</View>
							</View>
						) : activeTab === 'media' ? (
							<View className="gap-3">
								<View className="flex-row items-center justify-between">
									<Muted>Médias</Muted>
									<Pressable onPress={pickAndUpload} className="rounded-full bg-primary px-4 py-2">
										<Text className="text-primary-foreground">Ajouter</Text>
									</Pressable>
								</View>
								<View className="flex-row flex-wrap justify-between gap-y-3">
									{media.map((m) => (
										<Pressable key={m.id} style={{ width: '32%' }} className="aspect-square bg-muted rounded-md overflow-hidden" onPress={() => { setViewerItem(m); setViewerOpen(true); }}>
											{m.kind === 'image' ? (
												<Image source={{ uri: m.url }} style={{ width: '100%', height: '100%' }} />
											) : (
												<View className="w-full h-full items-center justify-center bg-black">
													<Ionicons name="play" size={28} color="white" />
												</View>
											)}
										</Pressable>
									))}
									{media.length === 0 ? (
										<View style={{ width: '100%' }} className="items-center py-8">
											<Text>Pas de média pour le moment</Text>
											<Muted>Ajoute une photo ou une vidéo</Muted>
										</View>
									) : null}
								</View>
							</View>
						) : (
							<View className="gap-y-3">
								<Muted>Favoris</Muted>
								{favoriteEvents.length ? (
									<View className="flex-row flex-wrap justify-between gap-y-4">
										{favoriteEvents.map((e) => (
											<Pressable
												key={e.id}
												style={{ width: '48%' }}
												className="rounded-md overflow-hidden bg-card border border-border"
												onPress={() => router.push(`/(protected)/events/${e.id}`)}
											>
												<View className="w-full" style={{ height: 160 }}>
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
								) : (
									<View className="items-center py-8">
										<Text>Pas de favoris pour le moment</Text>
										<Muted>Ajoute des favoris bientôt</Muted>
									</View>
								)}
							</View>
						)}
					</View>
				</View>
			</ScrollView>
		{/* Media viewer modal */}
		<Modal visible={viewerOpen} transparent animationType="fade" onRequestClose={() => { setViewerOpen(false); setViewerItem(null); }}>
			<Pressable onPress={() => { setViewerOpen(false); setViewerItem(null); }} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', alignItems: 'center', justifyContent: 'center' }}>
				<View style={{ width: '92%', height: '72%' }}>
					{viewerItem?.kind === 'image' ? (
						<Image source={{ uri: viewerItem.url }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
					) : viewerItem?.kind === 'video' ? (
						<Video
							source={{ uri: viewerItem.url }}
							style={{ width: '100%', height: '100%' }}
							useNativeControls
							shouldPlay
							resizeMode={ResizeMode.CONTAIN}
						/>
					) : null}
				</View>
			</Pressable>
		</Modal>
	</SafeAreaView>
	);
}
 

