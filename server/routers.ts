import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { deleteMindMitraMemory, getMindMitraActivity, listMindMitraMemories, recordMindMitraActivity, upsertMindMitraMemory } from "./db";
import { SARVAM_LANGUAGES, SarvamTtsError, synthesizeSarvamSpeech } from "./sarvam";
import { z } from "zod";

const ownerInput = z.object({ ownerKey: z.string().min(16).max(128) });
const memoryInput = ownerInput.extend({
  externalId: z.string().min(1).max(128),
  title: z.string().min(1).max(255),
  description: z.string().min(1),
  category: z.string().min(1).max(80),
  memoryDate: z.string().min(1).max(64),
  memoryTime: z.string().max(32).optional(),
  language: z.string().max(16).optional(),
  source: z.string().max(16).default("typed"),
  pinned: z.boolean().default(false),
});
const activityInput = ownerInput.extend({
  activityType: z.string().min(1).max(64),
  memoryExternalId: z.string().max(128).optional(),
  game: z.string().max(32).optional(),
  score: z.number().int().optional(),
  accuracy: z.number().int().optional(),
  language: z.string().max(16).optional(),
});
const sarvamTtsInput = z.object({
  text: z.string().trim().min(1).max(2500),
  languageCode: z.enum(SARVAM_LANGUAGES),
  pace: z.number().min(0.5).max(2).default(0.9),
});

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  mindmitra: router({
    synthesizeSpeech: publicProcedure.input(sarvamTtsInput).mutation(async ({ input }) => {
      try {
        return await synthesizeSarvamSpeech(input);
      } catch (error) {
        if (error instanceof SarvamTtsError) {
          throw new TRPCError({ code: error.statusCode === 400 ? "BAD_REQUEST" : error.statusCode === 429 ? "TOO_MANY_REQUESTS" : "BAD_GATEWAY", message: error.message });
        }
        throw error;
      }
    }),
    memories: publicProcedure.input(ownerInput).query(({ input }) => listMindMitraMemories(input.ownerKey)),
    saveMemory: publicProcedure.input(memoryInput).mutation(({ input }) => upsertMindMitraMemory({
      ownerKey: input.ownerKey,
      externalId: input.externalId,
      title: input.title,
      description: input.description,
      category: input.category,
      memoryDate: input.memoryDate,
      memoryTime: input.memoryTime,
      language: input.language,
      source: input.source,
      pinned: input.pinned ? 1 : 0,
    })),
    deleteMemory: publicProcedure.input(ownerInput.extend({ externalId: z.string().min(1).max(128) })).mutation(({ input }) => deleteMindMitraMemory(input.ownerKey, input.externalId)),
    activity: publicProcedure.input(activityInput).mutation(({ input }) => recordMindMitraActivity({
      ownerKey: input.ownerKey,
      activityType: input.activityType,
      memoryExternalId: input.memoryExternalId,
      game: input.game,
      score: input.score,
      accuracy: input.accuracy,
      language: input.language,
    })),
    activityLog: publicProcedure.input(ownerInput).query(({ input }) => getMindMitraActivity(input.ownerKey)),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
