"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { firstIssue, startConversationSchema } from "@/lib/validations";

/**
 * Get-or-create a 1:1 conversation with another user, then navigate to it.
 * Returns an error object on failure (success path redirects and never returns).
 */
export async function startConversation(
  otherUserId: string,
): Promise<{ error: string } | void> {
  const parsed = startConversationSchema.safeParse({ otherUserId });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("start_conversation", {
    other_user_id: parsed.data.otherUserId,
  });

  if (error || !data) return { error: "Could not start conversation" };

  redirect(`/chat/${data}`);
}
