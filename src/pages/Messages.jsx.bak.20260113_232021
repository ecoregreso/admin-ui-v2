import React, { useEffect, useMemo, useState } from "react";
import {
  savePublicKey,
  fetchPublicKey,
  fetchSelfKey,
  sendMessage,
  listMessages,
  markMessageRead,
  deleteMessage as apiDeleteMessage,
  deleteThread,
  deleteInbox,
} from "../api/messagesApi";
import {
  getVapidPublicKey,
  listPushDevices,
  registerPushDevice,
  deletePushDevice,
  sendPushTest,
} from "../api/pushApi";
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

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
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
  const [privateKeyInput, setPrivateKeyInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [threadList, setThreadList] = useState([]);
  const [pushDevices, setPushDevices] = useState([]);
  const [pushLabel, setPushLabel] = useState("");
  const [mobileToken, setMobileToken] = useState("");
  const [mobileType, setMobileType] = useState("fcm");
  const [pushStatus, setPushStatus] = useState("");
  const [pushError, setPushError] = useState("");
  const [pushLoading, setPushLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [error, setError] = useState("");

  const hasKeys = useMemo(() => !!privateKey && !!publicKey, [privateKey, publicKey]);
  const canPush = useMemo(
    () => ["owner", "agent", "operator", "distributor"].includes(staff?.role),
    [staff?.role]
  );

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
      const pubStr = JSON.stringify(publicKeyJwk);
      const privStr = JSON.stringify(privateKeyJwk);
      localStorage.setItem(LOCAL_PUBLIC_KEY, pubStr);
      localStorage.setItem(LOCAL_PRIVATE_KEY, privStr);
      setPublicKey(publicKeyJwk);
      setPrivateKey(privateKeyJwk);
      await savePublicKey(pubStr, privStr);
      setStatus("Keys generated and uploaded.");
    } catch (err) {
      console.error(err);
      setError("Failed to generate or save keys");
      setStatus("");
    }
  }

  function buildThreads(msgs = []) {
    const map = new Map();
    for (const m of msgs) {
      const otherId = m.fromId === staff?.id ? m.toId : m.fromId;
      const otherName = m.fromId === staff?.id ? m.toUsername || m.toId : m.fromUsername || m.fromId;
      if (!otherId) continue;
      const key = m.threadId || `${staff?.id}-${otherId}`;
      const entry = map.get(key) || {
        threadId: key,
        username: otherName,
        otherId,
        unread: 0,
        lastAt: m.createdAt,
      };
      const existingTs = new Date(entry.lastAt).getTime();
      const newTs = new Date(m.createdAt).getTime();
      if (newTs > existingTs) entry.lastAt = m.createdAt;
      if (m.toId === staff?.id && !m.readAt) entry.unread += 1;
      map.set(key, entry);
    }
    return Array.from(map.values()).sort((a, b) => new Date(b.lastAt) - new Date(a.lastAt));
  }

  async function loadInbox() {
    setLoading(true);
    setError("");
    try {
      const res = await listMessages({});
      const msgs = res.messages || [];
      setThreadList(buildThreads(msgs));
      if (!target.trim()) {
        setMessages(msgs);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load inbox");
    } finally {
      setLoading(false);
    }
  }

  async function loadThread(username) {
    if (!username) {
      setMessages([]);
      return;
    }
    setLoadingThread(true);
    setError("");
    try {
      const res = await listMessages({ withUser: username });
      setMessages(res.messages || []);
      for (const m of res.messages || []) {
        if (m.toId === staff?.id && !m.readAt) {
          markMessageRead(m.id).catch(() => {});
        }
      }
      setTarget(username);
      setThreadList((prev) =>
        prev.map((t) => (t.username === username ? { ...t, unread: 0 } : t))
      );
    } catch (err) {
      console.error(err);
      setError("Failed to load thread");
    } finally {
      setLoadingThread(false);
    }
  }

  // Auto-populate inbox on sign-in / page open
  useEffect(() => {
    if (staff?.id) {
      loadInbox();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staff?.id]);

  // If private key missing, try to pull stored key from server
  useEffect(() => {
    async function fetchOwnKey() {
      try {
        const res = await fetchSelfKey();
        if (res?.key?.encryptedPrivateKey) {
          const priv = JSON.parse(res.key.encryptedPrivateKey);
          localStorage.setItem(LOCAL_PRIVATE_KEY, JSON.stringify(priv));
          setPrivateKey(priv);
        }
        if (res?.key?.publicKey) {
          const pub = JSON.parse(res.key.publicKey);
          localStorage.setItem(LOCAL_PUBLIC_KEY, JSON.stringify(pub));
          setPublicKey(pub);
        }
      } catch (err) {
        console.warn("[Keys] no stored key on server", err?.message || err);
      }
    }
    if (staff?.id && !privateKey) {
      fetchOwnKey();
    }
  }, [staff?.id, privateKey]);

  async function refreshPushDevices() {
    if (!canPush) return;
    setPushLoading(true);
    setPushError("");
    try {
      const res = await listPushDevices();
      setPushDevices(res.devices || []);
    } catch (err) {
      console.error(err);
      setPushError("Failed to load push devices");
    } finally {
      setPushLoading(false);
    }
  }

  useEffect(() => {
    if (canPush) {
      refreshPushDevices();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canPush]);

  async function handleEnableWebPush() {
    setPushStatus("");
    setPushError("");
    try {
      if (!("serviceWorker" in navigator)) {
        return setPushError("Service worker not supported in this browser");
      }
      if (!("PushManager" in window)) {
        return setPushError("Push notifications not supported in this browser");
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        return setPushError("Notification permission denied");
      }
      const vapidRes = await getVapidPublicKey();
      const appKey = urlBase64ToUint8Array(vapidRes.publicKey);
      const registration = await navigator.serviceWorker.register("/push-sw.js");
      const existing = await registration.pushManager.getSubscription();
      const sub =
        existing ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: appKey,
        }));
      await registerPushDevice({
        deviceType: "web",
        subscription: sub.toJSON(),
        label: pushLabel.trim() || "Browser",
        platform: navigator.userAgent,
      });
      setPushStatus("Browser push enabled.");
      await refreshPushDevices();
    } catch (err) {
      console.error(err);
      setPushError("Failed to enable browser push");
    }
  }

  async function handleRegisterMobileToken() {
    setPushStatus("");
    setPushError("");
    if (!mobileToken.trim()) return setPushError("Enter a device token");
    try {
      await registerPushDevice({
        deviceType: mobileType,
        token: mobileToken.trim(),
        label: pushLabel.trim() || "Mobile device",
        platform: mobileType.toUpperCase(),
      });
      setPushStatus("Mobile device registered.");
      setMobileToken("");
      await refreshPushDevices();
    } catch (err) {
      console.error(err);
      setPushError("Failed to register mobile device");
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
      await loadThread(target.trim());
      await loadInbox();
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to send message");
    }
  }

  async function renderBody(msg) {
    if (!privateKey) return msg.ciphertext || "[Missing private key]";
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
      return msg.ciphertext || "[Cannot decrypt]";
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
          {hasKeys && (
            <button
              className="btn-secondary"
              type="button"
              onClick={() => {
                navigator.clipboard
                  ?.writeText(JSON.stringify(privateKey || {}))
                  .then(() => setStatus("Private key copied. Store it safely."))
                  .catch(() => setStatus("Copy failed. Copy manually from the import box."));
              }}
            >
              Copy my private key
            </button>
          )}
        </div>
        <div className="mt-3 grid gap-2">
          <label className="text-xs text-slate-300">
            Import private key (paste saved JSON and click “Save”)
          </label>
          <textarea
            rows={3}
            value={privateKeyInput}
            onChange={(e) => setPrivateKeyInput(e.target.value)}
            className="px-2 py-2 rounded bg-slate-900 border border-slate-700 text-xs text-slate-100"
            placeholder='{"kty":"RSA",...}'
          />
          <div className="flex gap-2">
            <button
              className="btn-secondary"
              type="button"
              onClick={() => {
                try {
                  const parsed = JSON.parse(privateKeyInput);
                  localStorage.setItem(LOCAL_PRIVATE_KEY, JSON.stringify(parsed));
                  setPrivateKey(parsed);
                  setStatus("Private key saved locally.");
                  setError("");
                } catch (err) {
                  console.error(err);
                  setError("Invalid private key JSON");
                }
              }}
            >
              Save private key
            </button>
            <button
              className="btn-secondary"
              type="button"
              onClick={() => setPrivateKeyInput("")}
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {canPush && (
        <div className="card">
          <div className="card-title">Push Notifications</div>
          <div className="card-subtext">
            Send generic alerts only. No sensitive data is included in push payloads.
          </div>
          {pushError && <div className="mt-2 text-sm text-red-400">{pushError}</div>}
          {pushStatus && <div className="mt-2 text-sm text-emerald-300">{pushStatus}</div>}

          <div className="mt-3 grid gap-3">
            <label className="flex flex-col gap-1 text-xs text-slate-300">
              Device label (optional)
              <input
                value={pushLabel}
                onChange={(e) => setPushLabel(e.target.value)}
                className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-sm text-slate-100"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              <button className="btn-primary" type="button" onClick={handleEnableWebPush}>
                Enable browser push
              </button>
              <button
                className="btn-secondary"
                type="button"
                onClick={async () => {
                  try {
                    await sendPushTest();
                    setPushStatus("Test notification sent.");
                  } catch (err) {
                    console.error(err);
                    setPushError("Failed to send test notification");
                  }
                }}
              >
                Send test
              </button>
            </div>

            <div className="grid md:grid-cols-[140px,1fr,120px] gap-2 items-end">
              <label className="flex flex-col gap-1 text-xs text-slate-300">
                Mobile type
                <select
                  value={mobileType}
                  onChange={(e) => setMobileType(e.target.value)}
                  className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-sm text-slate-100"
                >
                  <option value="fcm">FCM</option>
                  <option value="apns">APNs</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs text-slate-300">
                Mobile device token
                <input
                  value={mobileToken}
                  onChange={(e) => setMobileToken(e.target.value)}
                  className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-sm text-slate-100"
                  placeholder="Paste token from your app"
                />
              </label>
              <button className="btn-primary" type="button" onClick={handleRegisterMobileToken}>
                Register
              </button>
            </div>

            <div className="mt-2">
              <div className="text-xs text-slate-400 mb-2">Registered devices</div>
              {pushLoading && <div className="text-xs text-slate-400">Loading...</div>}
              {!pushLoading && pushDevices.length === 0 && (
                <div className="text-xs text-slate-500">No devices registered.</div>
              )}
              <div className="flex flex-col gap-2">
                {pushDevices.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between border border-slate-800 rounded px-3 py-2"
                  >
                    <div className="text-xs text-slate-300">
                      <div className="text-sm text-slate-100">
                        {d.label || d.deviceType.toUpperCase()}
                      </div>
                      <div>
                        {d.deviceType.toUpperCase()} ·{" "}
                        {new Date(d.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <button
                      className="text-red-300 hover:text-red-200 text-xs"
                      type="button"
                      onClick={async () => {
                        try {
                          await deletePushDevice(d.id);
                          await refreshPushDevices();
                        } catch (err) {
                          console.error(err);
                          setPushError("Failed to remove device");
                        }
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

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
        <div className="card-title">Threads</div>
        <div className="card-subtext">
          Inbox auto-loads on open. Select a thread to view messages or start a new one.
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button className="btn-secondary" onClick={loadInbox} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh inbox"}
          </button>
        </div>

        <div className="mt-3 grid md:grid-cols-[240px,1fr] gap-4">
          <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto pr-1">
            {threadList.length === 0 && (
              <div className="text-sm text-slate-400">No conversations yet.</div>
            )}
            {threadList.map((t) => (
              <button
                key={t.threadId}
                className={`text-left px-3 py-2 rounded border ${
                  target.trim() === t.username
                    ? "border-sky-400 bg-sky-400/10"
                    : "border-slate-700 bg-slate-900"
                }`}
                onClick={() => {
                  setTarget(t.username);
                  loadThread(t.username);
                }}
              >
                <div className="flex justify-between items-center text-sm text-slate-100">
                  <span>{t.username}</span>
                  {t.unread > 0 && (
                    <span className="text-xs text-amber-300 font-semibold">{t.unread} new</span>
                  )}
                </div>
                <div className="text-xs text-slate-500">
                  Last: {new Date(t.lastAt).toLocaleString()}
                </div>
              </button>
            ))}
            {threadList.length > 0 && (
              <div className="flex gap-2">
                <button
                  className="btn-secondary w-full"
                  type="button"
                  onClick={async () => {
                    try {
                      await deleteInbox();
                      setMessages([]);
                      setThreadList([]);
                    } catch (err) {
                      console.error(err);
                      setError("Failed to delete inbox");
                    }
                  }}
                >
                  Delete inbox
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <div className="card-subtext">
              {target.trim()
                ? `Conversation with ${target.trim()}`
                : "Select a thread or enter a username to start chatting."}
            </div>
            {loadingThread && (
              <div className="text-xs text-slate-400">Loading thread...</div>
            )}
            <div className="mt-2 flex flex-col gap-2">
              {messages.length === 0 && (
                <div className="text-sm text-slate-400">No messages yet.</div>
              )}
              {messages.map((m) => (
                <MessageRow
                  key={m.id}
                  msg={m}
                  isMe={m.fromId === staff?.id}
                  fromLabel={m.fromId === staff?.id ? "You" : m.fromUsername || m.fromId}
                  toLabel={m.toId === staff?.id ? "You" : m.toUsername || m.toId}
                  decrypt={() => renderBody(m)}
                  onDeleted={() => {
                    loadThread(target.trim());
                    loadInbox();
                  }}
                />
              ))}
              {messages.length > 0 && target.trim() && (
                <div className="flex gap-2">
                  <button
                    className="btn-secondary"
                    type="button"
                    onClick={async () => {
                      try {
                        const threadId =
                          messages[0]?.threadId ||
                          (messages[0]
                            ? `thread:${[messages[0].fromId, messages[0].toId]
                                .sort((a, b) => a - b)
                                .join(":")}`
                            : null);
                        if (!threadId) return;
                        await deleteThread(threadId);
                        setMessages([]);
                        setThreadList((prev) =>
                          prev.filter((t) => t.threadId !== threadId)
                        );
                      } catch (err) {
                        console.error(err);
                        setError("Failed to delete thread");
                      }
                    }}
                  >
                    Delete thread
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageRow({ msg, isMe, decrypt, fromLabel, toLabel, onDeleted }) {
  const [body, setBody] = useState("[Decrypting...]");
  const [deleting, setDeleting] = useState(false);
  const [decrypting, setDecrypting] = useState(false);

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
                onDeleted?.();
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
      <div className="mt-2 flex justify-start">
        <button
          className="btn-secondary text-xs px-2 py-1"
          disabled={decrypting}
          onClick={async () => {
            setDecrypting(true);
            try {
              const b = await decrypt();
              setBody(b);
            } catch (err) {
              console.error(err);
            } finally {
              setDecrypting(false);
            }
          }}
        >
          {decrypting ? "Decrypting..." : "Decrypt message"}
        </button>
      </div>
    </div>
  );
}
