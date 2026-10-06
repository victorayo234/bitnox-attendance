import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

export default function AppleIcon() {
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
          borderRadius: "36px",
          position: "relative",
        }}
      >
        <span
          style={{
            fontSize: "100px",
            fontWeight: 900,
            color: "#FFFFFF",
            fontFamily: "sans-serif",
            letterSpacing: "-3px",
          }}
        >
          B
        </span>
        <div
          style={{
            position: "absolute",
            bottom: "24px",
            width: "80px",
            height: "10px",
            borderRadius: "5px",
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
