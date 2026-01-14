// src/components/PlayerInspector.jsx
import React, { useState } from "react";
import api from "../../api/client";

export default function PlayerInspector() {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [players, setPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [error, setError] = useState("");

  const [loadingWallets, setLoadingWallets] = useState(false);
  const [loadingTx, setLoadingTx] = useState(false);
  const [loadingRounds, setLoadingRounds] = useState(false);

  async function apiGet(path, params) {
    const res = await api.get(path, params ? { params } : undefined);
    return res.data;
  }

  async function handleSearch(e) {
    e.preventDefault();
    setError("");
    setSearching(true);
    setSelectedPlayer(null);
    setWallets([]);
    setTransactions([]);
    setRounds([]);

    try {
      const data = await apiGet("/api/v1/admin/players", {
        search: query.trim(),
      });
      const list = Array.isArray(data?.players) ? data.players : [];
      const normalized = list.map((p) => ({
        ...p,
        username: p.username || p.userCode || p.email || p.id,
        role: p.role || "player",
        isActive:
          typeof p.isActive === "boolean" ? p.isActive : String(p.status || "") === "active",
      }));
      setPlayers(normalized);
      if (!list.length) {
        setError("No players found for that query.");
      }
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.error || err.message || "Search failed.");
    } finally {
      setSearching(false);
    }
  }

  async function loadDetails(player) {
    setSelectedPlayer(player);
    setWallets([]);
    setTransactions([]);
    setRounds([]);
    setError("");

    try {
      setLoadingWallets(true);
      const detail = await apiGet(`/api/v1/admin/players/${player.id}`);
      const balance = detail?.player?.balance;
      if (detail?.player) {
        const normalizedDetail = {
          ...detail.player,
          username: detail.player.username || detail.player.userCode || detail.player.email || player.id,
          role: detail.player.role || "player",
          isActive:
            typeof detail.player.isActive === "boolean"
              ? detail.player.isActive
              : String(detail.player.status || "") === "active",
        };
        setSelectedPlayer((prev) => ({ ...prev, ...normalizedDetail }));
      }
      setWallets([
        {
          id: detail?.player?.id || player.id,
          currency: "FUN",
          balance: Number.isFinite(Number(balance)) ? Number(balance) : 0,
        },
      ]);
    } catch (err) {
      console.error(err);
      setError((prev) => prev || "Failed to load wallets.");
    } finally {
      setLoadingWallets(false);
    }

    try {
      setLoadingTx(true);
      const tx = await apiGet(`/api/v1/admin/players/${player.id}/transactions`, {
        limit: 50,
      });
      setTransactions(tx?.transactions || []);
    } catch (err) {
      console.error(err);
      setError((prev) => prev || "Failed to load transactions.");
    } finally {
      setLoadingTx(false);
    }

    try {
      setLoadingRounds(true);
      const r = await apiGet(`/api/v1/admin/players/${player.id}/rounds`, {
        limit: 50,
      });
      setRounds(Array.isArray(r?.rounds) ? r.rounds : []);
    } catch (err) {
      console.error(err);
      // rounds are optional, don’t scream too loud
    } finally {
      setLoadingRounds(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Search bar */}
      <form
        onSubmit={handleSearch}
        className="flex flex-wrap items-center gap-2"
      >
        <input
          type="text"
          placeholder="Search by username, email, or ID..."
          className="flex-1 min-w-[200px] rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          type="submit"
          disabled={!query.trim() || searching}
          className="rounded-lg bg-pink-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-pink-500/30 disabled:cursor-not-allowed disabled:bg-slate-600"
        >
          {searching ? "Searching..." : "Search"}
        </button>
      </form>

      {error && (
        <div className="rounded-lg border border-red-500/70 bg-red-900/40 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Players list */}
        <div className="lg:col-span-1 rounded-2xl bg-slate-900/80 border border-slate-700/60 p-3">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Players
          </h3>
          <div className="max-h-72 overflow-auto pr-1 space-y-1">
            {players.map((p) => (
              <button
                key={p.id}
                onClick={() => loadDetails(p)}
                className={`w-full text-left rounded-xl px-3 py-2 text-sm transition ${
                  selectedPlayer && selectedPlayer.id === p.id
                    ? "bg-slate-800 border border-pink-500/70"
                    : "bg-slate-900/60 border border-slate-700 hover:border-pink-500/50"
                }`}
              >
                <div className="font-semibold text-slate-100">
                  {p.username || p.email || p.id}
                </div>
                <div className="text-[11px] text-slate-400">
                  {p.email} · {p.role} ·{" "}
                  {p.isActive ? "Active" : "Disabled"}
                </div>
              </button>
            ))}
            {!players.length && !searching && (
              <div className="text-xs text-slate-500">
                Search by username, email, or ID to see results here.
              </div>
            )}
          </div>
        </div>

        {/* Details panel */}
        <div className="lg:col-span-2 space-y-4">
          {/* Player header */}
          <div className="rounded-2xl bg-slate-900/80 border border-slate-700/60 p-3">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Player details
            </h3>
            {selectedPlayer ? (
              <div className="text-sm text-slate-100 space-y-1">
                <div className="font-semibold text-base">
                  {selectedPlayer.username || selectedPlayer.email}
                </div>
                <div className="text-xs text-slate-400">
                  ID: {selectedPlayer.id}
                </div>
                <div className="text-xs text-slate-400">
                  Email: {selectedPlayer.email}
                </div>
                <div className="text-xs text-slate-400">
                  Role: {selectedPlayer.role} ·{" "}
                  {selectedPlayer.isActive ? "Active" : "Disabled"}
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500">
                Select a player from the list to view details.
              </div>
            )}
          </div>

          {/* Wallets + Transactions + Rounds */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
            {/* Wallets */}
            <div className="rounded-2xl bg-slate-900/80 border border-slate-700/60 p-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Wallets
                </h4>
                {loadingWallets && (
                  <span className="text-[10px] text-slate-400">
                    Loading...
                  </span>
                )}
              </div>
              <div className="space-y-2 max-h-56 overflow-auto pr-1">
                {wallets.map((w) => (
                  <div
                    key={w.id}
                    className="rounded-xl bg-slate-950/60 border border-slate-700 px-3 py-2 text-xs text-slate-100"
                  >
                    <div className="font-semibold">
                      {w.currency || "FUN"} wallet
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Balance: {w.balance}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      ID: {w.id}
                    </div>
                  </div>
                ))}
                {!wallets.length && selectedPlayer && !loadingWallets && (
                  <div className="text-[11px] text-slate-500">
                    No wallets found for this player.
                  </div>
                )}
                {!selectedPlayer && (
                  <div className="text-[11px] text-slate-500">
                    Select a player to view wallets.
                  </div>
                )}
              </div>
            </div>

            {/* Transactions */}
            <div className="rounded-2xl bg-slate-900/80 border border-slate-700/60 p-3 xl:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Transactions
                </h4>
                {loadingTx && (
                  <span className="text-[10px] text-slate-400">
                    Loading...
                  </span>
                )}
              </div>
              <div className="max-h-56 overflow-auto pr-1">
                {transactions.length ? (
                  <table className="min-w-full text-[11px] text-slate-100">
                    <thead className="text-slate-400">
                      <tr>
                        <th className="text-left pr-2 py-1">Time</th>
                        <th className="text-left pr-2 py-1">Type</th>
                        <th className="text-right pr-2 py-1">Amount</th>
                        <th className="text-right pr-2 py-1">
                          Balance After
                        </th>
                        <th className="text-left py-1">Ref</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((tx) => (
                        <tr
                          key={tx.id}
                          className="border-t border-slate-800/80"
                        >
                          <td className="pr-2 py-1 text-slate-400">
                            {tx.createdAt
                              ? new Date(
                                  tx.createdAt
                                ).toLocaleString()
                              : ""}
                          </td>
                          <td className="pr-2 py-1">
                            <span className="rounded-full bg-slate-800 px-2 py-[2px] text-[10px] uppercase tracking-wide">
                              {tx.type}
                            </span>
                          </td>
                          <td className="pr-2 py-1 text-right">
                            {tx.amount}
                          </td>
                          <td className="pr-2 py-1 text-right text-slate-400">
                            {tx.balanceAfter}
                          </td>
                          <td className="py-1 text-slate-400">
                            {tx.reference}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : selectedPlayer && !loadingTx ? (
                  <div className="text-[11px] text-slate-500">
                    No transactions found for this player.
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-500">
                    Select a player to view transactions.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Game rounds (optional / future) */}
          <div className="rounded-2xl bg-slate-900/80 border border-slate-700/60 p-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Recent game rounds
              </h4>
              {loadingRounds && (
                <span className="text-[10px] text-slate-400">
                  Loading...
                </span>
              )}
            </div>
            <div className="max-h-56 overflow-auto pr-1 text-[11px] text-slate-100">
              {rounds && rounds.length ? (
                <table className="min-w-full">
                  <thead className="text-slate-400">
                    <tr>
                      <th className="text-left pr-2 py-1">Time</th>
                      <th className="text-left pr-2 py-1">Game</th>
                      <th className="text-right pr-2 py-1">Bet</th>
                      <th className="text-right pr-2 py-1">Win</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rounds.map((r) => (
                      <tr
                        key={r.id}
                        className="border-t border-slate-800/80"
                      >
                        <td className="pr-2 py-1 text-slate-400">
                          {r.createdAt
                            ? new Date(r.createdAt).toLocaleString()
                            : ""}
                        </td>
                        <td className="pr-2 py-1">
                          {r.gameName || r.gameId || "N/A"}
                        </td>
                        <td className="pr-2 py-1 text-right">
                          {r.betAmount}
                        </td>
                        <td className="pr-2 py-1 text-right">
                          {r.winAmount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : selectedPlayer && !loadingRounds ? (
                <div className="text-[11px] text-slate-500">
                  No game rounds found yet (or game engine not writing
                  rounds).
                </div>
              ) : (
                <div className="text-[11px] text-slate-500">
                  Select a player to view game rounds.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
