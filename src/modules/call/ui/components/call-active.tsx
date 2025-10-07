import Link from "next/link";
import Image from "next/image";
import {
    CallControls,
    SpeakerLayout,
} from "@stream-io/video-react-sdk";

interface Props {
    onLeave: () => void;
    meetingName: string;
};

export const CallActive = ({ onLeave, meetingName }: Props) => {
    return (

        <div className="relative h-screen w-full bg-black text-white p-4 flex flex-col gap-4">


            <div className="bg-[#1c1e22] rounded-lg px-4 py-2 flex items-center gap-2">
                <Link href="/" className="flex items-center justify-center p-1 bg-white/10 rounded-full w-fit">
                    <Image src="/logo.svg" width={22} height={22} alt="Logo" />
                </Link>
                <h4 className="text-base">
                    {meetingName}
                </h4>
            </div>
            <div className="flex-1 w-full">
                <SpeakerLayout />
            </div>
            <div className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2">
                <div className="bg-[#1c1e22] rounded-full px-4 py-2">
                    <CallControls onLeave={onLeave} />
                </div>
            </div>

        </div>
    );
};