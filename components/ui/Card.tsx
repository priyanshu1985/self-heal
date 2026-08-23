import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  interactive = false,
  className = "",
  ...props
}) => {
  return (
    <div
      className={`card ${interactive ? "card-interactive" : ""} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
