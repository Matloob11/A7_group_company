import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const iconProps: IconProps = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.9,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

export const PhoneIcon = (props: IconProps) => (
  <svg {...iconProps} {...props}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.4 19.4 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.69 2.8a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.28-1.28a2 2 0 0 1 2.11-.45c.9.33 1.84.56 2.8.69A2 2 0 0 1 22 16.92Z" />
  </svg>
);

export const PauseIcon = (props: IconProps) => (
  <svg {...iconProps} {...props}>
    <path d="M9 5v14M15 5v14" />
  </svg>
);

export const PlayIcon = (props: IconProps) => (
  <svg {...iconProps} {...props}>
    <path d="m8 5 11 7-11 7V5Z" />
  </svg>
);

export const LogoutIcon = (props: IconProps) => (
  <svg {...iconProps} {...props}>
    <path d="M10 17l5-5-5-5M15 12H3M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
  </svg>
);

export const CheckIcon = (props: IconProps) => (
  <svg {...iconProps} {...props}>
    <path d="m5 12 4 4L19 6" />
  </svg>
);

export const InfoIcon = (props: IconProps) => (
  <svg {...iconProps} {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </svg>
);
