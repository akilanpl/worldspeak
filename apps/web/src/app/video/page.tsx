import VideoFlow from "@/features/video/VideoFlow";

/**
 * Video interaction prototype: synthetic tracking fixtures only. No live
 * AI, no uploads, no cloud, no speech. Integration target documented in
 * docs/video-ui-handoff.md.
 */
export default function VideoPage() {
  return (
    <main>
      <VideoFlow />
    </main>
  );
}
