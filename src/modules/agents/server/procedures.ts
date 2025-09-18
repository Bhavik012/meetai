import { z } from "zod";
import { db } from "@/db";
import { agents } from "@/db/schema";
import { agentsInsertSchema } from "../schemas";
import { createTRPCRouter, baseProcedure, ProtectedProcedure } from "@/trpc/init";
import { eq } from "drizzle-orm";

export const agentsRouter = createTRPCRouter({


    getOne: ProtectedProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
        const [existingAgent] = await db
            .select()
            .from(agents)
            .where(eq(agents.id, input.id))

        return existingAgent;
    }),
    getMany: ProtectedProcedure.query(async () => {
        const data = await db
            .select()
            .from(agents);

        return data;
    }),
    create: ProtectedProcedure
        .input(agentsInsertSchema)
        .mutation(async ({ input, ctx }) => {
            const [createdAgent] = await db
                .insert(agents)
                .values({
                    ...input,
                    userId: ctx.auth.user.id,
                })
                .returning();

            return createdAgent;
        }),
});