import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Check your email" };

export default function CheckEmailPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-bone font-display m-0 text-[30px] font-medium">
        Check your email
      </h1>
      <p className="text-secondary m-0 text-[15px] leading-[1.7]">
        We sent you a confirmation link. Open it and your account will be ready —
        you can close this tab.
      </p>
      <p className="text-dim m-0 text-[13.5px]">
        Wrong address, or nothing arrived?{" "}
        <Link href="/signup" className="text-teal hover:text-amber">
          Sign up again
        </Link>
        .
      </p>
    </div>
  );
}
