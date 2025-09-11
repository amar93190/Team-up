import { supabase } from "@/config/supabase";

export type UserMedia = {
    id: string;
    user_id: string;
    kind: 'image' | 'video';
    url: string; // public URL
    created_at: string;
};

const BUCKET = 'public';

export async function listUserMedia(userId: string): Promise<UserMedia[]> {
    try {
        const { data, error } = await supabase
            .from('user_media')
            .select('id,user_id,kind,url,created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return (data ?? []) as any;
    } catch (e: any) {
        console.warn('listUserMedia failed', e?.message ?? e);
        return [];
    }
}

export async function uploadUserMedia(userId: string, localUri: string, mimeType: string): Promise<UserMedia | null> {
    const isVideo = mimeType.startsWith('video/');
    const ext = localUri.split('.').pop()?.toLowerCase() || (isVideo ? 'mp4' : 'jpg');
    const path = `media/${userId}/${Date.now()}.${ext}`;
    try {
        const file = { uri: localUri, name: `upload.${ext}`, type: mimeType } as any;
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true, contentType: mimeType });
        if (upErr) throw upErr;
        const { data: publicUrl } = supabase.storage.from(BUCKET).getPublicUrl(path);
        const url = publicUrl.publicUrl;
        const { data, error } = await supabase
            .from('user_media')
            .insert({ user_id: userId, kind: isVideo ? 'video' : 'image', url })
            .select('id,user_id,kind,url,created_at')
            .maybeSingle();
        if (error) throw error;
        return data as any;
    } catch (e: any) {
        console.warn('uploadUserMedia failed', e?.message ?? e);
        return null;
    }
}

export async function deleteUserMedia(id: string) {
    try {
        const { error } = await supabase.from('user_media').delete().eq('id', id);
        if (error) throw error;
        return true;
    } catch (e) {
        return false;
    }
}


