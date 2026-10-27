import Workspace from "@/features/composer/Workspace";

export default function HomePage() {
  return (
    <>
      <section className="panel" aria-labelledby="future-h" style={{ marginBottom: "1rem" }}>
        <h2 id="future-h">Coming in later phases</h2>
        <p className="status">
          Sign-in, saved history, camera, and assisted wording are not part of this local slice.
          The essential board below works fully offline after one online visit.
        </p>
        <p>
          <a className="btn btn-secondary" href="/offline" style={{ textDecoration: "none", display: "inline-block" }}>
            Open offline board
          </a>
        </p>
      </section>
      <Workspace />
    </>
  );
}
