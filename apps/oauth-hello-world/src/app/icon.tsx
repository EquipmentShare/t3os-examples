// Used by Next.js to generate /icon (and the document favicon) at build time.
import { ImageResponse } from 'next/og';

export const size = { width: 128, height: 128 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0b0d12',
        color: '#7c5cff',
        fontSize: 48,
        fontWeight: 800,
        borderRadius: 24,
      }}
    >
      OA
    </div>,
    size,
  );
}
