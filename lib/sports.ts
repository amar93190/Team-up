import { supabase } from "@/config/supabase";

export type Sport = {
	id: number;
	code: string;
	name: string;
	emoji?: string | null;
};

export async function listSports() {
	const { data, error } = await supabase
		.from("sports")
		.select("id, code, name, emoji")
		.order("name", { ascending: true });
	if (error) throw error;
	return (data as Sport[]) ?? [];
}

export async function saveUserSports(userId: string, sportIds: number[]) {
	// Replace all selections for user
	const { error: delErr } = await supabase
		.from("user_sports")
		.delete()
		.eq("user_id", userId);
	if (delErr) throw delErr;

	if (sportIds.length === 0) return [];

	const rows = sportIds.map((id) => ({ user_id: userId, sport_id: id }));
	const { data, error } = await supabase
		.from("user_sports")
		.insert(rows)
		.select("user_id, sport_id");
	if (error) throw error;
	return data;
}


