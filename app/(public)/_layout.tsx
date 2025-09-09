import { Stack } from "expo-router";

import { useColorScheme } from "@/lib/useColorScheme";
import { colors } from "@/constants/colors";

export default function PublicLayout() {
	const { colorScheme } = useColorScheme();

	return (
		<Stack screenOptions={{ headerShown: false, gestureEnabled: false }}>
			<Stack.Screen name="welcome" />
			<Stack.Screen
				name="sign-up"
				options={{
					presentation: "modal",
					headerShown: false,
					gestureEnabled: true,
				}}
			/>
			<Stack.Screen
				name="sign-in"
				options={{
					presentation: "modal",
					headerShown: false,
					gestureEnabled: true,
				}}
			/>
		</Stack>
	);
}
