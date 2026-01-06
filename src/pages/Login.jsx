import React, { useMemo, useState } from "react";
import styled from "styled-components";
import { useLocation, useNavigate } from "react-router-dom";
import { useStaffAuth } from "../context/StaffAuthContext.jsx";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, error: authError } = useStaffAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [tenantId, setTenantId] = useState(() => {
    try {
      const params = new URLSearchParams(location.search || "");
      const fromUrl = (params.get("tenantId") || "").trim();
      const fromStore = (localStorage.getItem("ptu_tenant_id") || "").trim();
      return fromUrl || fromStore || "";
    } catch {
      return "";
    }
  });
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(
    () => username.trim().length > 0 && password.length > 0 && !submitting,
    [username, password, submitting]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    const ok = await login({ username: username.trim(), password, tenantId: tenantId.trim() || null });
    setSubmitting(false);

    if (ok) navigate("/dashboard");
  };

  return (
    <StyledWrapper>
      <div className="wrapper">
        <form className="form" onSubmit={handleSubmit}>
          <img className="login-logo" src="/favicon.png" alt="PlayTime USA logo" />
          <span className="login-tagline">Administrative Access Terminal</span>

          <div className="input-container">
            <svg
              width={24}
              height={24}
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <defs>
                <linearGradient
                  id="gradient-stroke"
                  x1={0}
                  y1={0}
                  x2={24}
                  y2={24}
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%" stopColor="black" />
                  <stop offset="100%" stopColor="white" />
                </linearGradient>
              </defs>
              <g stroke="url(#gradient-stroke)" fill="none" strokeWidth={1}>
                <path d="M12 11a4 4 0 1 0 0-8a4 4 0 0 0 0 8Z" />
                <path d="M4 20c0-3.3137 3.5817-6 8-6s8 2.6863 8 6" />
              </g>
            </svg>

            <input
              className="input"
              type="text"
              placeholder="Username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="input-container">
            <svg
              width={24}
              height={24}
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <defs>
                <linearGradient
                  id="gradient-stroke-tenant"
                  x1={0}
                  y1={0}
                  x2={24}
                  y2={24}
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%" stopColor="black" />
                  <stop offset="100%" stopColor="white" />
                </linearGradient>
              </defs>
              <g stroke="url(#gradient-stroke-tenant)" fill="none" strokeWidth={1}>
                <path d="M12 2a5 5 0 1 0 0 10a5 5 0 0 0 0-10Z" />
                <path d="M4 22c0-4.4183 3.5817-8 8-8s8 3.5817 8 8" />
              </g>
            </svg>

            <input
              className="input"
              type="text"
              placeholder="Tenant ID (optional)"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
            />
          </div>

          <div className="input-container">
            <svg
              width={24}
              height={24}
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <defs>
                <linearGradient
                  id="gradient-stroke"
                  x1={0}
                  y1={0}
                  x2={24}
                  y2={24}
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%" stopColor="black" />
                  <stop offset="100%" stopColor="white" />
                </linearGradient>
              </defs>
              <g stroke="url(#gradient-stroke)" fill="none" strokeWidth={1}>
                <path d="M3.5 15.5503L9.20029 9.85L12.3503 13L11.6 13.7503H10.25L9.8 15.1003L8 16.0003L7.55 18.2503L5.5 19.6003H3.5V15.5503Z" />
                <path d="M16 3.5H11L8.5 6L16 13.5L21 8.5L16 3.5Z" />
                <path d="M16 10.5L18 8.5L15 5.5H13L12 6.5L16 10.5Z" />
              </g>
            </svg>

            <input
              className="input"
              type="password"
              placeholder="Password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {tenantId && (
            <div className="hint">Tenant scope active</div>
          )}

          {authError && <div className="error">{authError}</div>}

          <div className="login-button">
            <input
              className="input"
              type="submit"
              value={submitting ? "Logging in..." : "Login"}
              disabled={!canSubmit}
            />
          </div>

          <div className="texture" />
        </form>
      </div>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  .wrapper {
    width: 100%;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2.5rem 1.5rem;
    background:
      radial-gradient(140% 120% at 50% 10%, rgba(8, 27, 60, 0.9), transparent 55%),
      radial-gradient(160% 120% at 50% 90%, rgba(34, 8, 43, 0.9), transparent 55%),
      linear-gradient(180deg, #03050b 0%, #060915 55%, #0b0f1d 100%);
  }

  .form {
    padding: 1.5rem 1.7rem 1.6rem;
    display: grid;
    place-items: center;
    gap: 1rem;
    position: relative;
    width: min(420px, 92vw);
    border-radius: 28px;
    border: 1px solid rgba(120, 196, 255, 0.25);
    background:
      linear-gradient(145deg, rgba(12, 19, 36, 0.95), rgba(6, 10, 22, 0.95)),
      linear-gradient(0deg, rgba(255, 255, 255, 0.04), transparent 60%);
    box-shadow:
      0 0 45px rgba(73, 183, 255, 0.25),
      0 20px 70px rgba(0, 0, 0, 0.55);
    overflow: hidden;
  }

  .form .login-logo {
    width: 180px;
    height: 180px;
    object-fit: contain;
    justify-self: center;
    align-self: center;
    margin-top: 0.2rem;
    filter:
      drop-shadow(0 18px 24px rgba(0, 0, 0, 0.45))
      drop-shadow(0 -8px 14px rgba(255, 255, 255, 0.18));
  }

    .hint {
    margin-top: -0.25rem;
    font-size: 0.78rem;
    letter-spacing: 0.08em;
    color: rgba(202, 210, 224, 0.72);
  }

.form .login-tagline {
    margin-top: -0.65rem;
    margin-bottom: 0.75rem;
    font-size: 0.78rem;
    letter-spacing: 0.24em;
    text-transform: uppercase;
    color: rgba(120, 214, 255, 0.75);
    text-align: center;
  }

  .form::before,
  .form::after {
    content: "";
    position: absolute;
    border: 1px solid transparent;
    border: inherit;
    z-index: -1;
  }

  .form::before {
    inset: -1.2rem;
    opacity: 0.1;
    background: radial-gradient(circle, rgba(79, 209, 255, 0.2), transparent 55%);
  }

  .form::after {
    inset: -2.2rem;
    opacity: 0.06;
    background: repeating-linear-gradient(
      90deg,
      rgba(255, 255, 255, 0.04) 0,
      rgba(255, 255, 255, 0.04) 1px,
      transparent 1px,
      transparent 12px
    );
  }

  .form .title {
    color: white;
    font-size: 2rem;
    font-weight: 700;
    text-align: center;
    letter-spacing: 0.6rem;
    text-transform: uppercase;
    background: linear-gradient(rgb(170, 170, 170), rgb(78, 78, 78));
    color: transparent;
    -webkit-background-clip: text;
    background-clip: text;
    margin-bottom: 0.5rem;
  }

  .form .input-container {
    display: flex;
    align-items: center;
    width: 100%;
    position: relative;
    background:
      linear-gradient(120deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0)),
      linear-gradient(90deg, rgba(16, 28, 46, 0.8), rgba(13, 20, 35, 0.9));
    border: 1px solid rgba(120, 214, 255, 0.25);
    border-radius: 18px;
    box-shadow: inset 0 0 14px rgba(0, 0, 0, 0.5);
  }

  .form .input-container svg {
    stroke: rgba(170, 190, 210, 0.9);
    flex: 0 0 auto;
    margin-left: 0;
    position: absolute;
    left: 1rem;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
  }

  .form .input-container svg g {
    transition: all 0.2s ease-in-out;
  }

  .form .input-container .input {
    background: none;
    border: none;
    padding: 0.85rem 2.6rem;
    color: #e8f6ff;
    width: 100%;
    text-align: center;
    font-size: 1rem;
    letter-spacing: 0.02em;
  }

  .form .input-container .input:focus {
    outline: none;
    color: #ffecc7;
  }

  .form .input-container:focus-within {
    border-color: rgba(120, 214, 255, 0.8);
    box-shadow:
      0 0 16px rgba(120, 214, 255, 0.35),
      inset 0 0 14px rgba(120, 214, 255, 0.08);
  }

  .form .input-container:focus-within svg g {
    stroke: rgba(120, 214, 255, 0.9);
  }

  .form .login-button {
    --border-color: linear-gradient(-45deg, #ffae00, #7e03aa, #00fffb);
    --border-width: 0.125em;
    --curve-size: 0.5em;
    --bg: #080312;
    --color: #afffff;
    width: min(140px, 100%);
    position: relative;
    margin-top: 0.3rem;
    justify-self: center;
    display: inline-grid;
    place-content: center;
    isolation: isolate;
    border: 0;
    background: transparent;
    box-shadow: 10px 10px 20px rgba(0, 0, 0, 0.6);
    clip-path: polygon(
      0% var(--curve-size),
      var(--curve-size) 0,
      100% 0,
      100% calc(100% - var(--curve-size)),
      calc(100% - var(--curve-size)) 100%,
      0 100%
    );
  }

  .form .login-button .input {
    cursor: pointer;
    padding: 0.5rem 0.85rem;
    width: 100%;
    text-align: center;
    color: var(--color);
    font-size: 0.92rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    background: transparent;
    border: 0;
    text-shadow: 0 0 8px rgba(175, 255, 255, 0.35);
  }

  .form .login-button .input:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    filter: grayscale(40%);
  }

  .form .login-button::before {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: var(--border-color);
    background-size: 300% 300%;
    animation: move-bg7234 5s ease infinite;
    z-index: -2;
  }

  .form .login-button::after {
    content: "";
    position: absolute;
    inset: 0;
    background: var(--bg);
    z-index: -1;
    clip-path: polygon(
      var(--border-width) calc(var(--curve-size) + var(--border-width) * 0.5),
      calc(var(--curve-size) + var(--border-width) * 0.5) var(--border-width),
      calc(100% - var(--border-width)) var(--border-width),
      calc(100% - var(--border-width))
        calc(100% - calc(var(--curve-size) + var(--border-width) * 0.5)),
      calc(100% - calc(var(--curve-size) + var(--border-width) * 0.5))
        calc(100% - var(--border-width)),
      var(--border-width) calc(100% - var(--border-width))
    );
    transition: clip-path 500ms;
  }

  .form .login-button:where(:hover, :focus-within)::after {
    clip-path: polygon(
      calc(100% - var(--border-width))
        calc(100% - calc(var(--curve-size) + var(--border-width) * 0.5)),
      calc(100% - var(--border-width)) var(--border-width),
      calc(100% - var(--border-width)) var(--border-width),
      calc(100% - var(--border-width))
        calc(100% - calc(var(--curve-size) + var(--border-width) * 0.5)),
      calc(100% - calc(var(--curve-size) + var(--border-width) * 0.5))
        calc(100% - var(--border-width)),
      calc(100% - calc(var(--curve-size) + var(--border-width) * 0.5))
        calc(100% - var(--border-width))
    );
    transition: 200ms;
  }

  .form .login-button:where(:hover, :focus-within) .input {
    color: #fff;
  }

  .form .texture {
    position: absolute;
    background-image: linear-gradient(0deg, #ffffff 1px, transparent 1px);
    background-size: 1px 5px;
    inset: 0;
    mix-blend-mode: soft-light;
    -webkit-mask-image: radial-gradient(
        30% 45% at 100% 50%,
        white 0%,
        transparent 100%
      ),
      radial-gradient(30% 45% at 0% 50%, white 0%, transparent 100%);
    mask-image: radial-gradient(30% 45% at 100% 50%, white 0%, transparent 100%),
      radial-gradient(30% 45% at 0% 50%, white 0%, transparent 100%);
    pointer-events: none;
    animation: movingLines 1s linear infinite;
  }

  .error {
    width: 100%;
    color: #ff6b6b;
    font-size: 0.9rem;
    text-align: left;
    margin-top: -0.25rem;
  }

  @media (max-width: 520px) {
    .form {
      padding: 1.2rem 1.3rem 1.3rem;
      width: min(320px, 94vw);
    }

    .form .login-logo {
      width: 150px;
      height: 150px;
    }

    .form .login-button {
      width: min(130px, 100%);
    }
  }

  @keyframes flicker {
    0% {
      filter: brightness(100%);
    }
    10% {
      filter: brightness(80%);
    }
    20% {
      filter: brightness(120%);
    }
    30% {
      filter: brightness(90%);
    }
    40% {
      filter: brightness(110%);
    }
    50% {
      filter: brightness(100%);
    }
    60% {
      filter: brightness(85%);
    }
    70% {
      filter: brightness(95%);
    }
    80% {
      filter: brightness(105%);
    }
    90% {
      filter: brightness(115%);
    }
    100% {
      filter: brightness(100%);
    }
  }

  @keyframes move-bg7234 {
    0% {
      background-position: 31% 0%;
    }
    50% {
      background-position: 70% 100%;
    }
    100% {
      background-position: 31% 0%;
    }
  }

  @keyframes movingLines {
    0% {
      background-position: 0 0;
    }
    100% {
      background-position: 0 5px;
    }
  }
`;

export default Login;
