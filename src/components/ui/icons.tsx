import { cn } from "@/lib/utils";

interface IconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

export function HopeIcon({ className, ...props }: IconProps) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("", className)}
      {...props}
    >
      <title>Hope and Peace Symbol</title>
      <path
        d="M20 8C20 8 17 11 12 11C7 11 4 8 4 8C4 8 7 5 12 5C17 5 20 8 20 8Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="dove-body"
      />
      <path
        d="M12 5C12 5 15 2 18 2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="wing"
      />
      <path
        d="M12 5C12 5 9 2 6 2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="wing"
      />
      <path
        d="M12 11L12 16M12 16L9 19M12 16L15 19"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="olive-branch text-primary"
      />
    </svg>
  );
}

export function UnityIcon({ className, ...props }: IconProps) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("", className)}
      {...props}
    >
      <title>Unity and Support Symbol</title>
      <circle
        cx="12"
        cy="12"
        r="3"
        stroke="currentColor"
        strokeWidth="1.5"
        className="center"
      />
      <path
        d="M12 21C12 21 16.5 17 16.5 12C16.5 7 12 3 12 3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        className="embrace-right text-primary"
      />
      <path
        d="M12 21C12 21 7.5 17 7.5 12C7.5 7 12 3 12 3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        className="embrace-left text-primary"
      />
      <circle
        cx="12"
        cy="12"
        r="7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="3 3"
        className="outer-circle"
      />
    </svg>
  );
}

export function SearchLovedOnesIcon({ className, ...props }: IconProps) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("", className)}
      {...props}
    >
      <title>Search for Loved Ones Symbol</title>
      {/* Search circle */}
      <circle
        cx="11"
        cy="11"
        r="6"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      {/* Search handle */}
      <path
        d="M15.5 15.5L19 19"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Heart */}
      <path
        d="M11 7C11 7 9 6 8 7C7 8 7 10 8 11C9 12 11 13.5 11 13.5C11 13.5 13 12 14 11C15 10 15 8 14 7C13 6 11 7 11 7Z"
        fill="currentColor"
        className="text-primary"
        strokeWidth="0"
      />
    </svg>
  );
}

export function DocumentationIcon({ className, ...props }: IconProps) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("", className)}
      {...props}
    >
      <title>Documentation Symbol</title>
      <path
        d="M4 4V20C4 20 4 21 5 21H19C20 21 20 20 20 20V7L16 3H5C4 3 4 4 4 4Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M16 3V7H20"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M8 12H16"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        className="text-primary"
      />
      <path
        d="M8 16H16"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        className="text-primary"
      />
      <path
        d="M8 8H12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        className="text-primary"
      />
    </svg>
  );
}
