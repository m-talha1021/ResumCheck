"use client";

import { useState } from "react";

export default function ContactForm() {
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [sending, setSending] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    setSending(true);
    setStatus(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Could not send message.");
      setStatus({ ok: true, msg: "Thanks! Your message has been received." });
      form.reset();
    } catch (err) {
      setStatus({ ok: false, msg: (err as Error).message });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="contact-card">
      <h3>Send a Message</h3>
      {status && <div className={`alert ${status.ok ? "success" : "error"}`}>{status.msg}</div>}
      <form onSubmit={submit}>
        <label>Full Name<input name="name" required maxLength={120} placeholder="Enter your full name" /></label>
        <label>Email Address<input name="email" type="email" required maxLength={160} placeholder="Enter your email" /></label>
        <label>Subject<input name="subject" required maxLength={200} placeholder="Enter message subject" /></label>
        <label>Message<textarea name="message" rows={5} required maxLength={3000} placeholder="Write your message here..." /></label>
        <button className="analyze-btn" type="submit" disabled={sending}>
          <i className="fa-solid fa-paper-plane" /> {sending ? "Sending..." : "Send Message"}
        </button>
      </form>
    </div>
  );
}
