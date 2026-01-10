import { z } from "zod";

// === Asset Validation ===
export const assetSchema = z.object({
  name: z.string().trim().min(1, "Asset name is required").max(200, "Asset name must be less than 200 characters"),
  description: z.string().max(2000, "Description must be less than 2000 characters").optional().or(z.literal("")),
  estimated_value: z.number().min(0, "Value cannot be negative").max(999999999999, "Value is too large").optional().nullable(),
  category: z.enum(["property", "investment", "bank_account", "vehicle", "jewelry", "digital_asset", "insurance", "business", "other"]),
});

export type AssetInput = z.infer<typeof assetSchema>;

// === Recipient Validation ===
export const recipientSchema = z.object({
  full_name: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  email: z.string().email("Invalid email address").max(255, "Email must be less than 255 characters").optional().or(z.literal("")),
  phone: z.string().max(20, "Phone number is too long").regex(/^(\+?[\d\s\-()]{0,20})?$/, "Invalid phone format").optional().or(z.literal("")),
  relationship: z.string().max(50, "Relationship must be less than 50 characters").optional().or(z.literal("")),
});

export type RecipientInput = z.infer<typeof recipientSchema>;

// === Authentication Validation ===
export const authSchema = z.object({
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128, "Password must be less than 128 characters"),
  fullName: z.string().trim().min(2, "Name must be at least 2 characters").max(100, "Name must be less than 100 characters").optional(),
});

export const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be less than 128 characters");

export type AuthInput = z.infer<typeof authSchema>;

// === Will Content Validation ===
export const willTranscriptSchema = z.string().max(50000, "Content is too long (max 50,000 characters)");

export const chatMessageSchema = z.string().trim().min(1, "Message cannot be empty").max(5000, "Message is too long (max 5,000 characters)");

// === File Upload Validation ===
export const ALLOWED_DOC_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export const ALLOWED_DOC_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx"];

export const MAX_DOC_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

export function validateDocumentFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > MAX_DOC_SIZE) {
    return { valid: false, error: "File too large. Maximum size is 10MB" };
  }

  // Check MIME type
  if (!ALLOWED_DOC_TYPES.includes(file.type)) {
    return { valid: false, error: "Invalid file type. Allowed: PDF, JPG, PNG, DOC, DOCX" };
  }

  // Check extension
  const extension = "." + file.name.split(".").pop()?.toLowerCase();
  if (!ALLOWED_DOC_EXTENSIONS.includes(extension)) {
    return { valid: false, error: "Invalid file extension. Allowed: PDF, JPG, PNG, DOC, DOCX" };
  }

  return { valid: true };
}

export function validateVideoFile(blob: Blob): { valid: boolean; error?: string } {
  // Check file size
  if (blob.size > MAX_VIDEO_SIZE) {
    return { valid: false, error: "Video too large. Maximum size is 100MB" };
  }

  // Check MIME type
  if (!blob.type.startsWith("video/")) {
    return { valid: false, error: "Invalid video format" };
  }

  return { valid: true };
}
