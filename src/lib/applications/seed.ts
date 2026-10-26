import type { DemoApplication } from "./demo";
import type { DemoChat } from "@/lib/chat/demo";

/** Deterministic demo applications so Poster comparison and tracking can be reviewed. */
export const seedApplications: DemoApplication[] = [
  {
    id: "application_marco_plants",
    taskId: "task_plants",
    tasker: "Marco Cruz",
    kind: "bid",
    status: "submitted",
    amountCents: 28000,
    message: "I live nearby and can water them both days.",
    estimatedTime: "10 minutes per visit",
    verification: "pending",
    createdAt: "2026-10-26T08:10:00.000Z",
  },
  {
    id: "application_lia_plants",
    taskId: "task_plants",
    tasker: "Lia Ramos",
    kind: "bid",
    status: "submitted",
    amountCents: 30000,
    message: "Available in the mornings, happy to send photos.",
    estimatedTime: "15 minutes per visit",
    verification: "verified",
    createdAt: "2026-10-26T08:25:00.000Z",
  },
  {
    id: "application_ana_groceries",
    taskId: "task_groceries",
    tasker: "Ana Reyes",
    kind: "bid",
    status: "submitted",
    amountCents: 43000,
    message: "I can deliver before 5 PM.",
    estimatedTime: "1 hour",
    verification: "pending",
    createdAt: "2026-10-25T09:00:00.000Z",
  },
  {
    id: "application_ana_storage",
    taskId: "task_storage",
    tasker: "Ana Reyes",
    kind: "request",
    status: "withdrawn",
    amountCents: 90000,
    message: "I was available earlier but had to withdraw.",
    estimatedTime: null,
    verification: "pending",
    createdAt: "2026-10-24T11:00:00.000Z",
  },
];

/** One existing conversation so the inbox has content on first load. */
export const seedChats: DemoChat[] = [
  {
    id: "chat_ana_groceries",
    taskId: "task_groceries",
    opener: "Ana Reyes",
    poster: "Maria Santos",
    createdAt: "2026-10-25T08:30:00.000Z",
    messages: [
      {
        id: "chat_ana_groceries_1",
        sender: "Ana Reyes",
        body: "Is the grocery list final? I can bring my own bags.",
        createdAt: "2026-10-25T08:31:00.000Z",
        reported: false,
      },
      {
        id: "chat_ana_groceries_2",
        sender: "Maria Santos",
        body: "Yes, it is final. Bags would help, thank you!",
        createdAt: "2026-10-25T08:45:00.000Z",
        reported: false,
      },
    ],
  },
];
