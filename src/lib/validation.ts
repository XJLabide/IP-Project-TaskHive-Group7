import { z } from "zod";

const taskFieldsSchema = z.object({
  title: z.string(),
  description: z.string(),
  category: z.string(),
  budgetCents: z.number(),
  deadline: z.union([z.string(), z.date()]).nullable().optional(),
  fulfillmentMode: z.enum(["local", "remote"]),
  hiringMode: z.enum(["bidding", "fixed_price"]),
  locationLabel: z.string().nullable().optional(),
  addressLine: z.string().nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
});

/** A normal create request publishes; `publish: false` saves a draft. */
export const createTaskSchema = taskFieldsSchema.extend({
  publish: z.boolean().default(true),
});

export const updateTaskSchema = taskFieldsSchema.partial().extend({
  publish: z.boolean().optional(),
});

export const bidSchema = z.object({
  amountCents: z.number().int().positive(),
  message: z.string().min(5),
  estimatedTime: z.string().optional(),
});

export const taskRequestSchema = z.object({
  message: z.string().optional(),
});

export const reviewSchema = z.object({
  taskId: z.string(),
  revieweeId: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
});

export const reportSchema = z.object({
  taskId: z.string().optional(),
  reportedUserId: z.string().optional(),
  messageId: z.string().optional(),
  reason: z.string().min(5),
});

export const openChatSchema = z.object({
  taskId: z.string().min(1),
});

export const chatMessageSchema = z.object({
  body: z.string().trim().min(1).max(2000),
});

export const disputeSchema = z.object({
  taskId: z.string(),
  reason: z.string().min(5),
});

export const verificationAppealSchema = z.object({
  note: z.string().min(10).max(2000),
});

export const verificationDecisionSchema = z
  .object({
    outcome: z.enum(["approved", "denied"]),
    reason: z.string().min(3).optional(),
  })
  .refine((value) => value.outcome !== "denied" || Boolean(value.reason?.trim()), {
    message: "A denial needs a reason.",
    path: ["reason"],
  });

export const providerCallbackSchema = z.object({
  userId: z.string().min(1),
});

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(2).optional(),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s()-]{10,}$/, "Enter a phone number we can text.")
    .optional(),
  ageAttested: z.boolean().optional(),
  /** The saved location that becomes the default local-discovery origin. */
  location: z
    .object({
      label: z.string().trim().min(2).max(120),
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    })
    .optional(),
});
