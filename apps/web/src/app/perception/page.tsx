import PerceptionFlow from "@/features/perception/PerceptionFlow";

/**
 * Perception prototype screen: synthetic fixtures only. No live AI, no
 * uploads, no cloud, no speech. Integration target documented in
 * docs/perception-ui-handoff.md.
 */
export default function PerceptionPage() {
  return (
    <main>
      <PerceptionFlow />
    </main>
  );
}
