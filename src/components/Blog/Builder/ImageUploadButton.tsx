'use client';

import { useRef, useState } from 'react';
import { IMAGE_ACCEPT, UploadError, uploadImage } from './uploadHelpers';

export default function ImageUploadButton({
  onUploaded,
  disabled,
  label = '↑ upload',
  compact = false,
}: {
  onUploaded: (publicUrl: string) => void;
  disabled?: boolean;
  label?: string;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file
    if (!file) return;
    setError(null);
    setPending(true);
    try {
      const { publicUrl } = await uploadImage(file);
      onUploaded(publicUrl);
    } catch (err) {
      setError(err instanceof UploadError ? err.message : 'Upload failed.');
    } finally {
      setPending(false);
    }
  };

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 4 }}>
      <button
        type="button"
        className={compact ? 'tn-btn sm' : 'tn-btn'}
        disabled={disabled || pending}
        onClick={() => inputRef.current?.click()}
        style={{ opacity: disabled || pending ? 0.6 : 1 }}
      >
        {pending ? 'uploading…' : label}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        onChange={onPick}
        style={{ display: 'none' }}
      />
      {error ? (
        <span
          style={{
            fontFamily: 'var(--tn-mono)',
            fontSize: 10,
            color: 'var(--tn-err)',
          }}
        >
          ! {error}
        </span>
      ) : null}
    </div>
  );
}
