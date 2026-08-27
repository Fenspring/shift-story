import Link from "next/link";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-[clamp(20px,5vw,64px)] py-16">
      <div className="w-full max-w-[420px]">
        <Link
          href="/"
          className="text-bone font-display mb-10 block text-[21px] font-medium no-underline"
        >
          Shift Story
        </Link>
        {children}
      </div>
    </div>
  );
}
