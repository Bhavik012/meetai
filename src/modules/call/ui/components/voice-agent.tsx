"use client";

import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import {
    LiveKitRoom,
    RoomAudioRenderer,
    VoiceAssistantControlBar,
    BarVisualizer,
} from "@livekit/components-react";
import { useEffect, useState } from "react";
import { LoaderIcon } from "lucide-react";

import "@livekit/components-styles";

interface Props {
    meetingId: string;
}

export const VoiceAgent = ({ meetingId }: Props) => {
    const trpc = useTRPC();
    const [token, setToken] = useState<string>();

    const { mutateAsync: generateToken } = useMutation(
        trpc.meetings.generateLiveKitToken.mutationOptions()
    );

    useEffect(() => {
        const fetchToken = async () => {
            const t = await generateToken({ meetingId });
            setToken(t);
        };
        fetchToken();
    }, [meetingId, generateToken]);

    if (!token) {
        return (
            <div className="flex items-center gap-x-2 text-sm text-muted-foreground">
                <LoaderIcon className="size-4 animate-spin" />
                Connecting AI Agent...
            </div>
        );
    }

    return (
        <LiveKitRoom
            token={token}
            serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
            connect={true}
            audio={true}
            video={false}
            className="flex flex-col h-full"
        >
            <div className="flex flex-col items-center justify-center gap-y-4 p-4 bg-white/5 rounded-xl border border-white/10 backdrop-blur-sm">
                <div className="size-20 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/50 relative">
                    <BarVisualizer />
                </div>
                <div className="text-center">
                    <p className="text-sm font-medium text-white">AI Meeting Assistant</p>
                    <p className="text-xs text-white/60">Listening & Recording</p>
                </div>
                <VoiceAssistantControlBar />
            </div>
            <RoomAudioRenderer />
        </LiveKitRoom>
    );
};
