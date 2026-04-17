import { useState, useEffect } from "react";

const API = "https://prolific-encouragement-production-1d34.up.railway.app/api/v1";
const AI = "https://wanderix-production.up.railway.app";
const AI_KEY = "wanderix_internal_key";

export default function App() {
  const [stats, setStats] = useState(null);
  const [hotels, setHotels] = useState([]);
  const [page, setPage] = useState("dashboard");

  useEffect(() => {
    loadStats();
    loadHotels();
  }, []);

  async function loadStats() {
    try {
      const [hotelsRes, bookingsRes] = await Promise.all([
        fetch(`${API}/hotels`),
        fetch(`${API}/bookings/stats`).catch(() => ({ json: () => ({}) })),
      ]);
      const hotelsData = await hotelsRes.json();
      setStats({
        hotels: hotelsData.total || 0,
        bookings: 0,
        revenue: 0,
        languages: 65,
      });
    } catch (e) {
      setStats({ hotels: 0, bookings: 0, revenue: 0, languages: 65 });
    }
  }

  async function loadHotels() {
    try {
      const res = await fetch(`${API}/hotels`);
      const data = await res.json();
      setHotels(data.hotels || []);
    } catch (e) {}
  }

  return (
    <div style={{ fontFamily: "Segoe UI, sans-serif", background: "#0f172a", minHeight: "100vh", color: "white" }}>
      
      {/* Header */}
      <div style={{ background: "#1e293b", padding: "16px 24px", display: "flex", alignItems: "center", gap: "24px", borderBottom: "1px solid #1e40af" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 700, background: "linear-gradient(135deg, #60a5fa, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", margin: 0 }}>
          🌍 Wanderix Admin
        </h1>
        {["dashboard", "hotels", "bookings", "map"].map(p => (
          <button key={p} onClick={() => setPage(p)} style={{
            background: page === p ? "#3b82f6" : "transparent",
            color: "white", border: "none", padding: "8px 16px",
            borderRadius: "8px", cursor: "pointer", fontSize: "14px",
            textTransform: "capitalize"
          }}>{p}</button>
        ))}
      </div>

      <div style={{ padding: "24px" }}>

        {/* Dashboard */}
        {page === "dashboard" && (
          <div>
            <h2 style={{ color: "#60a5fa", marginBottom: "24px" }}>📊 Overview</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "32px" }}>
              {[
                { label: "Hotels", value: stats?.hotels || 0, icon: "🏨", color: "#3b82f6" },
                { label: "Bookings", value: stats?.bookings || 0, icon: "📅", color: "#22c55e" },
                { label: "Revenue", value: `$${stats?.revenue || 0}`, icon: "💰", color: "#f59e0b" },
                { label: "Languages", value: stats?.languages || 65, icon: "🌍", color: "#8b5cf6" },
              ].map(s => (
                <div key={s.label} style={{ background: "#1e293b", borderRadius: "12px", padding: "24px", border: `1px solid ${s.color}33` }}>
                  <div style={{ fontSize: "32px", marginBottom: "8px" }}>{s.icon}</div>
                  <div style={{ fontSize: "28px", fontWeight: 700, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: "14px", color: "#94a3b8", marginTop: "4px" }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Services Status */}
            <h2 style={{ color: "#60a5fa", marginBottom: "16px" }}>🚀 Services Status</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
              {[
                { name: "Backend NestJS", url: `${API}/auth/health`, key: "status" },
                { name: "AI Engine", url: `${AI}/health`, key: "status" },
                { name: "Booking.com", url: `${AI}/map/destinations`, key: "total", headers: { "x-internal-key": AI_KEY } },
              ].map(s => (
                <ServiceCard key={s.name} {...s} />
              ))}
            </div>
          </div>
        )}

        {/* Hotels */}
        {page === "hotels" && (
          <div>
            <h2 style={{ color: "#60a5fa", marginBottom: "24px" }}>🏨 Hotels ({hotels.length})</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
              {hotels.map(hotel => (
                <div key={hotel.id} style={{ background: "#1e293b", borderRadius: "12px", padding: "20px", border: "1px solid #1e40af" }}>
                  <h3 style={{ color: "#60a5fa", margin: "0 0 8px" }}>{hotel.name}</h3>
                  <div style={{ color: "#94a3b8", fontSize: "13px" }}>⭐ {hotel.rating} • {hotel.stars}★</div>
                  <div style={{ color: "#34d399", fontSize: "18px", fontWeight: 700, margin: "8px 0" }}>${hotel.pricePerNight}/night</div>
                  <div style={{ color: "#94a3b8", fontSize: "12px" }}>📍 {hotel.address}</div>
                  <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
                    <span style={{ background: hotel.isVerified ? "#22c55e22" : "#f59e0b22", color: hotel.isVerified ? "#22c55e" : "#f59e0b", padding: "4px 10px", borderRadius: "20px", fontSize: "12px" }}>
                      {hotel.isVerified ? "✅ Verified" : "⏳ Pending"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bookings */}
        {page === "bookings" && (
          <div>
            <h2 style={{ color: "#60a5fa", marginBottom: "24px" }}>📅 Bookings</h2>
            <div style={{ background: "#1e293b", borderRadius: "12px", padding: "40px", textAlign: "center", border: "1px solid #1e40af" }}>
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔐</div>
              <p style={{ color: "#94a3b8" }}>Login required to view bookings</p>
            </div>
          </div>
        )}

        {/* Map */}
        {page === "map" && (
          <div>
            <h2 style={{ color: "#60a5fa", marginBottom: "16px" }}>🗺️ Map IA</h2>
            <iframe
              src="https://wanderix-production.up.railway.app/map"
              style={{ width: "100%", height: "70vh", border: "none", borderRadius: "12px" }}
              title="Wanderix Map"
            />
          </div>
        )}

      </div>
    </div>
  );
}

function ServiceCard({ name, url, key: dataKey, headers = {} }) {
  const [status, setStatus] = useState("checking...");
  const [ok, setOk] = useState(null);

  useEffect(() => {
    fetch(url, { headers })
      .then(r => r.json())
      .then(d => {
        setStatus(d[dataKey] || "online");
        setOk(true);
      })
      .catch(() => {
        setStatus("offline");
        setOk(false);
      });
  }, []);

  return (
    <div style={{ background: "#1e293b", borderRadius: "12px", padding: "20px", border: `1px solid ${ok === true ? "#22c55e33" : ok === false ? "#ef444433" : "#1e40af"}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: ok === true ? "#22c55e" : ok === false ? "#ef4444" : "#f59e0b" }} />
        <div>
          <div style={{ fontWeight: 600, fontSize: "14px" }}>{name}</div>
          <div style={{ color: "#94a3b8", fontSize: "12px", marginTop: "2px" }}>{status}</div>
        </div>
      </div>
    </div>
  );
}