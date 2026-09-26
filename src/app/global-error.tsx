'use client';

// Replaces the root layout when it fails: no app styles here, so keep it self-contained.
export default function GlobalError({ retry }: { error: Error; retry: () => void }) {
  return (
    <html lang="it">
      <body
        style={{
          fontFamily: 'system-ui, sans-serif',
          display: 'grid',
          placeItems: 'center',
          minHeight: '100vh',
          margin: 0,
          textAlign: 'center',
        }}
      >
        <title>Errore · Scaffale</title>
        <div>
          <p style={{ fontWeight: 600 }}>Qualcosa è andato storto</p>
          <p style={{ opacity: 0.7 }}>Scaffale non è riuscito a caricarsi.</p>
          <button type="button" onClick={() => retry()} style={{ padding: '0.5rem 1rem' }}>
            Riprova
          </button>
        </div>
      </body>
    </html>
  );
}
