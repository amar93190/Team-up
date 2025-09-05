import { Stack } from "expo-router";

export default function ProtectedLayout() {
	return (
		<Stack
			screenOptions={{
				headerShown: false,
			}}
		>
			<Stack.Screen name="(tabs)" />
			<Stack.Screen name="modal" options={{ presentation: "modal" }} />
			<Stack.Screen
				name="chat"
				options={{
					// Slide in from right like Instagram
					animation: "slide_from_right",
					gestureEnabled: true,
				}}
			/>
		</Stack>
	);
}
