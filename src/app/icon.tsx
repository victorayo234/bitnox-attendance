import { ImageResponse } from "next/og";

export const size = {
  width: 48,
  height: 48,
};
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0B1B3F",
          borderRadius: "12px",
          position: "relative",
        }}
      >
        <span
          style={{
            fontSize: "28px",
            fontWeight: 900,
            color: "#FFFFFF",
            fontFamily: "sans-serif",
            letterSpacing: "-1px",
          }}
        >
          B
        </span>
        <div
          style={{
            position: "absolute",
            bottom: "6px",
            width: "20px",
            height: "3px",
            borderRadius: "2px",
            background: "#00E6FF",
          }}
        />
      </div>
    ),
    {
      ...size,
    }
  );
}
