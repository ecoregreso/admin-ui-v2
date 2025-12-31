import React, { useEffect, useRef, useState } from "react";

export default function InfoTooltip({ title = "What's this?", content }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(event) {
      if (!ref.current) return;
      if (!ref.current.contains(event.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
    } else {
      document.removeEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <span className="info-wrap" ref={ref}>
      <button
        type="button"
        className="info-button"
        aria-label={title}
        onClick={() => setOpen((v) => !v)}
      >
        ?
      </button>
      {open && (
        <div className="info-popover">
          <h4>{title}</h4>
          <div>{content}</div>
        </div>
      )}
    </span>
  );
}
