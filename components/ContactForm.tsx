"use client";

import { useRef, useState } from "react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function ContactForm() {
  const [sent, setSent] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const topicRef = useRef<HTMLSelectElement>(null);
  const msgRef = useRef<HTMLTextAreaElement>(null);
  const checkRef = useRef<HTMLInputElement>(null);
  const agreeRef = useRef<HTMLDivElement>(null);
  const protoRef = useRef<HTMLDivElement>(null);

  const invalidate = (field: HTMLElement, row: HTMLElement, msgEl: HTMLElement | null, msg: string) => {
    row.classList.add("invalid");
    if (msgEl) msgEl.textContent = msg;
    field.setAttribute("aria-invalid", "true");
  };

  const validate = () => {
    let ok = true;
    [nameRef.current, emailRef.current, topicRef.current, msgRef.current].forEach((f) => {
      f?.removeAttribute("aria-invalid");
      f?.closest(".frow")?.classList.remove("invalid");
    });
    agreeRef.current?.classList.remove("invalid");

    if (!nameRef.current!.value.trim()) {
      invalidate(nameRef.current!, nameRef.current!.closest(".frow")!, document.getElementById("err-name"), "Please enter your name.");
      ok = false;
    }
    const email = emailRef.current!.value.trim();
    if (!email) {
      invalidate(emailRef.current!, emailRef.current!.closest(".frow")!, document.getElementById("err-email"), "Please enter your email address.");
      ok = false;
    } else if (!EMAIL_RE.test(email)) {
      invalidate(emailRef.current!, emailRef.current!.closest(".frow")!, document.getElementById("err-email"), "Please enter a valid email address.");
      ok = false;
    }
    if (!topicRef.current!.value) {
      invalidate(topicRef.current!, topicRef.current!.closest(".frow")!, document.getElementById("err-topic"), "Please choose a topic.");
      ok = false;
    }
    const msg = msgRef.current!.value.trim();
    if (!msg) {
      invalidate(msgRef.current!, msgRef.current!.closest(".frow")!, document.getElementById("err-msg"), "Please write a message.");
      ok = false;
    } else if (msg.length < 20) {
      invalidate(msgRef.current!, msgRef.current!.closest(".frow")!, document.getElementById("err-msg"), "Please write at least 20 characters so we can understand the issue.");
      ok = false;
    }
    if (!checkRef.current!.checked) {
      agreeRef.current?.classList.add("invalid");
      ok = false;
    }
    return ok;
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSent(true);
    requestAnimationFrame(() => protoRef.current?.focus());
  };

  const onInput = (e: React.FormEvent<HTMLFormElement>) => {
    const t = e.target as HTMLElement;
    const row = t.closest(".frow");
    if (row) {
      row.classList.remove("invalid");
      t.removeAttribute("aria-invalid");
    }
  };

  return (
    <>
      <form
        className="ct-form"
        id="ct-form"
        noValidate={true}
        ref={formRef}
        onSubmit={onSubmit}
        onInput={onInput}
        style={sent ? { display: "none" } : undefined}
      >
        <div className="frow">
          <label htmlFor="ct-name">Name <span className="req" aria-hidden="true">*</span></label>
          <input type="text" id="ct-name" name="name" placeholder="Your name" autoComplete="name" required={true} ref={nameRef} />
          <span className="err" id="err-name"></span>
        </div>
        <div className="frow">
          <label htmlFor="ct-email">Email <span className="req" aria-hidden="true">*</span></label>
          <input type="email" id="ct-email" name="email" placeholder="you@example.com" autoComplete="email" required={true} ref={emailRef} />
          <span className="err" id="err-email"></span>
        </div>
        <div className="frow">
          <label htmlFor="ct-topic">Topic <span className="req" aria-hidden="true">*</span></label>
          <div className="ct-select">
            <select id="ct-topic" name="topic" required={true} ref={topicRef}>
              <option value="">Select a topic…</option>
              <option value="general">General Question</option>
              <option value="technical">Technical Support</option>
              <option value="deployment">Deployment Issue</option>
              <option value="security">Security</option>
              <option value="partnership">Partnership</option>
              <option value="other">Other</option>
            </select>
            <i className="fa-solid fa-chevron-down" aria-hidden="true"></i>
          </div>
          <span className="err" id="err-topic"></span>
        </div>
        <div className="frow">
          <label htmlFor="ct-msg">Message <span className="req" aria-hidden="true">*</span></label>
          <textarea id="ct-msg" name="message" placeholder="How can we help?" required={true} ref={msgRef}></textarea>
          <span className="err" id="err-msg"></span>
        </div>
        <div className="ct-check" id="ct-agree" ref={agreeRef}>
          <input type="checkbox" id="ct-check" name="security-ack" ref={checkRef} />
          <label htmlFor="ct-check"><span>I understand that BNB Token Maker will never ask for my seed phrase or private key.</span></label>
          <span className="err" id="err-check"></span>
        </div>
        <div className="ct-send">
          <button className="btn btn-dark btn-lg" type="submit">
            Send Message
            <i className="fa-solid fa-paper-plane" aria-hidden="true"></i>
          </button>
          <p className="ct-formnote">Contact form delivery will be enabled when the production support system is connected.</p>
        </div>
      </form>

      <div
        className="ct-proto"
        id="ct-proto"
        role="status"
        tabIndex={-1}
        ref={protoRef}
        style={sent ? { display: "block" } : undefined}
      >
          <div className="pc-ic" aria-hidden="true"><i className="fa-solid fa-paper-plane"></i></div>
          <h2>Message validated — not sent yet</h2>
          <p>This is a static prototype, so nothing was transmitted anywhere. Contact form delivery will be enabled when the production support system is connected.</p>
      </div>
    </>
  );
}