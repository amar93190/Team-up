import { View, Platform } from "react-native";
import MapView, { PROVIDER_GOOGLE, Marker, Region, Callout } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useMemo, useState } from "react";
import { router } from "expo-router";

import { Text } from "@/components/ui/text";
import { H1, Muted } from "@/components/ui/typography";
import { supabase } from "@/config/supabase";
import { useAuth } from "@/context/supabase-provider";

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

export default function MapScreen() {
	const { session } = useAuth();
	const [events, setEvents] = useState<any[]>([]);

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

	return (
		<SafeAreaView className="flex-1 bg-background">
			<View className="flex-1">
				<MapView
					{...(Platform.OS === "android" ? { provider: PROVIDER_GOOGLE } : {})}
					style={{ flex: 1 }}
					customMapStyle={MAP_STYLE_LIGHT}
					initialRegion={{
						latitude: 48.8566,
						longitude: 2.3522,
						latitudeDelta: 0.2,
						longitudeDelta: 0.2,
					}}
				>
					{events.map((e) => (
						<Marker
							key={e.id}
							coordinate={{ latitude: Number(e.latitude), longitude: Number(e.longitude) }}
							anchor={{ x: 0.5, y: 0.5 }}
							centerOffset={{ x: 0, y: 0 }}
							onPress={() => router.push(`/(protected)/events/${e.id}`)}
						>
							<View
								style={{
									backgroundColor: "#ffffff",
									borderRadius: 26,
									width: 52,
									height: 52,
									padding: 4,
									alignItems: "center",
									justifyContent: "center",
									borderWidth: 1,
									borderColor: "#e5e7eb",
									shadowColor: "#000",
									shadowOpacity: 0.1,
									shadowRadius: 4,
									elevation: 2,
								}}
							>
								<Text style={{ fontSize: 30, lineHeight: 34 }}>{e?.sport?.emoji ?? "⚑"}</Text>
							</View>
							<Callout onPress={() => router.push(`/(protected)/events/${e.id}`)}>
								<View style={{ padding: 6 }}>
									<Text>{e.title}</Text>
								</View>
							</Callout>
						</Marker>
					))}
				</MapView>
			</View>
		</SafeAreaView>
	);
}


