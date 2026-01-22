import { ImageResponse } from 'next/og';
import { getPostBySlug } from '@/lib/contentful';

export const runtime = 'edge';
export const alt = 'SYSTEM_LOGS';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function Image({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  const title = post?.title || 'SYSTEM_LOGS';
  const entryId = post?.entryId || 'LOG_XXX';
  const summary = post?.executiveSummary || 'Strategic insights on AI, Operations, and Business Architecture.';
  const date = post?.publishedDate
    ? new Date(post.publishedDate).toISOString().split('T')[0].replace(/-/g, '.')
    : '2026.01.01';

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#111111',
          padding: '60px',
          fontFamily: 'monospace',
        }}
      >
        {/* Scanline overlay effect */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)',
            pointerEvents: 'none',
          }}
        />

        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '40px',
          }}
        >
          <span style={{ color: '#94A3B8', fontSize: '20px' }}>
            [{date}]
          </span>
          <span style={{ color: '#7C3AED', fontSize: '20px', margin: '0 12px' }}>
            //
          </span>
          <span style={{ color: '#ffffff', fontSize: '20px' }}>
            {entryId}
          </span>
        </div>

        {/* Title */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
          }}
        >
          <h1
            style={{
              color: '#ffffff',
              fontSize: '56px',
              fontWeight: 'bold',
              lineHeight: 1.2,
              marginBottom: '24px',
              maxWidth: '900px',
            }}
          >
            {title}
          </h1>

          {/* Summary */}
          <p
            style={{
              color: '#94A3B8',
              fontSize: '24px',
              lineHeight: 1.5,
              maxWidth: '800px',
            }}
          >
            {summary.length > 150 ? summary.slice(0, 150) + '...' : summary}
          </p>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '40px',
            paddingTop: '24px',
            borderTop: '1px solid #1F1F1F',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ color: '#7C3AED', fontSize: '18px' }}>
              SYSTEM_LOGS
            </span>
            <span style={{ color: '#94A3B8', fontSize: '18px', margin: '0 12px' }}>
              //
            </span>
            <span style={{ color: '#94A3B8', fontSize: '18px' }}>
              beaudawson.com
            </span>
          </div>

          <div style={{ color: '#94A3B8', fontSize: '16px' }}>
            2026 // BEAU_DAWSON // BAD_LABS
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
