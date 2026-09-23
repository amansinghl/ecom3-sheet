import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { SheetView } from '@/components/sheet/sheet-view';
import { getSheetById } from '@/lib/config/sheets';
import { canAccessSheet } from '@/lib/sheet-access';

interface PageProps {
  params: Promise<{
    sheetId: string;
  }>;
}

export default async function SheetPage({ params }: PageProps) {
  const session = await auth();
  const { sheetId } = await params;

  if (!session) {
    redirect('/');
  }

  const config = getSheetById(sheetId);

  if (!config || !canAccessSheet(sheetId, session.user?.email)) {
    redirect('/sheets/escalations');
  }

  const userRole = (session.user as any)?.role || 'viewer';

  return <SheetView config={config} userRole={userRole} />;
}
