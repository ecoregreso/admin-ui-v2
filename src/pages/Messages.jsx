import React, { useEffect, useMemo, useState } from "react";
import {
  savePublicKey,
  fetchPublicKey,
  sendMessage,
  listMessages,
  markMessageRead,
  deleteMessage as apiDeleteMessage,
} from "../api/messagesApi";
import { useStaffAuth } from "../context/StaffAuthContext.jsx";

const LOCAL_PRIVATE_KEY = "ptu_staff_private_key";
const LOCAL_PUBLIC_KEY = "ptu_staff_public_key";

function bufferToBase64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function base64ToBuffer(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

async function generateKeyPair() {
  const key = await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );
  const pub = await window.crypto.subtle.exportKey("jwk", key.publicKey);
  const priv = await window.crypto.subtle.exportKey("jwk", key.privateKey);
  return { publicKeyJwk: pub, privateKeyJwk: priv };
}

async function importPublicKey(jwk) {
  return crypto.subtle.importKey(
    "jwk",
    typeof jwk === "string" ? JSON.parse(jwk) : jwk,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["encrypt"]
  );
}

async function importPrivateKey(jwk) {
  return crypto.subtle.importKey(
    "jwk",
    typeof jwk === "string" ? JSON.parse(jwk) : jwk,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["decrypt"]
  );
}

async function encryptForBoth({ message, senderPubJwk, recipientPubJwk }) {
  const enc = new TextEncoder();
  const messageBuf = enc.encode(message);

  // AES key
  const aesKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipherBuf = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aesKey, messageBuf);
  const rawAes = await crypto.subtle.exportKey("raw", aesKey);

  // Encrypt AES key for recipient and sender
  const recipientPub = await importPublicKey(recipientPubJwk);
  const senderPub = await importPublicKey(senderPubJwk);
  const keyForRecipient = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, recipientPub, rawAes);
  const keyForSender = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, senderPub, rawAes);

  return {
    enc: bufferToBase64(cipherBuf),
    iv: bufferToBase64(iv.buffer),
    kr: bufferToBase64(keyForRecipient),
    ks: bufferToBase64(keyForSender),
  };
}

async function decryptEnvelope({ envelope, privateKeyJwk, isRecipient }) {
  const priv = await importPrivateKey(privateKeyJwk);
  const keyB64 = isRecipient ? envelope.kr : envelope.ks;
  const rawAes = await crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    priv,
    base64ToBuffer(keyB64)
  );
  const aesKey = await crypto.subtle.importKey("raw", rawAes, { name: "AES-GCM" }, false, [
    "decrypt",
  ]);
  const plainBuf = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(base64ToBuffer(envelope.iv)) },
    aesKey,
    base64ToBuffer(envelope.enc)
  );
  return new TextDecoder().decode(plainBuf);
}

