import { useEffect, useState } from "react";
import { Pressable, View, Image, ScrollView } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Text } from "@/components/ui/text";
import { H1, Muted } from "@/components/ui/typography";
import { supabase } from "@/config/supabase";
import { useAuth } from "@/context/supabase-provider";
// Simple formatters for UI labels
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import ButtonMultiselect, { ButtonLayout } from "react-native-button-multiselect";
import { listSports } from "@/lib/sports";

function formatDateLabel(d: Date | null) {
  if (!d) return "Choisir la date";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function formatTimeLabel(d: Date | null) {
  if (!d) return "Choisir l'heure";
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${min}`;
}

export default function CreateEvent() {
    const { session } = useAuth();
    const userId = session?.user.id as string;
    const [title, setTitle] = useState("");
    
    const [addressQuery, setAddressQuery] = useState("");
    const [addressText, setAddressText] = useState<string | null>(null);
    const [placeId, setPlaceId] = useState<string | null>(null);
    const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [suggestions, setSuggestions] = useState<Array<{ description: string; place_id: string; lat: number; lon: number }>>([]);
    const [description, setDescription] = useState("");
    const [startAt, setStartAt] = useState<Date | null>(null);
    const [showDate, setShowDate] = useState(false);
    const [showTime, setShowTime] = useState(false);
    const [level, setLevel] = useState<"beginner" | "intermediate" | "advanced" | "all">("all");
    const [capacity, setCapacity] = useState<number>(1);
    const [submitting, setSubmitting] = useState(false);
    const [coverUri, setCoverUri] = useState<string | null>(null);
    const [coverMime, setCoverMime] = useState<string | null>(null);
    const [coverExt, setCoverExt] = useState<string | null>(null);
    const [sportsButtons, setSportsButtons] = useState<{ label: string; value: string }[]>([]);
    const [selectedSport, setSelectedSport] = useState<string>("");

    const GEOAPIFY_API_KEY = process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY as string | undefined;

    useEffect(() => {
        if (!GEOAPIFY_API_KEY) return;
        const q = addressQuery.trim();
        if (q.length < 3) {
            setSuggestions([]);
            return;
        }
        const t = setTimeout(async () => {
            try {
                const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(q)}&limit=6&filter=countrycode:fr&lang=fr&apiKey=${GEOAPIFY_API_KEY}`;
                const res = await fetch(url);
                const json = await res.json();
                const feats = json?.features ?? [];
                setSuggestions(
                    feats.map((f: any) => ({
                        description: f.properties?.formatted ?? f.properties?.address_line1 ?? "",
                        place_id: String(f.properties?.place_id ?? f.properties?.datasource?.raw?.place_id ?? ""),
                        lat: f.properties?.lat ?? f.geometry?.coordinates?.[1],
                        lon: f.properties?.lon ?? f.geometry?.coordinates?.[0],
                    })),
                );
            } catch (e) {
                // eslint-disable-next-line no-console
                console.error("autocomplete error", e);
            }
        }, 300);
        return () => clearTimeout(t);
    }, [addressQuery, GEOAPIFY_API_KEY]);

    useEffect(() => {
        (async () => {
            try {
                const ss = await listSports();
                setSportsButtons(ss.map((s) => ({ label: `${s.emoji ?? ''} ${s.name}`.trim(), value: String(s.id) })));
            } catch (e) {
                // eslint-disable-next-line no-console
                console.error("sports load error", e);
            }
        })();
    }, []);

    async function selectPlace(p: { description: string; place_id: string; lat: number; lon: number }) {
        setAddressText(p.description);
        setPlaceId(p.place_id);
        setCoords({ lat: p.lat, lng: p.lon });
        setSuggestions([]);
        setAddressQuery(p.description);
    }

    async function handleCreate() {
        if (!userId) return;
        setSubmitting(true);
        try {
            const inserted = await supabase
                .from("events")
                .insert({
                    owner_id: userId,
                    title,
                    description,
                    start_at: startAt ? startAt.toISOString() : null,
                    level,
                    capacity,
                    sport_id: selectedSport ? Number(selectedSport) : null,
                    address_text: addressText,
                    place_id: placeId,
                    latitude: coords?.lat ?? null,
                    longitude: coords?.lng ?? null,
                })
                .select("id")
                .single();
            if (inserted.error) throw inserted.error;
            const eventId = inserted.data.id as string;

            if (coverUri) {
                try {
                    let uploadUri = coverUri;
                    let uploadMime = coverMime ?? "image/jpeg";
                    let ext = coverExt ?? (uploadMime.includes("png") ? "png" : uploadMime.includes("jpeg") ? "jpg" : "jpg");
                    if ((uploadMime && uploadMime.includes("heic")) || (ext && ext.includes("heic"))) {
                        const m = await manipulateAsync(coverUri, [], { compress: 0.9, format: SaveFormat.JPEG });
                        uploadUri = m.uri;
                        uploadMime = "image/jpeg";
                        ext = "jpg";
                    }
                    const path = `event-covers/${eventId}.${ext}`;
                    const file = { uri: uploadUri, name: `cover.${ext}`, type: uploadMime } as any;
                    const { error: upErr } = await supabase.storage.from("public").upload(path, file, { contentType: uploadMime, upsert: true });
                    if (!upErr) {
                        const { data: pub } = supabase.storage.from("public").getPublicUrl(path);
                        await supabase.from("events").update({ cover_url: pub.publicUrl }).eq("id", eventId);
                    }
                } catch (e) {
                    // eslint-disable-next-line no-console
                    console.error("cover upload failed", e);
                }
            }
            router.back();
        } catch (e: any) {
            // eslint-disable-next-line no-alert
            alert(e?.message ?? "Erreur lors de la création");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <ScrollView className="flex-1 bg-background">
            <View className="p-4 gap-y-4">
            <H1 className="text-center">Créer un événement</H1>
            <View className="gap-y-3">
                <Input placeholder="Titre" value={title} onChangeText={setTitle} />
                <Textarea placeholder="Description" value={description} onChangeText={setDescription} />
                <View className="gap-y-2 items-center">
                    {coverUri ? (
                        <Image source={{ uri: coverUri }} style={{ width: "100%", height: 160, borderRadius: 8 }} />
                    ) : null}
                    <Button variant="secondary" onPress={async () => {
                        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
                        if (perm.status !== "granted") return;
                        const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.9 });
                        if (!res.canceled) {
                            const asset = res.assets[0];
                            setCoverUri(asset.uri);
                            setCoverMime((asset as any).mimeType ?? null);
                            const name = (asset as any).fileName as string | undefined;
                            const ext = name?.split(".").pop()?.toLowerCase() ?? asset.uri.split(".").pop()?.toLowerCase() ?? null;
                            setCoverExt(ext);
                        }
                    }}>
                        <Text>{coverUri ? "Changer l'image de garde" : "Ajouter une image de garde"}</Text>
                    </Button>
                </View>
                <View className="flex-row gap-x-2 items-center">
                    <Button className="flex-1" variant="secondary" onPress={() => setShowDate(true)}>
                        <Text>{formatDateLabel(startAt)}</Text>
                    </Button>
                    <Button className="flex-1" variant="secondary" onPress={() => setShowTime(true)}>
                        <Text>{formatTimeLabel(startAt)}</Text>
                    </Button>
                </View>
                {showDate && (
                    <DateTimePicker
                        value={startAt ?? new Date()}
                        mode="date"
                        onChange={(_, d) => {
                            setShowDate(false);
                            if (d) {
                                const base = startAt ?? new Date();
                                const merged = new Date(d);
                                merged.setHours(base.getHours(), base.getMinutes(), 0, 0);
                                setStartAt(merged);
                            }
                        }}
                    />
                )}
                {showTime && (
                    <DateTimePicker
                        value={startAt ?? new Date()}
                        mode="time"
                        is24Hour
                        onChange={(_, d) => {
                            setShowTime(false);
                            if (d) {
                                const base = startAt ?? new Date();
                                base.setHours(d.getHours(), d.getMinutes(), 0, 0);
                                setStartAt(new Date(base));
                            }
                        }}
                    />
                )}
                <View className="gap-y-2">
                    <Muted>Niveau requis</Muted>
                    <View className="flex-row flex-wrap gap-2">
                        {[
                            { label: "Débutant", value: "beginner" },
                            { label: "Intermédiaire", value: "intermediate" },
                            { label: "Confirmé", value: "advanced" },
                            { label: "Tous niveaux", value: "all" },
                        ].map((opt) => (
                            <Pressable key={opt.value} className={`rounded-full border px-3 py-1 ${level === (opt.value as any) ? "border-primary" : "border-border"}`} onPress={() => setLevel(opt.value as any)}>
                                <Text>{opt.label}</Text>
                            </Pressable>
                        ))}
                    </View>
                </View>
                <View className="gap-y-2">
                    <Muted>Sport</Muted>
                    <ButtonMultiselect
                        layout={ButtonLayout.GRID}
                        buttons={sportsButtons}
                        selectedButtons={selectedSport as any}
                        onButtonSelected={(val: any) => setSelectedSport(val as string)}
                    />
                </View>
                <View className="gap-y-2">
                    <Muted>Nombre de personnes</Muted>
                    <View className="flex-row items-center justify-between">
                        {Array.from({ length: 8 }).map((_, idx) => {
                            const value = idx + 1;
                            const selected = value <= capacity;
                            return (
                                <Pressable
                                    key={value}
                                    onPress={() => setCapacity(value)}
                                    accessibilityRole="button"
                                >
                                    <View
                                        style={{
                                            width: 38,
                                            height: 38,
                                            borderRadius: 19,
                                            alignItems: "center",
                                            justifyContent: "center",
                                            backgroundColor: selected ? "#111827" : "#E5E7EB",
                                        }}
                                    >
                                        <MaterialCommunityIcons
                                            name="account"
                                            size={22}
                                            color={selected ? "#FFFFFF" : "#6B7280"}
                                        />
                                    </View>
                                </Pressable>
                            );
                        })}
                    </View>
                </View>
                <View className="gap-y-2">
                    <Input
                        placeholder="Adresse"
                        value={addressQuery}
                        onChangeText={setAddressQuery}
                    />
                    {suggestions.length > 0 ? (
                        <View className="rounded-md border border-border bg-card">
                            {suggestions.map((s) => (
                                <Pressable key={s.place_id} className="px-3 py-2 border-b border-border last:border-b-0" onPress={() => selectPlace(s)}>
                                    <Text>{s.description}</Text>
                                </Pressable>
                            ))}
                        </View>
                    ) : null}
                </View>
            </View>
            <Button variant="default" onPress={handleCreate} disabled={submitting}>
                <Text>Enregistrer</Text>
            </Button>
            <Muted className="text-center">(Formulaire minimal, à enrichir plus tard)</Muted>
            </View>
        </ScrollView>
    );
}


