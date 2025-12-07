// src/pages/Dashboard.jsx
import React from "react";

export default function Dashboard() {
  return (
    <div>
      <div className="section-header">
        <div>
          <div className="section-title">Dashboard</div>
          <div className="section-subtitle">
            High-level view of your operation. You can plug your own widgets
            here later.
          </div>
        </div>
      </div>

      <div className="grid grid-4">
        <div className="card">
          <div className="card-title">Status</div>
          <div className="card-value">Online</div>
          <div className="card-subtext">
            Backend reachable, auth and wallet stack live.
          </div>
        </div>

        <div className="card">
          <div className="card-title">Quick tip</div>
          <div className="card-subtext">
            Head to <strong>Reports</strong> to view GGR, vouchers and player
            KPIs over time.
          </div>
        </div>

        <div className="card">
          <div className="card-title">Next phase</div>
          <div className="card-subtext">
            Add per-agent &amp; per-cashier views once your roles tree is ready.
          </div>
        </div>

        <div className="card">
          <div className="card-title">Customization</div>
          <div className="card-subtext">
            Replace this Dashboard content with your own widgets / charts
            whenever you&apos;re ready.
          </div>
        </div>
      </div>
    </div>
  );
}

