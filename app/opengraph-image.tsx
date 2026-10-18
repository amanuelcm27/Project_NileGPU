import { ImageResponse } from "next/og";
import { brand } from "@/lib/config/brand";

/** Social sharing preview, generated at build/request time — no remote assets. */
export const alt = `${brand.name} — GPU compute for Ethiopia`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#090A09",
          padding: "64px 72px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 24, height: 24, background: "#F5E642" }} />
          <div
            style={{
              color: "#F4F4EF",
              fontSize: 30,
              letterSpacing: 6,
              fontWeight: 700,
            }}
          >
            {brand.name.toUpperCase()}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div
            style={{
              color: "#F4F4EF",
              fontSize: 92,
              lineHeight: 1,
              fontWeight: 700,
              letterSpacing: -2,
            }}
          >
            GPU COMPUTE
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ color: "#F5E642", fontSize: 92, lineHeight: 1, fontWeight: 700 }}>
              For
            </div>
            <div
              style={{
                color: "#F4F4EF",
                fontSize: 92,
                lineHeight: 1,
                fontWeight: 700,
                letterSpacing: -2,
              }}
            >
              ETHIOPIA
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ height: 2, width: "100%", background: "#30342A" }} />
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div style={{ color: "#A4A79D", fontSize: 24 }}>
              Early-access wishlist — tell us what you need to run.
            </div>
            <div style={{ color: "#F5E642", fontSize: 22, letterSpacing: 3 }}>
              BUILT FOR AI WORKLOADS
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
