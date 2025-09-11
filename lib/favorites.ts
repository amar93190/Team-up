import { supabase } from "@/config/supabase";

export type Favorite = {
    user_id: string;
    event_id: string; // uuid
    created_at?: string;
};

/**
 * Returns the event ids favorited by a user. Safe against missing table.
 */
export async function listFavoriteEventIds(userId: string): Promise<string[]> {
    try {
        const { data, error } = await supabase
            .from("event_favorites")
            .select("event_id")
            .eq("user_id", userId);
        if (error) throw error;
        return (data ?? []).map((r: any) => String(r.event_id));
    } catch (e: any) {
        console.warn("listFavoriteEventIds failed (table missing?)", e?.message ?? e);
        return [];
    }
}

/**
 * Returns full event rows that are favorited by the user. Falls back to ids fetch if join not available.
 */
export async function listFavoriteEvents(userId: string) {
    const ids = await listFavoriteEventIds(userId);
    if (!ids.length) return [] as any[];
    try {
        const { data, error } = await supabase
            .from("events")
            .select("id,title,cover_url,start_at,address_text,owner_id,capacity")
            .in("id", ids);
        if (error) throw error;
        return data ?? [];
    } catch (e: any) {
        console.warn("listFavoriteEvents failed", e?.message ?? e);
        return [] as any[];
    }
}

/**
 * Checks if an event is favorited by user.
 */
export async function isEventFavorited(userId: string, eventId: string): Promise<boolean> {
    try {
        const { data, error } = await supabase
            .from("event_favorites")
            .select("event_id")
            .eq("user_id", userId)
            .eq("event_id", eventId)
            .maybeSingle();
        if (error && !String(error.message).includes("JSON object requested, multiple (or no) rows returned")) throw error;
        return !!data;
    } catch (e: any) {
        console.warn("isEventFavorited failed", e?.message ?? e);
        return false;
    }
}

/**
 * Toggles favorite; returns new state. Attempts insert; on unique violation deletes.
 */
export async function toggleEventFavorite(userId: string, eventId: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from("event_favorites")
            .insert({ user_id: userId, event_id: eventId });
        if (!error) return true;
        const msg = String(error.message || "").toLowerCase();
        const isDuplicate = msg.includes("duplicate") || msg.includes("unique") || msg.includes("already exists");
        if (!isDuplicate) throw error;
        // already exists -> remove
        const del = await supabase
            .from("event_favorites")
            .delete()
            .eq("user_id", userId)
            .eq("event_id", eventId);
        if (del.error) throw del.error;
        return false;
    } catch (e: any) {
        console.warn("toggleEventFavorite failed", e?.message ?? e);
        return false;
    }
}


