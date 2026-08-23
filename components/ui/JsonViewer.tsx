import React from "react";

interface JsonViewerProps {
  data: unknown;
  maxHeight?: string;
}

export const JsonViewer: React.FC<JsonViewerProps> = ({
  data,
  maxHeight = "400px",
}) => {
  let formattedJson = "";
  try {
    if (typeof data === "string") {
      formattedJson = JSON.stringify(JSON.parse(data), null, 2);
    } else {
      formattedJson = JSON.stringify(data, null, 2);
    }
  } catch {
    formattedJson = String(data);
  }

  return (
    <pre
      style={{
        background: "#080b11",
        border: "1px solid var(--border-subtle)",
        borderRadius: "8px",
        padding: "1rem",
        color: "#38bdf8",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
        fontSize: "0.8125rem",
        lineHeight: 1.5,
        overflow: "auto",
        maxHeight,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
    >
      {formattedJson}
    </pre>
  );
};
