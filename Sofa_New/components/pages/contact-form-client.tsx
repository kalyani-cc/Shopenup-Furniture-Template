"use client";

import { useState } from "react";
import { sdk } from "@/lib/config";

export function ContactFormClient() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setError("");

    try {
      const res = await sdk.client.fetch<{ success?: boolean; error?: string }>("/store/custom/contact", {
        method: "POST",
        body: {
          name: name.trim(),
          email: email.trim(),
          message: message.trim(),
        },
        cache: "no-store",
      });

      if (res && "success" in res && res.success) {
        setSuccess(true);
        setName("");
        setEmail("");
        setMessage("");
      } else {
        setError((res && "error" in res && res.error) || "Something went wrong. Please try again.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-stone-200 bg-white p-8 shadow-card">
      <input
        name="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
        required
        autoComplete="name"
        className="w-full rounded-lg border border-stone-300 px-4 py-3 outline-none focus:border-brand"
      />
      <input
        name="email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
        autoComplete="email"
        className="w-full rounded-lg border border-stone-300 px-4 py-3 outline-none focus:border-brand"
      />
      <textarea
        name="message"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Your message"
        rows={5}
        required
        minLength={3}
        className="w-full rounded-lg border border-stone-300 px-4 py-3 outline-none focus:border-brand"
      />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {success ? (
        <p className="text-sm text-emerald-700">Thank you — your message was sent. We will reply soon.</p>
      ) : null}
      <button
        type="submit"
        disabled={loading}
        className="rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
      >
        {loading ? "Sending…" : "Send Message"}
      </button>
    </form>
  );
}
