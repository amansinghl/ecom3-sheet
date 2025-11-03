import { Header } from '@/components/layout/header';
import { SheetTabs } from '@/components/layout/sheet-tabs';

export default function SheetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen flex-col">
      <Header />
      <SheetTabs />
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
