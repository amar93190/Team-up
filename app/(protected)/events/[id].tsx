import { useLocalSearchParams, router } from "expo-router";
import { Image, ScrollView, View, Linking, Pressable, Alert } from "react-native";
import { useEffect, useMemo, useState } from "react";

import { Text } from "@/components/ui/text";
import { H1, Muted } from "@/components/ui/typography";
import { Button } from "@/components/ui/button";
import { supabase } from "@/config/supabase";
import { useAuth } from "@/context/supabase-provider";

export default function EventDetails() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { session } = useAuth();
    const [event, setEvent] = useState<any | null>(null);
    const [sport, setSport] = useState<{ name: string; emoji?: string } | null>(null);
    const [mapLat, setMapLat] = useState<number | null>(null);
    const [mapLon, setMapLon] = useState<number | null>(null);
    const [mapError, setMapError] = useState(false);
    const [pending, setPending] = useState<any[]>([]);
    const [decisionLoading, setDecisionLoading] = useState<string | null>(null);
    const GEOAPIFY_API_KEY = process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY as string | undefined;
    const [registrationStatus, setRegistrationStatus] = useState<"none" | "pending" | "approved">("none");

    async function loadEvent() {
        const { data } = await supabase
            .from("events")
            .select("id,title,description,cover_url,start_at,address_text,latitude,longitude,sport_id,capacity,owner_id")
            .eq("id", id)
            .maybeSingle();
        setEvent(data ?? null);
        if (data?.sport_id) {
            const s = await supabase
                .from("sports")
                .select("name,emoji")
                .eq("id", data.sport_id)
                .maybeSingle();
            if (!s.error && s.data) setSport(s.data as any);
        }
        if (data?.latitude && data?.longitude) {
            setMapLat(Number(String(data.latitude).replace(",", ".")));
            setMapLon(Number(String(data.longitude).replace(",", ".")));
        } else if (GEOAPIFY_API_KEY && data?.address_text) {
            try {
                const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(
                    data.address_text,
                )}&limit=1&lang=fr&apiKey=${GEOAPIFY_API_KEY}`;
                const res = await fetch(url);
                const json = await res.json();
                const f = json?.features?.[0];
                if (f) {
                    const lat = f.properties?.lat ?? f.geometry?.coordinates?.[1];
                    const lon = f.properties?.lon ?? f.geometry?.coordinates?.[0];
                    if (lat && lon) {
                        setMapLat(lat);
                        setMapLon(lon);
                    }
                }
            } catch {
                // ignore
            }
        }
        if (session?.user.id && data?.owner_id === session.user.id) {
            const r = await supabase
                .from("event_registrations")
                .select("user_id,status,created_at")
                .eq("event_id", data.id)
                .eq("status", "pending")
                .order("created_at", { ascending: true });
            setPending(r.data ?? []);
        }
        if (session?.user.id) {
            const rr = await supabase
                .from("event_registrations")
                .select("status")
                .eq("event_id", data?.id)
                .eq("user_id", session.user.id)
                .maybeSingle();
            if (!rr.error && rr.data) {
                const st = (rr.data as any).status;
                setRegistrationStatus(st === "approved" ? "approved" : "pending");
            } else {
                setRegistrationStatus("none");
            }
        }
    }

    useEffect(() => {
        if (!id) return;
        loadEvent();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, GEOAPIFY_API_KEY, session?.user.id]);

    const staticMapUrl = useMemo(() => {
        if (!mapLat || !mapLon || !GEOAPIFY_API_KEY) return null;
        const width = 800;
        const height = 320;
        const markerParam = encodeURIComponent(`lonlat:${mapLon},${mapLat};type:material;color:%23F43F5E;size:medium`);
        return `https://maps.geoapify.com/v1/staticmap?style=osm-carto&width=${width}&height=${height}&center=lonlat:${mapLon},${mapLat}&zoom=15&marker=${markerParam}&format=png&apiKey=${GEOAPIFY_API_KEY}`;
    }, [mapLat, mapLon, GEOAPIFY_API_KEY]);

    if (!event) return <View className="flex-1 bg-background" />;

    return (
        <ScrollView className="flex-1 bg-background">
            <View className="gap-y-4">
                {event.cover_url ? (
                    <View style={{ position: "relative" }}>
                        <Image source={{ uri: event.cover_url }} style={{ width: "100%", height: 220 }} />
                        {typeof event.capacity === "number" ? (
                            <View className="absolute top-2 right-2 rounded-full bg-primary px-2 py-1">
                                <Text className="text-primary-foreground text-xs">{event.capacity} pers.</Text>
                            </View>
                        ) : null}
                    </View>
                ) : null}
                <View className="p-4 gap-y-2">
                    <H1>{event.title}</H1>
                    {sport ? (
                        <Text>
                            {sport.emoji ? `${sport.emoji} ` : ""}
                            {sport.name}
                        </Text>
                    ) : null}
                    {event.start_at ? <Muted>{new Date(event.start_at).toLocaleString()}</Muted> : null}
                    {event.address_text ? <Muted>{event.address_text}</Muted> : null}
                    {staticMapUrl ? (
                        <View style={{ position: "relative" }}>
                            <Image
                                source={{ uri: staticMapUrl }}
                                style={{ width: "100%", height: 180, borderRadius: 8 }}
                                onError={() => setMapError(true)}
                            />
                            {typeof event.capacity === "number" ? (
                                <View className="absolute top-2 right-2 rounded-full bg-primary px-2 py-1">
                                    <Text className="text-primary-foreground text-xs">{event.capacity} pers.</Text>
                                </View>
                            ) : null}
                        </View>
                    ) : null}
                    {typeof event.capacity === "number" ? (
                        <Text>Capacité: {event.capacity} personnes</Text>
                    ) : null}
                    {event.description ? <Text>{event.description}</Text> : null}
                    {event.owner_id !== session?.user.id ? (
                        <Button
                            className="mt-2"
                            variant={
                                registrationStatus === "none"
                                    ? "default"
                                    : registrationStatus === "pending"
                                    ? "secondary"
                                    : "destructive"
                            }
                            onPress={async () => {
                                const userId = session?.user.id;
                                if (!userId) return;
                                if (registrationStatus !== "none") {
                                    // cancel request: try update status, fallback to delete if status column missing
                                    const upd = await supabase
                                        .from("event_registrations")
                                        .update({ status: 'rejected' })
                                        .eq("event_id", event.id)
                                        .eq("user_id", userId);
                                    if (upd.error) {
                                        // fallback delete (schema without status)
                                        const del = await supabase
                                            .from("event_registrations")
                                            .delete()
                                            .eq("event_id", event.id)
                                            .eq("user_id", userId);
                                        if (del.error) {
                                            // eslint-disable-next-line no-alert
                                            alert(del.error.message);
                                            return;
                                        }
                                    }
                                    setRegistrationStatus("none");
                                } else {
                                    // create request pending; fallback insert without status
                                    const ins = await supabase
                                        .from("event_registrations")
                                        .insert({ event_id: event.id, user_id: userId, status: 'pending' });
                                    if (ins.error) {
                                        const noStatus = /column\s+status\s+does not exist/i.test(ins.error.message);
                                        if (noStatus) {
                                            const ins2 = await supabase
                                                .from("event_registrations")
                                                .insert({ event_id: event.id, user_id: userId });
                                            if (ins2.error) {
                                                // eslint-disable-next-line no-alert
                                                alert(ins2.error.message);
                                                return;
                                            }
                                        } else {
                                            // eslint-disable-next-line no-alert
                                            alert(ins.error.message);
                                            return;
                                        }
                                    }
                                    setRegistrationStatus("pending");
                                }
                            }}
                        >
                            <Text>
                                {registrationStatus === "none"
                                    ? "Je demande à participer"
                                    : registrationStatus === "pending"
                                    ? "En attente de validation"
                                    : "Se désinscrire"}
                            </Text>
                        </Button>
                    ) : null}
                    <Button className="mt-2" variant="secondary" onPress={() => router.back()}>
                        <Text>Fermer</Text>
                    </Button>
                </View>

                {event.owner_id === session?.user.id && (
                    <View className="p-4 gap-y-2">
                        <Muted>Demandes d’inscription</Muted>
                        <View className="gap-y-2">
                            {pending.map((r) => (
                                <View key={`${r.user_id}`} className="rounded-md border border-border bg-card p-3 gap-y-1">
                                    <Text>{r.user_id}</Text>
                                    <View className="flex-row gap-x-2">
                                        <Button variant="default" disabled={decisionLoading === r.user_id} onPress={async () => {
                                            try {
                                                setDecisionLoading(r.user_id);
                                                const { error } = await supabase
                                                    .from("event_registrations")
                                                    .update({ status: 'approved' })
                                                    .eq("event_id", event.id)
                                                    .eq("user_id", r.user_id);
                                                if (error) {
                                                    Alert.alert("Erreur", error.message);
                                                }
                                            } finally {
                                                setDecisionLoading(null);
                                                loadEvent();
                                            }
                                        }}>
                                            <Text>Approuver</Text>
                                        </Button>
                                        <Button variant="destructive" disabled={decisionLoading === r.user_id} onPress={async () => {
                                            try {
                                                setDecisionLoading(r.user_id);
                                                const { error } = await supabase
                                                    .from("event_registrations")
                                                    .update({ status: 'rejected' })
                                                    .eq("event_id", event.id)
                                                    .eq("user_id", r.user_id);
                                                if (error) {
                                                    Alert.alert("Erreur", error.message);
                                                }
                                            } finally {
                                                setDecisionLoading(null);
                                                loadEvent();
                                            }
                                        }}>
                                            <Text>Refuser</Text>
                                        </Button>
                                    </View>
                                </View>
                            ))}
                            {pending.length === 0 ? <Muted>Aucune demande en attente.</Muted> : null}
                        </View>
                    </View>
                )}
            </View>
        </ScrollView>
    );
}


