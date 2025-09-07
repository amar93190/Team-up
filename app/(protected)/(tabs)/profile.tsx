import { Image, ScrollView, View, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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
		<SafeAreaView className="flex-1 bg-background">
			<ScrollView className="flex-1">
				<View className="p-4 gap-y-6">
					<H1 className="text-center">Profil</H1>
					<View className="items-center gap-y-3">
						<View className="h-28 w-28 rounded-full border border-border items-center justify-center overflow-hidden bg-muted">
							{avatarUrl ? (
								<Image source={{ uri: avatarUrl }} style={{ width: 112, height: 112, borderRadius: 56 }} />
							) : null}
						</View>
						<View className="items-center">
							<Text className="text-xl">
								{profile?.first_name ?? "-"} {profile?.last_name ?? ""}
							</Text>
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
						<View className="flex-row justify-between">
							<Muted>Âge</Muted>
							<Text>{profile?.age ?? "-"}</Text>
						</View>
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

					<View className="gap-y-2">
						<Muted>Mes événements</Muted>
						<View className="gap-y-3">
							{myEvents.map((e) => (
								<Pressable key={e.id} className="rounded-lg border border-border bg-card overflow-hidden" onPress={() => router.push(`/(protected)/events/${e.id}`)}>
									{e.cover_url ? (
										<Image source={{ uri: e.cover_url }} style={{ width: "100%", height: 120 }} />
									) : null}
									<View className="p-3 gap-y-1">
										<Text>{e.title}</Text>
									</View>
								</Pressable>
							))}
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


