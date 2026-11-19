"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, MessageCircle, Sparkles } from "lucide-react";
import { z } from "zod";
import { FeatureHeading, Place, type FeatureProps } from "./shared";

const replySchema = z.object({
  answer: z.string(),
  mode: z.enum(["ai", "rules"]),
  notice: z.string(),
  actions: z.array(z.string()),
});
type Reply = z.infer<typeof replySchema>;
type Turn = { question: string; reply: Reply };
const examples = [
  "Can my family go for a walk today?",
  "How can I improve indoor air on a small budget?",
  "Would switching to rail reduce my commute emissions?",
];

export default function Assistant({ profile, demo }: FeatureProps) {
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    if (turns.length) end.current?.scrollIntoView({ block: "nearest" });
  }, [turns.length]);
  async function ask(text: string) {
    const message = text.trim();
    if (!message || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setError("");
    setPending(message);
    setQuestion("");
    try {
      const history = turns.slice(-2).flatMap((turn) => [
        { role: "user", content: turn.question.slice(0, 700) },
        { role: "assistant", content: turn.reply.answer.slice(0, 700) },
      ]);
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          message,
          profile,
          mode: demo ? "demo" : "live",
          history,
        }),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(
          typeof body.error === "string"
            ? body.error
            : "The assistant is unavailable. Try again.",
        );
      const reply = replySchema.parse(body);
      setTurns((current) =>
        [...current, { question: message, reply }].slice(-12),
      );
    } catch (reason) {
      if (!controller.signal.aborted) {
        setError(
          reason instanceof Error && !(reason instanceof z.ZodError)
            ? reason.message
            : "The assistant could not read the response. Try again.",
        );
        setQuestion(message);
      }
    } finally {
      request.current = null;
      if (!controller.signal.aborted) setPending("");
    }
  }
  return (
    <div className="page ft-page">
      <FeatureHeading
        title="Vayu AI assistant"
        description="Ask about daily routines, lower-emission travel or indoor air."
      >
        <Place profile={profile} />
      </FeatureHeading>
      <section className="ft-panel ft-chat">
        <div className="ft-chat-bar">
          <span className="ft-icon">
            <Sparkles size={19} />
          </span>
          <div>
            <strong>Vayu</strong>
            <small>
              {profile.persona} profile ·{" "}
              {demo ? "Sample data" : "Live data requested"}
            </small>
          </div>
          {turns.length > 0 && (
            <button
              className="ft-secondary"
              disabled={Boolean(pending)}
              onClick={() => {
                setTurns([]);
                setError("");
              }}
            >
              New chat
            </button>
          )}
        </div>
        <div className="ft-turns" role="log" aria-live="polite">
          {!turns.length && !pending && (
            <div className="ft-empty">
              <MessageCircle size={28} />
              <h2>What’s on your mind?</h2>
              <p>Choose a question or write your own.</p>
              <div className="ft-prompts">
                {examples.map((example) => (
                  <button
                    className="ft-secondary"
                    key={example}
                    onClick={() => ask(example)}
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          )}
          {turns.map((turn, i) => (
            <div key={i} className="ft-turn">
              <div className="ft-question">
                <small>You</small>
                <p>{turn.question}</p>
              </div>
              <div className="ft-reply">
                <strong>
                  {turn.reply.mode === "ai"
                    ? "Vayu · AI assisted"
                    : "Vayu · Rule-based guidance"}
                </strong>
                <p>{turn.reply.answer}</p>
                {turn.reply.actions.length > 0 && (
                  <ul>
                    {turn.reply.actions.map((action, i) => (
                      <li key={i}>{action}</li>
                    ))}
                  </ul>
                )}
                {turn.reply.notice && <small>{turn.reply.notice}</small>}
              </div>
            </div>
          ))}
          {pending && (
            <div className="ft-turn">
              <div className="ft-question">{pending}</div>
              <p role="status">Preparing your guidance…</p>
            </div>
          )}
          <div ref={end} />
        </div>
        {error && <p role="alert">{error}</p>}
        <form
          className="ft-compose"
          onSubmit={(e) => {
            e.preventDefault();
            void ask(question);
          }}
        >
          <label className="ft-field">
            <span>Message Vayu</span>
            <textarea
              rows={2}
              maxLength={800}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask about your household’s air quality…"
            />
          </label>
          <button
            className="ft-btn"
            type="submit"
            aria-label="Send message"
            disabled={!question.trim() || Boolean(pending)}
          >
            <ArrowUp size={19} />
          </button>
        </form>
      </section>
      <p className="ft-muted">
        Questions and selected profile details are sent to the assistant. For
        individual health concerns, consult a qualified professional.
      </p>
    </div>
  );
}
