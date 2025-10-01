import { inferRouterOutputs } from "@trpc/server";

import type { AppRouter } from "@/trpc/routers/_app";

export type MeetingGetMany = inferRouterOutputs<AppRouter>["meetings"]["getMany"]["items"];
export type MeetingGetOne = inferRouterOutputs<AppRouter>["meetings"]["getOne"];

export const MeetingStatus = {
    Upcoming: "upcoming",
    Active: "active",
    Completed: "completed",
    Processing: "processing",
    Cancelled: "cancelled"
};

export type MeetingStatus = (typeof MeetingStatus)[keyof typeof MeetingStatus];


