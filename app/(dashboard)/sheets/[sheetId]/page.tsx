import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { SheetView } from '@/components/sheet/sheet-view';
import { getSheetById } from '@/lib/config/sheets';

interface PageProps {
  params: Promise<{
    sheetId: string;
  }>;
}

export default async function SheetPage({ params }: PageProps) {
  const session = await auth();
  const { sheetId } = await params;

  if (!session) {
    redirect('/login');
  }

  const config = getSheetById(sheetId);

  if (!config) {
    redirect('/sheets/escalations');
  }

  const userRole = (session.user as any)?.role || 'viewer';

  return <SheetView config={config} userRole={userRole} />;
}
