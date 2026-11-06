const BUCKET = 'shipment-documents-mumbai';

function allowedAttachmentUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return false;
    const host = url.hostname;
    return host === `${BUCKET}.s3.ap-south-1.amazonaws.com` || host === `${BUCKET}.s3.amazonaws.com` || (host.startsWith('s3.') && host.endsWith('.amazonaws.com') && url.pathname.startsWith(`/${BUCKET}/`));
  } catch {
    return false;
  }
}

function downloadName(value: string | null): string {
  const cleaned = (value || 'download').replace(/[^A-Za-z0-9._-]/g, '_');
  return cleaned.replace(/^\.+/, '') || 'download';
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fileUrl = searchParams.get('url') || '';
  if (!allowedAttachmentUrl(fileUrl)) {
    return new Response('Not found', { status: 404 });
  }

  const upstream = await fetch(fileUrl);
  if (!upstream.ok || !upstream.body) {
    return new Response('Download failed', { status: 502 });
  }

  const name = downloadName(searchParams.get('name'));
  return new Response(upstream.body, {
    headers: {
      'Content-Type': upstream.headers.get('content-type') || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${name}"`,
    },
  });
}
