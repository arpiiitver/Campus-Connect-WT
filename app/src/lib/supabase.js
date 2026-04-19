import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || "https://your-project.supabase.co";
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || "your-anon-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Auth helpers
export const signUp = async (email, password, username) => {
  // Validate email domain
  if (!email.endsWith("@vit.edu.in")) {
    throw new Error("Only @vit.edu.in email addresses are allowed");
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
        college_email: email,
      },
    },
  });

  if (error) throw error;

  // Create profile after successful signup
  if (data.user) {
    const { error: profileError } = await supabase.from("profiles").insert({
      id: data.user.id,
      username,
      college_email: email,
      trust_score: 100,
      is_admin: false,
    });

    if (profileError) throw profileError;
  }

  return data;
};

export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const getCurrentUser = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return { ...user, profile };
};

// Storage helpers
export const uploadImage = async (file, bucket = "marketplace-images") => {
  const fileExt = file.name.split(".").pop();
  const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(filePath);

  return publicUrl;
};

// Realtime subscription helpers
export const subscribeToMessages = (roomId, callback) => {
  return supabase
    .channel(`room:${roomId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `room_id=eq.${roomId}`,
      },
      (payload) => callback(payload.new),
    )
    .subscribe();
};

export const subscribeToListings = (callback) => {
  return supabase
    .channel("listings")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "listings",
      },
      (payload) => callback(payload.new),
    )
    .subscribe();
};
