import React from "react";
import { AudiologistWorkspace } from "@/components/AudiologistWorkspace";

export const metadata = {
  title: "Audiologist Workspace | ENT i-Dhanwantari",
  description: "Pure Tone Audiometry (PTA) Plotter, Tinnitus Sound Therapy, and Speech Discrimination Suite",
};

export default function AudiologistPage() {
  return (
    <main className="min-h-screen bg-slate-950">
      <AudiologistWorkspace />
    </main>
  );
}
