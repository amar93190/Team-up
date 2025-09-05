import { View } from "react-native";

import { Text } from "@/components/ui/text";
import { H1, Muted } from "@/components/ui/typography";

export default function MapScreen() {
	return (
		<View className="flex-1 items-center justify-center bg-background p-4 gap-y-4">
			<H1 className="text-center">Carte</H1>
			<Muted className="text-center">
				Carte interactive des événements à proximité
			</Muted>
			<Text className="text-center">(Map placeholder)</Text>
		</View>
	);
}


