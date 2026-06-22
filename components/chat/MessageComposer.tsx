"use client";

import { useEffect, useRef, useState } from "react";
import { validateAudioFile, validateImageFile } from "@/lib/storage";
import { MAX_VOICE_SECONDS } from "@/lib/constants";

interface MessageComposerProps {
  onSend: (input: { body: string; file: File | null }) => Promise<boolean>;
  onTyping: () => void;
}

const TEXTAREA_MAX_HEIGHT = 140;
const AUDIO_MIME_CANDIDATES = ["audio/webm", "audio/mp4", "audio/ogg"];

function pickAudioMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  return AUDIO_MIME_CANDIDATES.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function MessageComposer({ onSend, onTyping }: MessageComposerProps) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => stopStream(), []);

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function pickFile(chosen: File | null) {
    if (!chosen) return;
    const message = validateImageFile(chosen);
    if (message) {
      setError(message);
      return;
    }
    setError(null);
    setFile(chosen);
    setPreview(URL.createObjectURL(chosen));
  }

  function clearFile() {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
    if (cameraRef.current) cameraRef.current.value = "";
  }

  function resize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, TEXTAREA_MAX_HEIGHT)}px`;
  }

  async function submit() {
    const body = text.trim();
    if ((!body && !file) || sending) return;

    setSending(true);
    const ok = await onSend({ body, file });
    setSending(false);

    if (ok) {
      setText("");
      clearFile();
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  }

  // --- Voice recording -------------------------------------------------------

  async function startRecording() {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Recording is not supported in this browser");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickAudioMime();
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      );
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setElapsed(0);

      let count = 0;
      timerRef.current = setInterval(() => {
        count += 1;
        setElapsed(count);
        if (count >= MAX_VOICE_SECONDS) finishRecording();
      }, 1000);
    } catch {
      setError("Microphone access denied");
      stopStream();
    }
  }

  function finishRecording() {
    const recorder = recorderRef.current;
    if (!recorder) return;
    recorder.onstop = async () => {
      const baseMime = (recorder.mimeType || "audio/webm").split(";")[0]!;
      const ext = baseMime.includes("mp4")
        ? "m4a"
        : baseMime.includes("ogg")
          ? "ogg"
          : "webm";
      const blob = new Blob(chunksRef.current, { type: baseMime });
      stopStream();
      setRecording(false);

      const voiceFile = new File([blob], `voice-${Date.now()}.${ext}`, {
        type: baseMime,
      });
      const invalid = validateAudioFile(voiceFile);
      if (invalid || voiceFile.size === 0) {
        if (invalid) setError(invalid);
        return;
      }
      setSending(true);
      await onSend({ body: "", file: voiceFile });
      setSending(false);
    };
    recorder.stop();
  }

  function cancelRecording() {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = null;
      recorder.stop();
    }
    chunksRef.current = [];
    stopStream();
    setRecording(false);
  }

  const showSend = Boolean(text.trim() || file);

  return (
    <div className="border-t border-black/10 bg-white px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] md:p-3 dark:border-white/10 dark:bg-[#17212b]">
      {error && (
        <p className="px-2 pb-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {preview && !recording && (
        <div className="mb-2 flex items-center gap-2 px-1">
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="attachment preview"
              className="h-16 w-16 rounded-lg object-cover"
            />
            <button
              type="button"
              onClick={clearFile}
              aria-label="Remove attachment"
              className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-xs text-white"
            >
              ×
            </button>
          </div>
          <span className="truncate text-sm text-neutral-500">
            {file?.name}
          </span>
        </div>
      )}

      {recording ? (
        <div className="flex items-center gap-3 px-1">
          <button
            type="button"
            onClick={cancelRecording}
            aria-label="Cancel recording"
            className="rounded-full p-2 text-neutral-500 transition hover:bg-black/5 dark:hover:bg-white/10"
          >
            <TrashIcon />
          </button>
          <span className="flex items-center gap-2 font-medium text-red-500">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
            {formatElapsed(elapsed)}
          </span>
          <span className="flex-1 truncate text-sm text-neutral-500">
            Recording voice message…
          </span>
          <button
            type="button"
            onClick={finishRecording}
            disabled={sending}
            aria-label="Send voice message"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#3390ec] text-white transition hover:bg-[#2b80d6] disabled:opacity-50"
          >
            <SendIcon />
          </button>
        </div>
      ) : (
        <div className="flex items-end gap-2">
          <label
            title="Attach image"
            aria-label="Attach image"
            className="cursor-pointer rounded-full p-2 text-neutral-500 transition hover:bg-black/5 dark:hover:bg-white/10"
          >
            <PaperclipIcon />
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              className="sr-only"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <label
            title="Camera"
            aria-label="Take photo"
            className="cursor-pointer rounded-full p-2 text-neutral-500 transition hover:bg-black/5 dark:hover:bg-white/10"
          >
            <CameraIcon />
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            />
          </label>

          <textarea
            ref={textareaRef}
            value={text}
            rows={1}
            placeholder="Message"
            onChange={(e) => {
              setText(e.target.value);
              resize();
              if (e.target.value.trim()) onTyping();
            }}
            onKeyDown={onKeyDown}
            className="max-h-36 flex-1 resize-none rounded-2xl bg-black/5 px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#3390ec]/30 dark:bg-white/5"
          />

          {showSend ? (
            <button
              type="button"
              onClick={submit}
              disabled={sending}
              title="Send"
              aria-label="Send message"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#3390ec] text-white transition hover:bg-[#2b80d6] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <SendIcon />
            </button>
          ) : (
            <button
              type="button"
              onClick={startRecording}
              disabled={sending}
              title="Record voice message"
              aria-label="Record voice message"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#3390ec] text-white transition hover:bg-[#2b80d6] disabled:opacity-50"
            >
              <MicIcon />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function PaperclipIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21.44 11.05 12.25 20.24a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M3.4 20.4 21 12 3.4 3.6 3 10l12 2-12 2 .4 6.4z" />
    </svg>
  );
}
