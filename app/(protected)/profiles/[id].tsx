import { useLocalSearchParams, router } from "expo-router";
import { Image, ScrollView, View, Pressable, Modal } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Path } from "react-native-svg";
import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";

import { Text } from "@/components/ui/text";
import { H1, Muted } from "@/components/ui/typography";
import { supabase } from "@/config/supabase";
import { listUserMedia, UserMedia } from "@/lib/media";
import { Video, ResizeMode } from "expo-av";

export default function PublicProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<any | null>(null);
  const [media, setMedia] = useState<UserMedia[]>([]);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerItem, setViewerItem] = useState<UserMedia | null>(null);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const { data } = await supabase
        .from("profiles")
        .select("id,first_name,last_name,avatar_url,age,region_id,role")
        .eq("id", id)
        .maybeSingle();
      setProfile(data ?? null);
      const mm = await listUserMedia(id);
      setMedia(mm);
    })();
  }, [id]);

  return (
    <ScrollView className="flex-1 bg-background" style={{ position: "relative" }}>
      <LinearGradient
        colors={["#F59E0B", "#10B981", "#06B6D4", "#3B82F6"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.16 }}
        pointerEvents="none"
      />
      <View style={{ height: 160 }}>
        <Svg width="100%" height="100%" viewBox="0 0 400 200" preserveAspectRatio="none">
          <Defs>
            <SvgLinearGradient id="ppGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor="#F59E0B" />
              <Stop offset="33%" stopColor="#10B981" />
              <Stop offset="66%" stopColor="#06B6D4" />
              <Stop offset="100%" stopColor="#3B82F6" />
            </SvgLinearGradient>
          </Defs>
          <Path d="M0 0 H400 V120 C320 180 150 110 0 160 Z" fill="url(#ppGrad)" />
        </Svg>
      </View>
      <View className="items-center" style={{ marginTop: -60 }}>
        <View className="h-36 w-36 rounded-full overflow-hidden bg-muted" style={{ borderWidth: 4, borderColor: '#FFFFFF' }}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={{ width: '100%', height: '100%' }} />
          ) : null}
        </View>
        <H1 className="mt-3">{`${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim() || 'Utilisateur'}</H1>
        {typeof profile?.age === 'number' ? <Muted>{profile.age} ans</Muted> : null}
      </View>

      {/* Section Médias */}
      <View className="p-4 gap-y-4">
        <Muted>Médias</Muted>
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
            <View style={{ width: '100%' }} className="items-center py-6">
              <Text>Aucun média pour le moment</Text>
            </View>
          ) : null}
        </View>
        <Pressable className="mt-6 rounded-md bg-secondary px-4 py-3" onPress={() => router.back()}>
          <Text>Fermer</Text>
        </Pressable>
      </View>
      {/* Viewer modal */}
      <Modal visible={viewerOpen} transparent animationType="fade" onRequestClose={() => { setViewerOpen(false); setViewerItem(null); }}>
        <Pressable onPress={() => { setViewerOpen(false); setViewerItem(null); }} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: '92%', height: '72%' }}>
            {viewerItem?.kind === 'image' ? (
              <Image source={{ uri: viewerItem.url }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
            ) : viewerItem?.kind === 'video' ? (
              <Video source={{ uri: viewerItem.url }} style={{ width: '100%', height: '100%' }} useNativeControls shouldPlay resizeMode={ResizeMode.CONTAIN} />
            ) : null}
          </View>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}
