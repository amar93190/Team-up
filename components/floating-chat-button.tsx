import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { cn } from "@/lib/utils";

type FloatingChatButtonProps = {
	className?: string;
};

export function FloatingChatButton({ className }: FloatingChatButtonProps) {
	const insets = useSafeAreaInsets();
	const topOffset = Math.max(8, insets.top) + 12; // keep below status bar
	return (
		<View
			pointerEvents="box-none"
			className={cn("absolute z-50", className)}
			style={{ top: topOffset, right: 24 }}
		>
			<Pressable
				accessibilityRole="button"
				className="h-11 w-11 items-center justify-center rounded-full bg-primary shadow-lg"
				onPress={() => router.push("/(protected)/chat")}
			>
				<Ionicons name="chatbubble-ellipses" size={20} color="white" />
			</Pressable>
		</View>
	);
}


