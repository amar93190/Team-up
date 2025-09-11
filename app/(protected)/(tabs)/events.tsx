import { View } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { H1, Muted } from "@/components/ui/typography";

export default function EventsScreen() {
	return (
		<View className="flex-1 items-center justify-center bg-background p-4 gap-y-4" style={{ position: "relative" }}>
			<LinearGradient
				colors={["#F59E0B", "#10B981", "#06B6D4", "#3B82F6"]}
				start={{ x: 0, y: 0 }}
				end={{ x: 1, y: 1 }}
				style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.16 }}
				pointerEvents="none"
			/>
			<H1 className="text-center">Événements</H1>
			<Muted className="text-center">Suivi de tes inscriptions</Muted>
			<Button className="w-full" variant="default" onPress={() => router.push("/(protected)/events/create")}> 
				<Text>Créer un événement</Text>
			</Button>
		</View>
	);
}


