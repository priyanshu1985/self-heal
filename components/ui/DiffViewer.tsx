import React from "react";

interface DiffViewerProps {
  diffText: string;
  title?: string;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  diffText,
  title = "Proposed AI Extraction Diff",
}) => {
  const lines = diffText.split("\n");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {title && (
        <div
          style={{
            fontSize: "0.8125rem",
            fontWeight: 600,
            color: "var(--text-secondary)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {title}
        </div>
      )}
      <div className="diff-container">
        {lines.map((line, index) => {
          let lineType = "diff-line-unchanged";
          if (line.startsWith("+") && !line.startsWith("+++")) {
            lineType = "diff-line-added";
          } else if (line.startsWith("-") && !line.startsWith("---")) {
            lineType = "diff-line-removed";
          } else if (line.startsWith("@@") || line.startsWith("---") || line.startsWith("+++")) {
            lineType = "diff-line-meta";
          }

          return (
            <div key={index} className={`diff-line ${lineType}`}>
              <span
                style={{
                  userSelect: "none",
                  width: "2.5rem",
                  color: "var(--text-muted)",
                  marginRight: "0.75rem",
                  textAlign: "right",
                  display: "inline-block",
                }}
              >
                {index + 1}
              </span>
              <span>{line || " "}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
