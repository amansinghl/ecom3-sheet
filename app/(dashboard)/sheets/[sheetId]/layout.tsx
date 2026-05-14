import { Header } from '@/components/layout/header';
import { SheetTabs } from '@/components/layout/sheet-tabs';
import { FortuneCookie } from '@/components/ui/fortune-cookie';
import { AprilFoolsBanner } from '@/components/april-fools-banner';

export default function SheetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen flex-col">
      <Header />
      <AprilFoolsBanner />
      <SheetTabs />
      <main className="flex-1 overflow-hidden">{children}</main>
      <FortuneCookie />
    </div>
  );
}
