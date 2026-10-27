import OfflineStatus from "@/components/OfflineStatus";

export default function OfflinePage() {
  return (
    <section className="panel" aria-labelledby="offline-h">
      <h2 id="offline-h">Offline board</h2>
      <OfflineStatus />
      <p className="status">
        The static board needs no sign-in, no network, and no cloud. Prepare it once while online,
        then open it in airplane mode.
      </p>
      <p>
        <a className="btn" href="/offline/index.html" style={{ textDecoration: "none", display: "inline-block" }}>
          Open offline board
        </a>
      </p>
      <p className="status">Network restoration never uploads or invokes anything.</p>
    </section>
  );
}
