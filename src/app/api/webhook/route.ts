import { and, eq, not } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import {
    CallEndedEvent,
    CallRecordingReadyEvent,
    CallSessionParticipantLeftEvent,
    CallSessionStartedEvent,
} from "@stream-io/node-sdk";

import { db } from "@/db";
import { agents, meetings } from "@/db/schema";
import { streamVideo } from "@/lib/stream-video";
import { CallTranscriptionReadyEvent } from "@stream-io/video-react-sdk";

// ✅ NEW: Gemini import
import { GoogleGenerativeAI } from "@google/generative-ai";

function verifySignatureWithSDK(body: string, signature: string): boolean {
    return streamVideo.verifyWebhook(body, signature);
}

export async function POST(req: NextRequest) {
    const signature = req.headers.get("stream-signature");
    if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

    const body = await req.text();
    if (!verifySignatureWithSDK(body, signature)) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    let payload: unknown;
    try {
        payload = JSON.parse(body);
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const eventType = (payload as { type?: string })?.type;

    if (eventType === "call.session_started") {
        const event = payload as CallSessionStartedEvent;
        const meetingId = event.call.custom?.meetingId;
        if (!meetingId) return NextResponse.json({ error: "Missing meetingId" }, { status: 400 });

        const [existingMeeting] = await db
            .select()
            .from(meetings)
            .where(
                and(
                    eq(meetings.id, meetingId),
                    not(eq(meetings.status, "completed")),
                    not(eq(meetings.status, "active")),
                    not(eq(meetings.status, "cancelled")),
                    not(eq(meetings.status, "processing"))
                )
            );

        if (!existingMeeting) return NextResponse.json({ error: "Meeting not found" }, { status: 404 });

        await db
            .update(meetings)
            .set({ status: "active" })
            .where(eq(meetings.id, existingMeeting.id));

        // ❌ REMOVED: OpenAI realtime agent join
        // const call = streamVideo.video.call("default", meetingId);
        // await streamVideo.video.connectOpenAi({ ... });

        // If you want to persist agent instructions elsewhere, you still have existingAgent:
        const [existingAgent] = await db.select().from(agents).where(eq(agents.id, existingMeeting.agentsId));
        if (!existingAgent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

    } else if (eventType === "call_session_participant_left") {
        const event = payload as CallSessionParticipantLeftEvent;
        const meetingId = event.call_cid.split(":")[1];
        if (!meetingId) return NextResponse.json({ error: "Missing meetingId" }, { status: 400 });

        const call = streamVideo.video.call("default", meetingId);
        await call.end();

    } else if (eventType === "call_session_ended") {
        const event = payload as CallEndedEvent;
        const meetingId = event.call.custom?.meetingId;
        if (!meetingId) return NextResponse.json({ error: "Missing meetingId" }, { status: 400 });

        await db
            .update(meetings)
            .set({ status: "processing", endedAt: new Date() })
            .where(and(eq(meetings.id, meetingId), eq(meetings.status, "active")));

    } else if (eventType === "call.transcription_ready") {
        const event = payload as CallTranscriptionReadyEvent;
        const meetingId = event.call_cid.split(":")[1];

        const [updatedMeeting] = await db
            .update(meetings)
            .set({ transcriptUrl: event.call_transcription.url })
            .where(eq(meetings.id, meetingId))
            .returning();

        if (!updatedMeeting) {
            return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
        }

        // ✅ NEW: Gemini summary of transcript (optional but recommended)
        try {
            const transcriptText = await fetch(event.call_transcription.url).then((r) => r.text());

            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

            const prompt = `
Summarize this meeting briefly.
Return sections:
- Title
- TL;DR (3 bullets)
- Action items (bullets with owners if possible)
- Decisions

Transcript:
${transcriptText}
      `;

            const res = await model.generateContent(prompt);
            const summary = res.response.text();

            // Make sure 'summary' column exists in your 'meetings' table
            await db.update(meetings).set({ summary }).where(eq(meetings.id, meetingId));
        } catch (e) {
            console.error("Gemini summary error:", e);
        }

    } else if (eventType === "call_recording_ready") {
        const event = payload as CallRecordingReadyEvent;
        const meetingId = event.call_cid.split(":")[1];

        await db
            .update(meetings)
            .set({ transcriptUrl: event.call_recording.url as unknown as string })
            .where(eq(meetings.id, meetingId));
    }

    return NextResponse.json({ status: "ok" });
}
