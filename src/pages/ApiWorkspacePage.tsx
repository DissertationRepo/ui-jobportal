export function ApiWorkspacePage() {
  return (
    <section className="placeholder-page">
      <div className="placeholder-surface">
        <span className="brand-chip">Next integration</span>
        <h2>Second API page ready</h2>
        <p>
          This page is separated from the auth flow so you can plug in another API
          without mixing endpoints, forms, or page-specific state.
        </p>
        <div className="placeholder-grid">
          <div className="placeholder-card">
            <h3>Suggested structure</h3>
            <p>Create a new file in `src/api` for the second API and keep page UI here.</p>
          </div>
          <div className="placeholder-card">
            <h3>Navigation ready</h3>
            <p>Add more page entries in `src/App.tsx` as the app grows.</p>
          </div>
        </div>
      </div>
    </section>
  )
}
