import { View, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useMemo, useState } from "react";
import { router } from "expo-router";

import { Text } from "@/components/ui/text";
import { H1, Muted } from "@/components/ui/typography";
import { supabase } from "@/config/supabase";
import { useAuth } from "@/context/supabase-provider";
import { LinearGradient } from "expo-linear-gradient";

// Dynamically require react-native-maps only on native to avoid web bundling errors
const maps: any = Platform.OS === "web" ? null : require("react-native-maps");
const MapViewComp: any = maps ? maps.default : null;
const MarkerComp: any = maps ? maps.Marker : null;
const CalloutComp: any = maps ? maps.Callout : null;
const PROVIDER_GOOGLE_CONST: any = maps ? maps.PROVIDER_GOOGLE : null;

// Light, desaturated Google map style to match app theme
const MAP_STYLE_LIGHT = [
  { "elementType": "geometry", "stylers": [{ "color": "#f5f5f5" }] },
  { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#616161" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#f5f5f5" }] },
  { "featureType": "administrative.land_parcel", "elementType": "labels.text.fill", "stylers": [{ "color": "#bdbdbd" }] },
  { "featureType": "poi", "elementType": "geometry", "stylers": [{ "color": "#eeeeee" }] },
  { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
  { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#e5e5e5" }] },
  { "featureType": "poi.park", "elementType": "labels.text.fill", "stylers": [{ "color": "#9e9e9e" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#ffffff" }] },
  { "featureType": "road.arterial", "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
  { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#dadada" }] },
  { "featureType": "road.highway", "elementType": "labels.text.fill", "stylers": [{ "color": "#616161" }] },
  { "featureType": "road.local", "elementType": "labels.text.fill", "stylers": [{ "color": "#9e9e9e" }] },
  { "featureType": "transit.line", "elementType": "geometry", "stylers": [{ "color": "#e5e5e5" }] },
  { "featureType": "transit.station", "elementType": "geometry", "stylers": [{ "color": "#eeeeee" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#c9e7f5" }] },
  { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#9e9e9e" }] }
];

const GEOAPIFY_API_KEY = process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY as string | undefined;

function categoriesAllSports(): string {
  return "sport.pitch|sport.stadium|sport.track|sport.tennis|sport.basketball|sport.swimming_pool|leisure.park|leisure.fitness_station";
}

export default function MapScreen() {
  const { session } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [region, setRegion] = useState<any>({ latitude: 48.8566, longitude: 2.3522, latitudeDelta: 0.2, longitudeDelta: 0.2 });
  const [publicPlaces, setPublicPlaces] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const userId = session?.user.id;
      const { data } = await supabase
        .from("events")
        .select("id,title,latitude,longitude,sport:sports(emoji,name)")
        .not("latitude", "is", null)
        .not("longitude", "is", null)
        .order("start_at", { ascending: true });
      setEvents(data ?? []);
    })();
  }, [session?.user.id]);

  useEffect(() => {
    if (!GEOAPIFY_API_KEY) return;
    const { latitude, longitude, latitudeDelta, longitudeDelta } = region;
    // Build a bounding box from the current region for Geoapify bbox filter
    const north = latitude + latitudeDelta / 1.5;
    const south = latitude - latitudeDelta / 1.5;
    const east = longitude + longitudeDelta / 1.5;
    const west = longitude - longitudeDelta / 1.5;
    const cats = categoriesAllSports();
    const url = `https://api.geoapify.com/v2/places?categories=${encodeURIComponent(cats)}&filter=rect:${west},${south},${east},${north}&limit=80&apiKey=${GEOAPIFY_API_KEY}`;
    let active = true;
    (async () => {
      try {
        const res = await fetch(url);
        const json = await res.json();
        if (!active) return;
        setPublicPlaces(Array.isArray(json?.features) ? json.features : []);
      } catch {
        if (active) setPublicPlaces([]);
      }
    })();
    return () => { active = false; };
  }, [region?.latitude, region?.longitude, region?.latitudeDelta, region?.longitudeDelta]);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1">
        <MapViewComp
          {...(Platform.OS === "android" ? { provider: PROVIDER_GOOGLE_CONST } : {})}
          style={{ flex: 1 }}
          customMapStyle={MAP_STYLE_LIGHT}
          initialRegion={region}
          onRegionChangeComplete={(r: any) => setRegion(r)}
        >
          {events.map((e) => (
            <MarkerComp
              key={`evt-${e.id}`}
              coordinate={{ latitude: Number(e.latitude), longitude: Number(e.longitude) }}
              anchor={{ x: 0.5, y: 0.5 }}
              centerOffset={{ x: 0, y: 0 }}
              onPress={() => router.push(`/(protected)/events/${e.id}`)}
            >
              <LinearGradient
                colors={["#F59E0B", "#10B981", "#06B6D4", "#3B82F6"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  borderRadius: 26,
                  width: 52,
                  height: 52,
                  alignItems: "center",
                  justifyContent: "center",
                  shadowColor: "#000",
                  shadowOpacity: 0.2,
                  shadowRadius: 6,
                  elevation: 4,
                }}
              >
                <Text style={{ fontSize: 30, lineHeight: 34 }}>{e?.sport?.emoji ?? "⚑"}</Text>
              </LinearGradient>
            </MarkerComp>
          ))}
        </MapViewComp>
      </View>
    </SafeAreaView>
  );
}


