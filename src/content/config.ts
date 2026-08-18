import { defineCollection, z } from "astro:content";

const blog = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.date(),
    tags: z.array(z.enum(["Music", "Workflows", "Linux/Arch", "AI/ML"])),
  }),
});

export const collections = { blog };