export default function Messages() {
  const { staff } = useStaffAuth();
  const [privateKey, setPrivateKey] = useState(null);
  const [publicKey, setPublicKey] = useState(null);
  const [status, setStatus] = useState("");
  const [target, setTarget] = useState("");
  const [type, setType] = useState("text");
  const [content, setContent] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const hasKeys = useMemo(() => !!privateKey && !!publicKey, [privateKey, publicKey]);

  useEffect(() => {
    try {
      const pub = localStorage.getItem(LOCAL_PUBLIC_KEY);
      const priv = localStorage.getItem(LOCAL_PRIVATE_KEY);
      if (pub && priv) {
        setPublicKey(JSON.parse(pub));
        setPrivateKey(JSON.parse(priv));
      }
    } catch (e) {
      console.error("[Keys] load error:", e);
    }
  }, []);

  async function handleGenerateKeys() {
    setStatus("Generating keys...");
    setError("");
    try {
      const { publicKeyJwk, privateKeyJwk } = await generateKeyPair();
      localStorage.setItem(LOCAL_PUBLIC_KEY, JSON.stringify(publicKeyJwk));
      localStorage.setItem(LOCAL_PRIVATE_KEY, JSON.stringify(privateKeyJwk));
      setPublicKey(publicKeyJwk);
      setPrivateKey(privateKeyJwk);
      await savePublicKey(JSON.stringify(publicKeyJwk));
      setStatus("Keys generated and uploaded.");
    } catch (err) {
      console.error(err);
      setError("Failed to generate or save keys");
      setStatus("");
    }
  }

  async function loadMessages(username) {
    if (!username) return;
    setLoading(true);
    setError("");
    try {
      const res = await listMessages({ withUser: username });
      setMessages(res.messages || []);
      // Mark unread addressed to me
      for (const m of res.messages || []) {
        if (m.toId === staff?.id && !m.readAt) {
          markMessageRead(m.id).catch(() => {});
        }
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load messages");
    } finally {
      setLoading(false);
    }
  }

  async function handleSend(e) {
    e.preventDefault();
    setError("");
    setStatus("");
    if (!hasKeys) return setError("Generate/upload your key first.");
    if (!target.trim()) return setError("Enter a recipient username.");
    if (!content.trim()) return setError("Enter a message.");
    try {
      // fetch recipient public key
      const keyRes = await fetchPublicKey(target.trim());
      const recipientKey = keyRes.key?.publicKey;
      if (!recipientKey) throw new Error("Recipient key not found");

      // build envelope
      const envelope = await encryptForBoth({
        message: JSON.stringify({ type, body: content }),
        senderPubJwk: publicKey,
        recipientPubJwk: recipientKey,
      });

      await sendMessage({
        to: target.trim(),
        ciphertext: JSON.stringify(envelope),
        type,
      });
      setContent("");
      setStatus("Sent");
      await loadMessages(target.trim());
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to send message");
    }
  }

  async function renderBody(msg) {
    try {
      const envelope = JSON.parse(msg.ciphertext);
      const plaintext = await decryptEnvelope({
        envelope,
        privateKeyJwk: privateKey,
        isRecipient: msg.toId === staff?.id,
      });
      const parsed = JSON.parse(plaintext);
      return parsed.body || plaintext;
    } catch {
      return "[Cannot decrypt]";
    }
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="card-title">Secure Messages</div>
        <div className="card-subtext">Send encrypted POs/requests between staff.</div>
        {error && <div className="mt-2 text-sm text-red-400">{error}</div>}
        {status && <div className="mt-2 text-sm text-emerald-300">{status}</div>}

        <div className="mt-3 flex flex-wrap gap-3 items-center">
          <button className="btn-primary" onClick={handleGenerateKeys}>
            {hasKeys ? "Regenerate keys" : "Generate & upload keys"}
          </button>
          {hasKeys && <div className="text-xs text-slate-400">Keys stored locally.</div>}
        </div>
      </div>

      <div className="card">
        <div className="card-title">Compose</div>
        <form className="mt-3 flex flex-col gap-3" onSubmit={handleSend}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="flex flex-col gap-1 text-xs text-slate-300">
              To (username)
              <input
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-sm text-slate-100"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-300">
              Type
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-sm text-slate-100"
              >
                <option value="text">Text</option>
                <option value="purchase_order">Purchase Order</option>
                <option value="service_request">Service Request</option>
              </select>
            </label>
            <div className="flex items-end">
              <button className="btn-primary w-full" type="submit" disabled={loading}>
                {loading ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
          <textarea
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your message / PO / request..."
            className="px-3 py-2 rounded bg-slate-900 border border-slate-700 text-sm text-slate-100"
          />
        </form>
      </div>

      <div className="card">
        <div className="card-title">Thread</div>
        <div className="card-subtext">
          Enter a username above and click “Send” or “Load” to view the conversation.
        </div>
        <div className="mt-3">
          <button
            className="btn-secondary"
            onClick={() => loadMessages(target.trim())}
            disabled={!target.trim() || loading}
          >
            {loading ? "Loading..." : "Load thread"}
          </button>
        </div>

        <div className="mt-3 flex flex-col gap-2">
          {messages.length === 0 && <div className="text-sm text-slate-400">No messages yet.</div>}
          {messages.map((m) => (
            <MessageRow
              key={m.id}
              msg={m}
              isMe={m.fromId === staff?.id}
              fromLabel={m.fromId === staff?.id ? "You" : m.fromUsername || m.fromId}
              toLabel={m.toId === staff?.id ? "You" : m.toUsername || m.toId}
              decrypt={() => renderBody(m)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function MessageRow({ msg, isMe, decrypt, fromLabel, toLabel }) {
  const [body, setBody] = useState("[Decrypting...]");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let mounted = true;
    decrypt().then((b) => mounted && setBody(b));
    return () => {
      mounted = false;
    };
  }, [msg.id, decrypt]);

  return (
    <div
      className="p-3 rounded border"
      style={{
        borderColor: isMe ? "rgba(99,199,255,0.6)" : "rgba(255,255,255,0.08)",
        background: isMe ? "rgba(99,199,255,0.08)" : "rgba(255,255,255,0.02)",
      }}
    >
      <div className="flex justify-between text-xs text-slate-400 mb-1">
        <div className="flex gap-2">
          <span>From: <strong>{fromLabel || "Unknown"}</strong></span>
          <span>To: <strong>{toLabel || "Unknown"}</strong></span>
        </div>
        <span>{new Date(msg.createdAt).toLocaleString()}</span>
      </div>
      <div className="text-sm text-slate-100 whitespace-pre-wrap break-words">{body}</div>
      <div className="mt-1 text-[11px] text-slate-500 uppercase tracking-[0.08em]">
        Type: {msg.type || "text"}
      </div>
      {isMe && (
        <div className="mt-2 flex justify-end">
          <button
            className="text-red-300 hover:text-red-200 text-xs"
            disabled={deleting}
            onClick={async () => {
              setDeleting(true);
              try {
                await apiDeleteMessage(msg.id);
              } catch (err) {
                console.error(err);
              } finally {
                setDeleting(false);
              }
            }}
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      )}
    </div>
  );
}
