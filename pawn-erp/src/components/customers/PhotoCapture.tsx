import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/cn';
import { Button } from '../ui/Button';

interface PhotoCaptureProps {
  currentUrl?: string | null;
  onFileSelected: (file: File | null) => void;
  compact?: boolean;
}

export function PhotoCapture({ currentUrl, onFileSelected, compact }: PhotoCaptureProps) {
  const { t } = useTranslation('customer');
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const [cameraOn, setCameraOn] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    setPreview(currentUrl ?? null);
  }, [currentUrl]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
    };
  }, []);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
    setCameraOn(false);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
    } catch {
      alert('Camera access denied or unavailable');
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
        setPreview(URL.createObjectURL(blob));
        onFileSelected(file);
        stopCamera();
      },
      'image/jpeg',
      0.92
    );
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    onFileSelected(file);
  };

  const sizeClass = compact ? 'h-28 w-28' : 'h-40 w-40';

  return (
    <div className="shrink-0 space-y-2">
      <div className={cn('flex items-center justify-center overflow-hidden rounded-xl bg-zinc-100 ring-1 ring-zinc-950/10', sizeClass)}>
        {cameraOn ? (
          <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
        ) : preview ? (
          <img src={preview} alt={t('photo.preview')} className="h-full w-full object-cover" />
        ) : (
          <span className="px-2 text-center text-xs text-zinc-500">{t('photo.no_photo')}</span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={onFileChange}
        />
        <Button type="button" variant="secondary" onClick={() => fileRef.current?.click()}>
          {t('photo.upload')}
        </Button>
        {!cameraOn ? (
          <Button type="button" variant="secondary" onClick={startCamera}>
            {t('photo.camera')}
          </Button>
        ) : (
          <>
            <Button type="button" onClick={capturePhoto}>
              {t('photo.capture')}
            </Button>
            <Button type="button" variant="ghost" onClick={stopCamera}>
              {t('photo.cancel_camera')}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
