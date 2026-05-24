import React from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

function App() {
  return (
    <main className="min-h-screen bg-field text-ink">
      <section className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-12">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-pine">
          Tax Lien Intelligence Platform
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-normal sm:text-5xl">
          Turn county parcel data into structured investment decisions.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-ink/75">
          Phase 1 establishes the production baseline: React frontend, Express API,
          MongoDB connection package, strict TypeScript, tests, and documentation.
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {["Upload datasets", "Score liens", "Build a watchlist"].map((label) => (
            <div key={label} className="border border-line bg-white p-4 text-sm font-medium">
              {label}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

const root = document.getElementById("root");
if (!root) {
  throw new Error("React root element was not found.");
}

createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
