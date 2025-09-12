import { Image, Pressable, ScrollView, View } from "react-native";
import { Modal } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { H1, Muted } from "@/components/ui/typography";
import { useAuth } from "@/context/supabase-provider";
import { supabase } from "@/config/supabase";
import { useToast } from "@/components/ui/toast";
import { Input } from "@/components/ui/input";
import { createTeam, listMyTeams, listTeamMemberProfiles, joinTeamByCode } from "@/lib/teams";
import * as Clipboard from "expo-clipboard";

export default function EventsScreen() {
	const { session } = useAuth();
	const toast = useToast();
	const userId = session?.user.id as string | undefined;
	const [pendingEvents, setPendingEvents] = useState<any[]>([]);
	const [approvedEvents, setApprovedEvents] = useState<any[]>([]);
	const [ownedEvents, setOwnedEvents] = useState<any[]>([]);
	const [myTeams, setMyTeams] = useState<any[]>([]);
	const [teamModalOpen, setTeamModalOpen] = useState(false);
	const [teamModal, setTeamModal] = useState<{ id: string; name: string; invite_code: string } | null>(null);
	const [teamMembers, setTeamMembers] = useState<any[]>([]);
	const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'owned'>('pending');
	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
	const [selectedEventName, setSelectedEventName] = useState("");
	const [teamName, setTeamName] = useState("");
	const [teamSize, setTeamSize] = useState("");
	const [creating, setCreating] = useState(false);
	const [isJoinOpen, setIsJoinOpen] = useState(false);
	const [joinCode, setJoinCode] = useState("");
	const [joining, setJoining] = useState(false);
	const [isEventPickerOpen, setIsEventPickerOpen] = useState(false);

	useEffect(() => {
		(async () => {
			if (!userId) return;
			const rr = await supabase
				.from("event_registrations")
				.select("event_id,status,created_at")
				.eq("user_id", userId)
				.order("created_at", { ascending: false });
			const rows = rr.data ?? [];
			let pendingIds: (string | number)[] = [];
			let approvedIds: (string | number)[] = [];
			if (!rr.error) {
				pendingIds = rows.filter((r: any) => r.status === "pending").map((r: any) => r.event_id);
				approvedIds = rows.filter((r: any) => r.status === "approved").map((r: any) => r.event_id);
				if (pendingIds.length === 0 && approvedIds.length === 0 && rows.length > 0) {
					approvedIds = rows.map((r: any) => r.event_id);
				}
			}
			const fetchEvents = async (ids: (string | number)[]) => {
				if (!ids.length) return [] as any[];
				const { data, error } = await supabase
					.from("events")
					.select("id,title,cover_url,start_at,address_text,capacity")
					.in("id", ids);
				if (error) return [] as any[];
				const list = (data ?? []).slice();
				list.sort((a: any, b: any) => new Date(a.start_at || 0).getTime() - new Date(b.start_at || 0).getTime());
				return list;
			};
			const [pE, aE] = await Promise.all([fetchEvents(pendingIds), fetchEvents(approvedIds)]);
			setPendingEvents(pE);
			setApprovedEvents(aE);

			const mine = await supabase
				.from("events")
				.select("id,title,cover_url,start_at,address_text,capacity")
				.eq("owner_id", userId)
				.order("start_at", { ascending: true });
			setOwnedEvents(mine.data ?? []);

			const teams = await listMyTeams(userId);
			setMyTeams(teams);
		})();
	}, [userId]);

	const creatableEvents = useMemo(() => {
		const now = Date.now();
		const ownedUpcoming = ownedEvents.filter((e) => e?.start_at ? new Date(e.start_at).getTime() >= now : true);
		const byId = new Map<string, any>();
		for (const e of approvedEvents) byId.set(String(e.id), e);
		for (const e of ownedUpcoming) byId.set(String(e.id), e);
		return Array.from(byId.values());
	}, [approvedEvents, ownedEvents]);

	const renderList = (list: any[]) => (
		list.length ? (
			<View className="gap-y-3">
				{list.map((e) => (
					<Pressable key={e.id} className="rounded-md border border-border bg-card overflow-hidden" onPress={() => router.push(`/(protected)/events/${e.id}`)}>
						{e.cover_url ? (
							<Image source={{ uri: e.cover_url }} style={{ width: '100%', height: 160 }} />
						) : (
							<View className="h-40 bg-muted" />
						)}
						<View className="p-3 gap-y-1">
							<Text className="text-lg" numberOfLines={1}>{e.title}</Text>
							<Muted numberOfLines={1}>{e.address_text ?? ''}</Muted>
						</View>
					</Pressable>
				))}
			</View>
		) : (
			<Muted>Aucun événement.</Muted>
		)
	);

	return (
		<View className="flex-1 bg-background" style={{ position: "relative" }}>
			<LinearGradient
				colors={["#F59E0B", "#10B981", "#06B6D4", "#3B82F6"]}
				start={{ x: 0, y: 0 }}
				end={{ x: 1, y: 1 }}
				style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.16 }}
				pointerEvents="none"
			/>
			<ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1 }}>
				<View style={{ alignSelf: 'center', width: '100%', maxWidth: 720, flexGrow: 1 }} className="p-4 gap-y-6 justify-center">
					<View className="items-center gap-y-2">
						<H1 className="text-center">Événements</H1>
						<Muted className="text-center">Suivi de tes inscriptions</Muted>
						<Button className="w-full" variant="default" onPress={() => router.push("/(protected)/events/create")}>
							<Text>Créer un événement</Text>
						</Button>
					</View>

					{/* Switch like profile tabs */}
					<View className="flex-row">
						<Pressable className="flex-1 items-center py-2" onPress={() => setActiveTab('pending')} style={{ borderBottomWidth: 2, borderBottomColor: activeTab==='pending' ? '#000' : 'transparent' }}>
							<Text className="text-base">En attente</Text>
						</Pressable>
						<Pressable className="flex-1 items-center py-2" onPress={() => setActiveTab('approved')} style={{ borderBottomWidth: 2, borderBottomColor: activeTab==='approved' ? '#000' : 'transparent' }}>
							<Text className="text-base">Acceptées</Text>
						</Pressable>
						<Pressable className="flex-1 items-center py-2" onPress={() => setActiveTab('owned')} style={{ borderBottomWidth: 2, borderBottomColor: activeTab==='owned' ? '#000' : 'transparent' }}>
							<Text className="text-base">Équipe</Text>
						</Pressable>
					</View>

					{activeTab === 'pending' ? (
						<View className="gap-y-3">
							<Text className="text-base font-semibold">En attente</Text>
							{renderList(pendingEvents)}
						</View>
					) : activeTab === 'approved' ? (
						<View className="gap-y-3">
							<Text className="text-base font-semibold">Acceptées</Text>
							{renderList(approvedEvents)}
						</View>
					) : (
						<View className="gap-y-3">
							<Text className="text-base font-semibold">Équipe (mes événements)</Text>
							<Button variant="secondary" onPress={() => { setSelectedEventId(null); setSelectedEventName(''); setTeamName(''); setTeamSize(''); setIsCreateOpen(true); } }>
								<Text>Créer mon équipe</Text>
							</Button>
							<Button variant="secondary" onPress={() => { setJoinCode(''); setIsJoinOpen(true); }}>
								<Text>Ajouter mon équipe</Text>
							</Button>
							{/* Mes équipes */}
							<View className="gap-y-2">
								{myTeams.map((t) => (
									<Pressable key={t.id} className="rounded-md border border-border bg-card p-3" onPress={async () => {
										setTeamModal({ id: t.id, name: t.name, invite_code: t.invite_code });
										const mem = await listTeamMemberProfiles(t.id);
										setTeamMembers(mem);
										setTeamModalOpen(true);
									}}>
										<View className="flex-row items-center justify-between">
											<View className="flex-1">
												<Text className="text-base font-medium" numberOfLines={1}>{t.name}</Text>
												<Muted>Taille: {t.size}</Muted>
												<Muted numberOfLines={1}>Code: {t.invite_code}</Muted>
											</View>
											<View className="flex-row -space-x-2">
												{teamMembers.slice(0, 3).map((m, idx) => (
													<Image key={idx} source={{ uri: m.avatar_url || undefined }} style={{ width: 28, height: 28, borderRadius: 14, marginLeft: idx === 0 ? 0 : -8 }} />
												))}
											</View>
										</View>
										<View className="mt-2">
											<Button variant="secondary" onPress={async () => {
												setTeamModal({ id: t.id, name: t.name, invite_code: t.invite_code });
												const mem = await listTeamMemberProfiles(t.id);
												setTeamMembers(mem);
												setTeamModalOpen(true);
											}}>
												<Text>Voir mon équipe</Text>
											</Button>
										</View>
									</Pressable>
								))}
								{myTeams.length === 0 ? <Muted>Aucune équipe pour le moment.</Muted> : null}
							</View>
						</View>
					)}
				</View>
			</ScrollView>
			{/* Create Team Modal */}
			<Modal visible={isCreateOpen} transparent animationType="fade" onRequestClose={() => setIsCreateOpen(false)}>
				<Pressable onPress={() => setIsCreateOpen(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
					<View onStartShouldSetResponder={() => true} className="w-full max-w-[540px] rounded-lg bg-white">
						<ScrollView style={{ maxHeight: 520 }} contentContainerStyle={{ padding: 16 }}>
							<H1 className="text-lg">Créer une équipe</H1>
							<Muted>Sélectionne un événement accepté, nom et taille de l'équipe.</Muted>
							<View className="gap-y-2 mt-2">
								<Muted>Événement</Muted>
								<View style={{ position: 'relative' }}>
								<Pressable
									onPress={() => setIsEventPickerOpen(true)}
									style={{ height: 48, borderWidth: 1, borderRadius: 6, paddingHorizontal: 12, backgroundColor: 'white' }}
									className="flex-row items-center justify-between"
								>
									<Text className="text-base">{selectedEventName || 'Choisir un événement'}</Text>
									<Ionicons name="chevron-down" size={20} color="#111827" />
								</Pressable>
								{isEventPickerOpen ? (
									<View style={{ position: 'absolute', top: 52, left: 0, right: 0, backgroundColor: 'white', borderWidth: 1, borderRadius: 6, maxHeight: 220, zIndex: 1000 }}>
										<ScrollView>
											{creatableEvents.map((e) => (
												<Pressable key={e.id} className="px-3 py-2" onPress={() => { setSelectedEventId(String(e.id)); setSelectedEventName(e.title); setIsEventPickerOpen(false); }}>
													<Text numberOfLines={1}>{e.title}</Text>
												</Pressable>
											))}
											{creatableEvents.length === 0 ? <View className="px-3 py-2"><Text>Aucun événement disponible.</Text></View> : null}
										</ScrollView>
									</View>
								) : null}
								</View>
								<Input placeholder="Nom de l'équipe" value={teamName} onChangeText={setTeamName} />
								<Input placeholder="Taille (nombre de joueurs)" keyboardType="number-pad" value={teamSize} onChangeText={setTeamSize} />
								<Button disabled={!selectedEventId || creating} onPress={async () => {
									if (!userId || !selectedEventId) return;
									if (!teamName.trim()) { alert("Nom d'équipe requis"); return; }
									const n = Number(teamSize);
									if (!Number.isFinite(n) || n <= 0) { alert("Taille d'équipe invalide"); return; }
									setCreating(true);
									const { team, error } = await createTeam({ userId, eventId: selectedEventId, name: teamName.trim(), size: n });
									setCreating(false);
									if (!team) { alert(error ?? "Échec de création"); return; }
									alert(`Équipe créée. Code: ${team.invite_code}`);
									setIsCreateOpen(false);
									setMyTeams((prev) => [team, ...prev]);
								}}>
									<Text>{creating ? 'Création...' : "Créer l'équipe"}</Text>
								</Button>
							</View>
						</ScrollView>
					</View>
				</Pressable>
			</Modal>
			{/* Team detail modal */}
			<Modal visible={teamModalOpen} transparent animationType="fade" onRequestClose={() => setTeamModalOpen(false)}>
				<Pressable onPress={() => setTeamModalOpen(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
					<View onStartShouldSetResponder={() => true} className="w-full max-w-[560px] rounded-lg bg-white">
						<ScrollView style={{ maxHeight: 520 }} contentContainerStyle={{ padding: 16 }}>
							<H1 className="text-lg">{teamModal?.name ?? 'Équipe'}</H1>
							<View className="flex-row items-center justify-between">
								<Muted>Code: {teamModal?.invite_code ?? '-'}</Muted>
								<Button variant="secondary" onPress={async () => { if (teamModal?.invite_code) { await Clipboard.setStringAsync(teamModal.invite_code); }}}>
									<Text>Copier</Text>
								</Button>
							</View>
							<View className="gap-y-2">
								{teamMembers.map((m) => (
									<View key={m.id} className="flex-row items-center gap-x-3">
										{m.avatar_url ? (
											<Image source={{ uri: m.avatar_url }} style={{ width: 40, height: 40, borderRadius: 20 }} />
										) : (
											<View style={{ width: 40, height: 40, borderRadius: 20 }} className="bg-muted" />
										)}
										<Text className="text-base">{`${m.first_name ?? ''} ${m.last_name ?? ''}`.trim() || m.id}</Text>
									</View>
								))}
								{teamMembers.length === 0 ? <Muted>Aucun membre pour le moment.</Muted> : null}
							</View>
						</ScrollView>
					</View>
				</Pressable>
			</Modal>
			{/* Join team modal */}
			<Modal visible={isJoinOpen} transparent animationType="fade" onRequestClose={() => setIsJoinOpen(false)}>
				<Pressable onPress={() => setIsJoinOpen(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
					<View onStartShouldSetResponder={() => true} className="w-full max-w-[460px] rounded-lg bg-white p-4 gap-y-3">
						<H1 className="text-lg">Ajouter mon équipe</H1>
						<Muted>Entre le code d’invitation reçu.</Muted>
						<Input placeholder="Code d'invitation" value={joinCode} onChangeText={setJoinCode} autoCapitalize="characters" />
						<Button disabled={!joinCode || joining} onPress={async () => {
							if (!userId) return;
							setJoining(true);
							const ok = await joinTeamByCode(userId, joinCode.trim());
							setJoining(false);
							if (!ok) { alert("Code invalide ou équipe complète"); return; }
							const teams = await listMyTeams(userId);
							setMyTeams(teams);
							setIsJoinOpen(false);
						}}>
							<Text>{joining ? 'Ajout...' : 'Rejoindre'}</Text>
						</Button>
					</View>
				</Pressable>
			</Modal>
		</View>
	);
}


