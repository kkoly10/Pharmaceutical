import Link from "next/link";
import { signOut } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-4">
          <nav className="flex gap-4 text-sm font-medium">
            <Link href="/">What to wear</Link>
            <Link href="/closet">Closet</Link>
          </nav>
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-8">{children}</main>
    </div>
  );
}
