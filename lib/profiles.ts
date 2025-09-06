import { supabase } from "@/config/supabase";

export type UserProfile = {
	id: string;
	first_name: string | null;
	last_name: string | null;
	age: number | null;
	avatar_url?: string | null;
	region_id?: number | null;
	role?: "participant" | "organizer" | "both" | null;
	created_at?: string;
	updated_at?: string;
};

export async function getProfile(userId: string) {
	const { data, error } = await supabase
		.from("profiles")
		.select("id, first_name, last_name, age, avatar_url, region_id, role")
		.eq("id", userId)
		.maybeSingle();

	if (error) throw error;
	return (data as UserProfile) ?? null;
}

export async function upsertProfile(profile: UserProfile) {
	const { data, error } = await supabase
		.from("profiles")
		.upsert(
			{
				id: profile.id,
				first_name: profile.first_name,
				last_name: profile.last_name,
				age: profile.age,
				avatar_url: profile.avatar_url ?? null,
				region_id: profile.region_id ?? null,
				role: profile.role ?? null,
			},
			{ onConflict: "id" },
		)
		.select("id, first_name, last_name, age, avatar_url, region_id, role")
		.single();

	if (error) throw error;
	return data as UserProfile;
}

export function isProfileIncomplete(profile: UserProfile | null) {
	if (!profile) return true;
	if (!profile.first_name || !profile.last_name) return true;
	if (profile.age == null) return true;
	if (profile.region_id == null) return true;
	if (!profile.role) return true;
	return false;
}


