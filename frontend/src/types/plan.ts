import { z } from "zod";

export const PlannerBriefSchema = z.object({
  brief: z.string().min(1).max(400),
  provider: z.enum(["gemini", "rules"]),
});

export type PlannerBrief = z.infer<typeof PlannerBriefSchema>;
