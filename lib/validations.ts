import { z } from "zod";
import { MAX_MESSAGE_LENGTH } from "@/lib/constants";

/** lowercase letters, numbers, underscore — 3 to 20 chars. */
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^[a-z0-9_]{3,20}$/,
    "Username must be 3–20 characters: lowercase letters, numbers, or underscore",
  );

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, "Display name is required")
  .max(50, "Display name must be 50 characters or fewer");

export const emailSchema = z.email("Enter a valid email address");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be 72 characters or fewer");

export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  username: usernameSchema,
  displayName: displayNameSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const messageSchema = z.object({
  conversationId: z.uuid(),
  body: z
    .string()
    .trim()
    .min(1, "Message cannot be empty")
    .max(
      MAX_MESSAGE_LENGTH,
      `Message is too long (max ${MAX_MESSAGE_LENGTH} characters)`,
    ),
});

export const attachmentSchema = z.object({
  path: z.string().min(1),
  type: z.enum(["image", "audio", "file"]),
  name: z.string().min(1).max(255),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
});

/** Full payload for the sendMessage server action (text and/or attachment). */
export const sendMessageSchema = z
  .object({
    id: z.uuid().optional(),
    conversationId: z.uuid(),
    body: z.string().trim().max(MAX_MESSAGE_LENGTH, "Message is too long"),
    attachment: attachmentSchema.nullable().optional(),
  })
  .refine((d) => d.body.length > 0 || d.attachment != null, {
    message: "Message cannot be empty",
  })
  .refine(
    (d) => !d.attachment || d.attachment.path.startsWith(`${d.conversationId}/`),
    { message: "Invalid attachment path" },
  );

export const startConversationSchema = z.object({
  otherUserId: z.uuid("Invalid user"),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type MessageInput = z.infer<typeof messageSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type AttachmentInput = z.infer<typeof attachmentSchema>;

/** Returns the first human-readable validation message, or null if valid. */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid input";
}
