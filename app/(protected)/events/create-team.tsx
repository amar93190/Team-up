import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { H1, Muted } from "@/components/ui/typography";
import { useAuth } from "@/context/supabase-provider";
import { listApprovedEventsForUser, createTeam } from "@/lib/teams";

export default function CreateTeamScreen() {
  const { session } = useAuth();
  const userId = session?.user.id as string | undefined;
  const params = useLocalSearchParams<{ eventId?: string }>();
  const [events, setEvents] = useState<any[]>([]);
  const [eventId, setEventId] = useState<string | null>(null);
  const [teamName, setTeamName] = useState("");
  const [size, setSize] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      if (!userId) return;
      const ev = await listApprovedEventsForUser(userId);
      setEvents(ev);
      if (params.eventId) setEventId(String(params.eventId));
    })();
  }, [userId, params.eventId]);

  async function handleCreate() {
    if (!userId || !eventId) return;
    if (!teamName.trim()) { alert("Nom d'équipe requis"); return; }
    const n = Number(size);
    if (!Number.isFinite(n) || n <= 0) { alert("Taille d'équipe invalide"); return; }
    setSubmitting(true);
    const team = await createTeam({ userId, eventId, name: teamName.trim(), size: n });
    setSubmitting(false);
    if (!team) { alert("Échec de création"); return; }
    alert(`Équipe créée. Code d'invitation: ${team.invite_code}`);
    router.back();
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4 gap-y-4">
      <H1>Créer une équipe</H1>
      <Muted>Choisis l'événement (accepté), un nom d'équipe et la taille.</Muted>
      <View className="gap-y-3">
        {/* Simple select substitute */}
        <View>
          <Muted>Événement</Muted>
          <View className="rounded-md border border-border">
            {events.map((e) => (
              <Button key={e.id} variant={eventId === String(e.id) ? "default" : "secondary"} onPress={() => setEventId(String(e.id))}>
                <Text numberOfLines={1}>{e.title}</Text>
              </Button>
            ))}
            {events.length === 0 ? <Text>Aucun événement accepté.</Text> : null}
          </View>
        </View>
        <Input placeholder="Nom de l'équipe" value={teamName} onChangeText={setTeamName} />
        <Input placeholder="Taille (nombre de joueurs)" keyboardType="number-pad" value={size} onChangeText={setSize} />
        <Button disabled={!eventId || submitting} onPress={handleCreate}>
          <Text>{submitting ? "Création..." : "Créer l'équipe"}</Text>
        </Button>
      </View>
    </ScrollView>
  );
}


