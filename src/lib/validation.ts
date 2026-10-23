import { z } from "zod";

export const createTaskSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  category: z.string().min(2),
  budgetCents: z.number().int().positive(),
  deadline: z.string().optional(),
  locationLabel: z.string().min(2),
  mode: z.enum(["BIDDING", "FIXED_PRICE_MANUAL", "FIXED_PRICE_AUTO"]),
  autoApprove: z.boolean().default(false),
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
  reason: z.string().min(5),
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
