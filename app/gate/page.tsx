"use client";

import { FormEvent, useState } from "react";
import { LockKeyhole, LogIn } from "lucide-react";

export default function GatePage() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const response = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error || "Acceso denegado.");
      setLoading(false);
      return;
    }

    window.location.href = new URLSearchParams(window.location.search).get("next") || "/";
  }

  return (
    <main className="gate-shell">
      <form className="gate-panel" onSubmit={submit}>
        <div className="gate-mark">
          <LockKeyhole aria-hidden="true" size={24} />
        </div>
        <h1>Invictus Venice</h1>
        <label htmlFor="access-code">Codigo Invictus</label>
        <div className="gate-field">
          <input
            id="access-code"
            type="password"
            value={code}
            autoFocus
            onChange={(event) => setCode(event.target.value)}
          />
          <button type="submit" disabled={loading || !code.trim()} title="Entrar">
            <LogIn aria-hidden="true" size={18} />
            {loading ? "Entrando" : "Entrar"}
          </button>
        </div>
        {error ? <p className="gate-error">{error}</p> : null}
      </form>
    </main>
  );
}
