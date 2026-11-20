export const CLOUDINARY_CLOUD_NAME =
  (import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined) || 'dlhlrul7q';

export type MarketingMediaSlotKey =
  | 'hero_showcase'
  | 'desktop_command'
  | 'patient_portal'
  | 'owner_mobile'
  | 'ai_copilot'
  | 'financial_hub'
  | 'hero_video';

export interface MarketingMediaAsset {
  slot_key: string;
  media_type: 'image' | 'video';
  cloudinary_public_id: string | null;
  external_url: string | null;
  alt_en: string | null;
  alt_ar: string | null;
}

export function buildCloudinaryImageUrl(
  publicId: string,
  opts?: { width?: number; height?: number; crop?: 'limit' | 'fill' | 'fit' },
): string {
  const cleanId = publicId.replace(/^\/+/, '');
  const transforms = ['f_auto', 'q_auto'];
  if (opts?.width) transforms.push(`w_${opts.width}`);
  if (opts?.height) transforms.push(`h_${opts.height}`);
  transforms.push(`c_${opts?.crop ?? 'limit'}`);
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${transforms.join(',')}/${cleanId}`;
}

export function buildCloudinaryVideoUrl(publicId: string): string {
  const cleanId = publicId.replace(/^\/+/, '');
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/video/upload/f_auto,q_auto/${cleanId}`;
}

export function buildCloudinaryVideoPosterUrl(publicId: string): string {
  const cleanId = publicId.replace(/^\/+/, '').replace(/\.(mp4|mov|webm)$/i, '');
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/video/upload/so_0,f_auto,q_auto/${cleanId}.jpg`;
}

export function resolveMediaAssetUrl(
  asset: MarketingMediaAsset | undefined,
  opts?: { width?: number },
): string | null {
  if (!asset) return null;
  if (asset.cloudinary_public_id) {
    return asset.media_type === 'video'
      ? buildCloudinaryVideoUrl(asset.cloudinary_public_id)
      : buildCloudinaryImageUrl(asset.cloudinary_public_id, { width: opts?.width ?? 1400 });
  }
  return asset.external_url || null;
}
