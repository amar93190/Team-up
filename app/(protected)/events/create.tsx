import { useEffect, useRef, useState, useMemo } from "react";
import { View, Animated, Easing, Pressable, Image, ScrollView, FlatList, Alert, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Path, Rect } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import DateTimePicker from "@react-native-community/datetimepicker";

import { Text } from "@/components/ui/text";
import { H1, Muted } from "@/components/ui/typography";
import { Input } from "@/components/ui/input";
import { listSports } from "@/lib/sports";
import { supabase } from "@/config/supabase";
import { useAuth } from "@/context/supabase-provider";
import { router } from "expo-router";

export default function CreateEventScreen() {
	const insets = useSafeAreaInsets();
    const { session } = useAuth();
    const userId = session?.user.id as string | undefined;

	// Local-only form state (no backend action here)
	const [title, setTitle] = useState("");
	const [sportId, setSportId] = useState<number | null>(null);
	const [level, setLevel] = useState<"beginner" | "intermediate" | "advanced" | "all">("all");
	const [dateValue, setDateValue] = useState<Date | null>(null);
	const [timeValue, setTimeValue] = useState<Date | null>(null);
	const [addressText, setAddressText] = useState("");
	const [capacity, setCapacity] = useState<string>("");
	const [description, setDescription] = useState("");
	const [coverUri, setCoverUri] = useState<string | null>(null);
    const [coverMime, setCoverMime] = useState<string | null>(null);
    const [coverExt, setCoverExt] = useState<string | null>(null);
    const [publishing, setPublishing] = useState<boolean>(false);
    const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
    const [showTimePicker, setShowTimePicker] = useState<boolean>(false);

    // Address autocomplete (Geoapify)
    const GEOAPIFY_API_KEY = process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY as string | undefined;
    const [addressQuery, setAddressQuery] = useState<string>("");
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [nearbyPlaces, setNearbyPlaces] = useState<any[]>([]);
    const [loadingPlaces, setLoadingPlaces] = useState(false);
    useEffect(() => {
        let active = true;
        const q = addressQuery.trim();
        if (!GEOAPIFY_API_KEY || q.length < 3) {
            setSuggestions([]);
            return;
        }
        const controller = new AbortController();
        (async () => {
            try {
                const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(q)}&limit=6&lang=fr&apiKey=${GEOAPIFY_API_KEY}`;
                const res = await fetch(url, { signal: controller.signal });
                const json = await res.json();
                if (!active) return;
                setSuggestions(json?.features ?? []);
            } catch { /* ignore */ }
        })();
        return () => { active = false; controller.abort(); };
    }, [addressQuery, GEOAPIFY_API_KEY]);
    const [placeId, setPlaceId] = useState<string | null>(null);
    const [latitude, setLatitude] = useState<number | null>(null);
    const [longitude, setLongitude] = useState<number | null>(null);
    const [isPublicPlace, setIsPublicPlace] = useState<boolean>(false);

	const [sports, setSports] = useState<{ id: number; name: string; emoji?: string }[]>([]);
	useEffect(() => {
		(async () => {
			try {
				const ss = await listSports();
				setSports(ss);
			} catch {
				// ignore if fetch fails; this is a UI-only screen
			}
		})();
	}, []);

	// Steps: 0 Intro; 1 Base (titre+description); 2 Sport/Niveau; 3 Date/heure; 4 Lieu; 5 Détails; 6 Visuel & résumé
	const [step, setStep] = useState<number>(0);
	const totalSteps = 6;
	function handleNext() { setStep((s) => Math.min(totalSteps, s + 1)); }
	function handleBack() { setStep((s) => Math.max(0, s - 1)); }

	// Slide-fade transitions
	const transition = useRef(new Animated.Value(1)).current;
	useEffect(() => {
		transition.setValue(0);
		Animated.timing(transition, {
			toValue: 1,
			duration: 280,
			easing: Easing.out(Easing.cubic),
			useNativeDriver: true,
		}).start();
	}, [step]);
	const enterStyle = {
		opacity: transition,
		transform: [
			{ translateX: transition.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
			{ translateY: transition.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) },
		],
	} as any;

	// Reusable bottom wave (same shape as sign-up/onboarding)
	function BottomWave() {
		return (
			<Svg width="100%" height="100%" viewBox="0 0 400 200" preserveAspectRatio="none" style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>
				<Defs>
					<SvgLinearGradient id="eventCreateGrad" x1="0" y1="0" x2="1" y2="1">
						<Stop offset="0%" stopColor="#F59E0B" />
						<Stop offset="33%" stopColor="#10B981" />
						<Stop offset="66%" stopColor="#06B6D4" />
						<Stop offset="100%" stopColor="#3B82F6" />
					</SvgLinearGradient>
				</Defs>
				<Path d="M0 0 H400 V120 C320 180 150 110 0 160 Z" fill="url(#eventCreateGrad)" transform="translate(0,200) scale(1,-1)" />
			</Svg>
		);
	}

	// Simple gradient chip for sports
	function SportChip({ id, label, selected }: { id: number; label: string; selected: boolean }) {
		const colors = ["#F59E0B", "#10B981", "#06B6D4", "#3B82F6"] as [string, string, string, string];
		return selected ? (
			<LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 9999 }}>
				<Pressable className="px-5 py-3 rounded-full" onPress={() => setSportId(null)}>
					<Text className="text-white text-base">{label}</Text>
				</Pressable>
			</LinearGradient>
		) : (
			<LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 9999, padding: 1 }}>
				<Pressable className="px-5 py-3 rounded-full" style={{ backgroundColor: "white" }} onPress={() => setSportId(id)}>
					<Text className="text-foreground text-base">{label}</Text>
				</Pressable>
			</LinearGradient>
		);
	}

	// Level segmented (simple underline variant)
	function LevelTabs() {
		const items: { key: any; label: string }[] = [
			{ key: "beginner", label: "Débutant" },
			{ key: "intermediate", label: "Intermédiaire" },
			{ key: "advanced", label: "Avancé" },
			{ key: "all", label: "Tous" },
		];
		return (
			<View className="flex-row w-11/12 self-center">
				{items.map((it) => (
					<Pressable key={it.key} className="flex-1 items-center py-2" onPress={() => setLevel(it.key)} style={{ borderBottomWidth: 2, borderBottomColor: level === it.key ? "#000" : "transparent" }}>
						<Text className="text-sm" style={{ color: level === it.key ? "#111827" : "#6B7280" }}>{it.label}</Text>
					</Pressable>
				))}
			</View>
		);
	}

	function categoriesForSportName(name?: string): string {
    const n = (name ?? "").toLowerCase();
    // Geoapify categories joined by |
    if (n.includes("foot")) return "sport.soccer|sport.stadium|sport.pitch|leisure.park";
    if (n.includes("basket")) return "sport.basketball|sport.pitch|leisure.park";
    if (n.includes("tennis")) return "sport.tennis";
    if (n.includes("natation") || n.includes("swim")) return "sport.swimming_pool";
    if (n.includes("run") || n.includes("course")) return "sport.track|leisure.park";
    if (n.includes("fitness") || n.includes("gym")) return "sport.gym|leisure.fitness_station";
    if (n.includes("yoga")) return "sport.gym";
    if (n.includes("badminton")) return "sport.badminton|sport.pitch";
    if (n.includes("volley")) return "sport.volleyball|sport.pitch";
    if (n.includes("rugby")) return "sport.rugby|sport.pitch";
    // Generic multi-sport fallback
    return "sport.pitch|sport.stadium|sport.track|sport.tennis|sport.basketball|sport.swimming_pool|leisure.park|leisure.fitness_station";
  }

  const selectedSportName = useMemo(() => {
    const s = sports.find((x) => x.id === sportId);
    return s?.name;
  }, [sports, sportId]);

  // Fetch nearby public places when we have coordinates (from address selection or manual) or when sport changes
  useEffect(() => {
    if (!GEOAPIFY_API_KEY) return;
    if (latitude == null || longitude == null) {
      setNearbyPlaces([]);
      return;
    }
    const cats = categoriesForSportName(selectedSportName);
    const radius = 4000; // 4km
    const url = `https://api.geoapify.com/v2/places?categories=${encodeURIComponent(cats)}&filter=circle:${longitude},${latitude},${radius}&bias=proximity:${longitude},${latitude}&limit=60&apiKey=${GEOAPIFY_API_KEY}`;
    let active = true;
    setLoadingPlaces(true);
    (async () => {
      try {
        const res = await fetch(url);
        const json = await res.json();
        if (!active) return;
        setNearbyPlaces(Array.isArray(json?.features) ? json.features : []);
      } catch {
        if (active) setNearbyPlaces([]);
      } finally {
        if (active) setLoadingPlaces(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [latitude, longitude, selectedSportName, GEOAPIFY_API_KEY]);

	// Helpers: image picking, time combine, and publish logic
	async function pickCover() {
		const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
		if (status !== 'granted') return;
		const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [16, 9], quality: 0.9 });
		if (result.canceled) return;
		const asset: any = result.assets?.[0];
		if (!asset) return;
		setCoverUri(asset.uri);
		const mime = asset.mimeType ?? 'image/jpeg';
		setCoverMime(mime);
		const name = asset.fileName as string | undefined;
		const ext = name?.split('.').pop()?.toLowerCase() ?? asset.uri.split('.').pop()?.toLowerCase() ?? (mime.includes('png') ? 'png' : 'jpg');
		setCoverExt(ext);
	}

	function combineDateTime(d: Date | null, t: Date | null): string | null {
		if (!d && !t) return null;
		const base = new Date(d ?? t ?? new Date());
		if (t) {
			base.setHours(t.getHours());
			base.setMinutes(t.getMinutes());
		} else {
			// Default to midday if no time selected
			base.setHours(12);
			base.setMinutes(0);
		}
		base.setSeconds(0);
		base.setMilliseconds(0);
		return base.toISOString();
	}

	async function handlePublish() {
		if (!userId) {
			Alert.alert('Non connecté', "Tu dois être connecté pour publier.");
			return;
		}
		if (!title.trim()) {
			Alert.alert('Titre requis', 'Ajoute un titre.');
			return;
		}
		if (!sportId) {
			Alert.alert('Sport requis', 'Choisis un sport.');
			return;
		}
		setPublishing(true);
		try {
			const start_at = combineDateTime(dateValue, timeValue);
			if (!start_at) {
				Alert.alert('Date requise', 'Choisis au moins une date.');
				setPublishing(false);
				return;
			}
			const insertPayload: any = {
				owner_id: userId,
				title: title.trim(),
				description: description.trim() || null,
				level,
				start_at,
				address_text: addressText || null,
				place_id: placeId,
				latitude,
				longitude,
				capacity: capacity ? Number(capacity) : null,
				cover_url: null,
				sport_id: sportId,
			};
			const { data, error } = await supabase.from('events').insert(insertPayload).select('id').maybeSingle();
			if (error || !data?.id) {
				Alert.alert('Erreur', error?.message ?? "Impossible de publier l'événement.");
				setPublishing(false);
				return;
			}
			const eventId = data.id as string;
			if (coverUri) {
				try {
					// Convert HEIC if needed
					let uploadUri = coverUri;
					let uploadMime = coverMime ?? 'image/jpeg';
					let ext = coverExt ?? (uploadMime.includes('png') ? 'png' : 'jpg');
					if ((uploadMime && uploadMime.includes('heic')) || (ext && ext.includes('heic'))) {
						const manipulated = await manipulateAsync(coverUri, [], { compress: 0.9, format: SaveFormat.JPEG });
						uploadUri = manipulated.uri;
						uploadMime = 'image/jpeg';
						ext = 'jpg';
					}
					const filePath = `event-covers/${eventId}.${ext}`;
					const file: any = { uri: uploadUri, name: `cover.${ext}`, type: uploadMime };
					const { error: upErr } = await supabase.storage.from('public').upload(filePath, file, { contentType: uploadMime, upsert: true });
					if (!upErr) {
						const { data: pub } = supabase.storage.from('public').getPublicUrl(filePath);
						const publicUrl = pub?.publicUrl ?? null;
						if (publicUrl) await supabase.from('events').update({ cover_url: publicUrl }).eq('id', eventId);
					}
				} catch (e) { /* ignore upload error */ }
			}
			router.replace(`/(protected)/events/${eventId}`);
		} finally {
			setPublishing(false);
		}
	}

	return (
		<View className="flex-1 bg-background">
			{/* subtle page background gradient */}
			<View pointerEvents="none" style={{ position: "absolute", inset: 0, opacity: 0.16 }}>
				<LinearGradient colors={["#F59E0B", "#10B981", "#06B6D4", "#3B82F6"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }} />
			</View>

			<ScrollView className="flex-1" contentContainerClassName={step === 0 ? "pb-0" : "pb-28"}>
				<View className="p-4 gap-y-4">
					{step === 0 ? (
						<Animated.View className="flex-1" style={{ minHeight: 520, ...(enterStyle as object) }}>
							<View className="items-center justify-center flex-1">
								<H1 className="text-center">Créer un événement</H1>
								<Muted className="text-center mt-2">Renseigne quelques informations en 5 étapes rapides.</Muted>
							</View>
						</Animated.View>
					) : (
						<Animated.View className="flex-1" style={{ minHeight: 520, ...(enterStyle as object) }}>
							{/* Step contents */}
							{step === 1 ? (
								<View className="gap-y-4 items-center" style={{ minHeight: 520, justifyContent: 'center' }}>
									<H1 className="text-center">Informations de base</H1>
									<Input className="w-11/12" placeholder="Titre de l’événement" value={title} onChangeText={setTitle} />
									<Input className="w-11/12" placeholder="Description (facultatif)" value={description} onChangeText={setDescription} />
								</View>
							) : null}

							{step === 2 ? (
								<View className="gap-y-4 items-center" style={{ minHeight: 560, justifyContent: 'center', paddingTop: Math.max(insets.top, 12) + 24 }}>
									<H1 className="text-center">Sport & niveau</H1>
									<Muted>Sport</Muted>
									<View className="w-11/12 self-center flex-row flex-wrap gap-2 justify-center">
										{(sports.length ? sports : [
											{ id: 30, name: "Football", emoji: "⚽" },
											{ id: 31, name: "Basketball", emoji: "🏀" },
											{ id: 27, name: "Course", emoji: "🏃" },
										]).map((s) => (
											<SportChip key={s.id} id={s.id} selected={sportId === s.id} label={`${s.emoji ?? ""} ${s.name}`} />
										))}
									</View>
								</View>
							) : null}

							{step === 3 ? (
								<View className="gap-y-4 items-center" style={{ minHeight: 520, justifyContent: 'center', paddingTop: Math.max(insets.top, 12) + 24 }}>
									<H1 className="text-center">Date & heure</H1>
									<Pressable className="w-11/12 rounded-md bg-card px-4 py-3" onPress={() => { setShowTimePicker(false); setShowDatePicker(true); }}>
										<Text>{dateValue ? dateValue.toLocaleDateString() : "Choisir une date"}</Text>
									</Pressable>
									{showDatePicker ? (
										<View className="w-11/12 rounded-md bg-card p-2">
											<DateTimePicker
												value={dateValue ?? new Date()}
												mode="date"
												display={Platform.OS === 'ios' ? 'inline' : 'default'}
												onChange={(event: any, selectedDate?: Date) => {
													if (selectedDate && event?.type !== 'dismissed') setDateValue(selectedDate);
													if (Platform.OS !== 'ios') setShowDatePicker(false);
												}}
											/>
											{Platform.OS === 'ios' ? (
												<Pressable className="self-end px-3 py-2" onPress={() => setShowDatePicker(false)}>
													<Text>Fermer</Text>
												</Pressable>
											) : null}
										</View>
									) : null}
									<Pressable className="w-11/12 rounded-md bg-card px-4 py-3" onPress={() => { setShowDatePicker(false); setShowTimePicker(true); }}>
										<Text>{timeValue ? timeValue.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Choisir une heure"}</Text>
									</Pressable>
									{showTimePicker ? (
										<View className="w-11/12 rounded-md bg-card p-2">
											<DateTimePicker
												value={timeValue ?? new Date()}
												mode="time"
												display={Platform.OS === 'ios' ? 'inline' : 'default'}
												onChange={(event: any, selectedDate?: Date) => {
													if (selectedDate && event?.type !== 'dismissed') setTimeValue(selectedDate);
													if (Platform.OS !== 'ios') setShowTimePicker(false);
												}}
											/>
											{Platform.OS === 'ios' ? (
												<Pressable className="self-end px-3 py-2" onPress={() => setShowTimePicker(false)}>
													<Text>Fermer</Text>
												</Pressable>
											) : null}
										</View>
									) : null}
									<Muted>Astuce: ces champs sont visuels pour l’instant.</Muted>
								</View>
							) : null}

							{step === 4 ? (
								<View className="gap-y-4 items-center" style={{ minHeight: 520, justifyContent: 'center' }}>
									<H1 className="text-center">Lieu</H1>
									<Input className="w-11/12" placeholder="Recherche d’adresse" value={addressQuery} onChangeText={setAddressQuery} />
									{suggestions.length ? (
										<View className="w-11/12 rounded-md bg-card border border-border max-h-56">
											<ScrollView>
												{suggestions.map((item, idx) => (
													<Pressable
														key={String(item?.properties?.place_id ?? item?.properties?.datasource?.raw?.osm_id ?? idx)}
														className="px-3 py-2 border-b border-border"
														onPress={() => {
															const p = item?.properties;
															const formatted = p?.formatted ?? "";
															setAddressText(formatted);
															setAddressQuery(formatted);
															setPlaceId(String(p?.place_id ?? ""));
															const lat = p?.lat ?? item?.geometry?.coordinates?.[1];
															const lon = p?.lon ?? item?.geometry?.coordinates?.[0];
															setLatitude(typeof lat === 'number' ? lat : Number(lat));
															setLongitude(typeof lon === 'number' ? lon : Number(lon));
															setIsPublicPlace(false);
															setSuggestions([]);
														}}
													>
														<Text numberOfLines={2}>{item?.properties?.formatted ?? '-'}</Text>
													</Pressable>
												))}
											</ScrollView>
										</View>
									) : null}
									{addressText ? <Muted className="w-11/12 text-center">{addressText}</Muted> : null}
									<View className="items-center mt-2">
										{ (latitude != null && longitude != null) ? (
											<View style={{ width: 320, height: 180, borderRadius: 12, overflow: 'hidden' }}>
												{Platform.OS === 'web' ? (
													(() => {
														const staticUrl = GEOAPIFY_API_KEY ? `https://maps.geoapify.com/v1/staticmap?style=osm-carto&width=640&height=360&center=lonlat:${longitude},${latitude}&zoom=14&marker=lonlat:${longitude},${latitude};type:material;color:%23ff0000&apiKey=${GEOAPIFY_API_KEY}` : null;
														return staticUrl ? <Image source={{ uri: staticUrl }} style={{ width: 320, height: 180 }} /> : <View className="w-full h-full bg-muted" />;
													})()
												) : (
													(() => {
														const RNMaps: any = require('react-native-maps');
														return (
															<RNMaps.default style={{ width: '100%', height: '100%' }} initialRegion={{ latitude: Number(latitude), longitude: Number(longitude), latitudeDelta: 0.01, longitudeDelta: 0.01 }}>
																<RNMaps.Marker coordinate={{ latitude: Number(latitude), longitude: Number(longitude) }} />
															</RNMaps.default>
														);
													})()
												)}
											</View>
										) : (
											<View className="items-center">
												<Svg width={320} height={160} viewBox="0 0 320 160">
													<Defs>
														<SvgLinearGradient id="preview" x1="0" y1="0" x2="1" y2="1">
															<Stop offset="0%" stopColor="#F59E0B" />
															<Stop offset="33%" stopColor="#10B981" />
															<Stop offset="66%" stopColor="#06B6D4" />
															<Stop offset="100%" stopColor="#3B82F6" />
														</SvgLinearGradient>
													</Defs>
													<Rect x="1" y="1" width="318" height="158" rx="12" ry="12" stroke="url(#preview)" strokeWidth="2" fill="none" strokeDasharray="6 6" />
												</Svg>
												<Muted className="mt-2">Sélectionne une adresse pour voir la carte</Muted>
											</View>
										)}
									</View>

									{/* Nearby public sport places */}
									<View className="w-11/12 self-center mt-3">
										<Muted>Lieux publics à proximité</Muted>
										{loadingPlaces ? <Muted>Recherche…</Muted> : null}
										{!loadingPlaces && nearbyPlaces.length === 0 ? (
											<Muted>Aucun lieu public trouvé dans le rayon.</Muted>
										) : null}
										<View className="mt-2 rounded-md border border-border bg-card">
											<ScrollView style={{ maxHeight: 200 }}>
												{nearbyPlaces.map((f: any, i: number) => {
													const p = f?.properties ?? {};
													const name = p.name ?? p.street ?? 'Lieu sans nom';
													const addr = p.formatted ?? p.address_line1 ?? '';
													const lat = p.lat ?? f?.geometry?.coordinates?.[1];
													const lon = p.lon ?? f?.geometry?.coordinates?.[0];
													return (
														<Pressable key={String(p.place_id ?? i)} className="px-3 py-2 border-b border-border" onPress={() => {
															setAddressText(addr);
															setAddressQuery(addr);
															setPlaceId(String(p.place_id ?? ''));
															setLatitude(Number(lat));
															setLongitude(Number(lon));
															setIsPublicPlace(true);
														}}>
															<Text numberOfLines={1}>{name}</Text>
															<Muted numberOfLines={1}>{addr}</Muted>
														</Pressable>
													);
												})}
											</ScrollView>
										</View>
										{isPublicPlace ? (
											<View className="self-start mt-2 rounded-full bg-green-600 px-3 py-1">
												<Text className="text-white text-xs">Lieu public sélectionné</Text>
											</View>
										) : null}
									</View>
								</View>
							) : null}

							{step === 5 ? (
								<View className="gap-y-4 items-center" style={{ minHeight: 520, justifyContent: 'center' }}>
									<H1 className="text-center">Détails</H1>
									<Muted>Niveau</Muted>
									<LevelTabs />
									<Input className="w-11/12" placeholder="Capacité (1 à 100)" value={capacity} onChangeText={setCapacity} keyboardType="number-pad" />
								</View>
							) : null}

							{step === 6 ? (
								<View className="gap-y-4 items-center" style={{ minHeight: 520, justifyContent: 'center' }}>
									<H1>Visuel & résumé</H1>
									<View className="items-center">
										{coverUri ? (
											<Pressable onPress={pickCover}>
												<Image source={{ uri: coverUri }} style={{ width: 320, height: 180, borderRadius: 12 }} />
											</Pressable>
										) : (
											<Pressable onPress={pickCover}>
												<Svg width={320} height={180} viewBox="0 0 320 180">
												<Defs>
													<SvgLinearGradient id="coverGrad" x1="0" y1="0" x2="1" y2="1">
														<Stop offset="0%" stopColor="#F59E0B" />
														<Stop offset="33%" stopColor="#10B981" />
														<Stop offset="66%" stopColor="#06B6D4" />
														<Stop offset="100%" stopColor="#3B82F6" />
													</SvgLinearGradient>
												</Defs>
												<Rect x="1" y="1" width="318" height="178" rx="12" ry="12" stroke="url(#coverGrad)" strokeWidth="2" fill="none" strokeDasharray="6 6" />
											</Svg>
											</Pressable>
										)}
										<Muted className="mt-2">Ajouter une image de couverture (visuel)</Muted>
									</View>
									<View className="rounded-md bg-card p-3 w-11/12">
										<Text className="font-semibold">Résumé</Text>
										<Muted>{title || "(Sans titre)"}</Muted>
										<Muted>{sportId ? `Sport #${sportId}` : "Sport non choisi"}</Muted>
										<Muted>{`Niveau: ${level}`}</Muted>
										<Muted>{dateValue && timeValue ? `${dateValue.toLocaleDateString()} • ${timeValue.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : "Date/heure non définies"}</Muted>
										<Muted>{addressText || "Adresse non définie"}</Muted>
										<Muted>{capacity ? `Capacité: ${capacity}` : "Capacité non définie"}</Muted>
										<Muted numberOfLines={2}>{description || "(Pas de description)"}</Muted>
									</View>
								</View>
							) : null}

						</Animated.View>
					)}
				</View>
			</ScrollView>

			{/* Footer overlays */}
			{step === 0 ? (
				<View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>
					<View style={{ height: 180 + insets.bottom, position: "relative" }}>
						<BottomWave />
						<View style={{ position: "absolute", right: 16, bottom: Math.max(insets.bottom, 12) }}>
							<Pressable accessibilityRole="button" onPress={handleNext} className="flex-row items-center rounded-full bg-white px-5 h-14">
								<Text className="mr-2">Commencer</Text>
								<Ionicons name="chevron-forward" size={24} color="#111827" />
							</Pressable>
						</View>
					</View>
				</View>
			) : (
				<View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>
					<View style={{ height: 180 + insets.bottom, position: "relative" }}>
						<BottomWave />
						{/* Back */}
						<View style={{ position: "absolute", left: 16, bottom: Math.max(insets.bottom, 12) }}>
							<Pressable accessibilityRole="button" onPress={handleBack} className="flex-row items-center rounded-full bg-white px-5 h-14">
								<Ionicons name="chevron-back" size={24} color="#111827" />
								<Text className="ml-2">Retour</Text>
							</Pressable>
						</View>
						{/* Next / Publish */}
						<View style={{ position: "absolute", right: 16, bottom: Math.max(insets.bottom, 12) }}>
							<Pressable accessibilityRole="button" onPress={step < totalSteps ? handleNext : handlePublish} className="flex-row items-center rounded-full bg-white px-5 h-14">
								<Text className="mr-2">{step < totalSteps ? "Suivant" : (publishing ? "Publication…" : "Publier")}</Text>
								<Ionicons name="chevron-forward" size={24} color="#111827" />
							</Pressable>
						</View>
					</View>
				</View>
			)}
		</View>
	);
}