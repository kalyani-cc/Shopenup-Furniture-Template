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
    <div className="rounded-[2.5rem] bg-white p-8 lg:p-12 shadow-[0_15px_50px_-15px_rgba(0,0,0,0.1)] border border-stone-100">
      <div className="mb-10">
        <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400 mb-2">WRITE TO US</h4>
        <h2 className="text-3xl font-bold text-stone-900 leading-tight">
          Request a <span className="text-brand">consultation</span>
        </h2>

        <p className="mt-4 text-sm leading-relaxed text-stone-500">
          Share your name, the best way to reach you, and a short project note. The more context you give (city, scope, timeline), the faster we can respond with relevant options.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400 mb-3 block">FULL NAME</label>
          <input
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your full name"
            required
            className="w-full rounded-2xl border border-stone-200 bg-white px-6 py-4 text-sm outline-none transition focus:border-brand focus:ring-1 focus:ring-brand/20 placeholder:text-stone-300"
          />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400 mb-3 block">EMAIL ADDRESS</label>
            <input
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              required
              className="w-full rounded-2xl border border-stone-200 bg-white px-6 py-4 text-sm outline-none transition focus:border-brand focus:ring-1 focus:ring-brand/20 placeholder:text-stone-300"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400 mb-3 block">PHONE</label>
            <input
              name="phone"
              type="tel"
              placeholder="Enter your phone number"
              className="w-full rounded-2xl border border-stone-200 bg-white px-6 py-4 text-sm outline-none transition focus:border-brand focus:ring-1 focus:ring-brand/20 placeholder:text-stone-300"
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400 mb-3 block">PROJECT DETAILS</label>
          <textarea
            name="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tell us about your project — location, timeline, and any specific inspiration you have in mind..."
            rows={5}
            required
            className="w-full rounded-2xl border border-stone-200 bg-white px-6 py-4 text-sm outline-none transition focus:border-brand focus:ring-1 focus:ring-brand/20 placeholder:text-stone-300"
          />
        </div>

        {error ? <p className="text-sm text-red-600 px-2">{error}</p> : null}
        {success ? (
          <p className="text-sm text-emerald-700 px-2">Thank you — your request was sent. We will contact you shortly.</p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="group flex w-full sm:w-auto items-center justify-center gap-4 rounded-xl bg-brand px-10 py-5 text-lg font-bold text-white shadow-xl shadow-brand/20 transition hover:bg-brand-dark disabled:opacity-60"
        >
          {loading ? "Sending…" : (
            <>
              Send Message
              <svg className="w-5 h-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </>
          )}
        </button>

      </form>
    </div>
  );
}

