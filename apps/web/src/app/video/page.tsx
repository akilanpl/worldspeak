import VideoFlow from "@/features/video/VideoFlow";

/**
 * Local manual frame interaction plus clearly labeled synthetic tracks. No live
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
