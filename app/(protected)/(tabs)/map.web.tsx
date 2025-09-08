import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { H1, Muted } from "@/components/ui/typography";

export default function MapScreenWeb() {
	return (
		<SafeAreaView className="flex-1 bg-background">
			<View className="flex-1 items-center justify-center p-6 gap-y-3">
				<H1 className="text-center">Carte</H1>
				<Muted className="text-center">La carte interactive est disponible sur mobile. (Web à venir)</Muted>
			</View>
		</SafeAreaView>
	);
}

