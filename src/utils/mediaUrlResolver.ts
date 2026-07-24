/**
 * Media URL Resolution & Pre-Flight Validation Utility for WhatsApp Cloud API
 * Ensures all media links sent to Meta are fully qualified, public HTTPS URLs
 * and conform to supported file extensions (PDF, DOCX, PPT, XLS, ZIP, JPG, PNG, WEBP, MP4).
 */

export interface MediaResolutionResult {
  isPublic: boolean;
  url: string;
  fileExtension?: string;
  error?: string;
}

const SUPPORTED_EXTENSIONS = ['pdf', 'docx', 'doc', 'ppt', 'pptx', 'xls', 'xlsx', 'zip', 'jpg', 'jpeg', 'png', 'webp', 'mp4'];

export function resolvePublicMediaUrl(rawUrlOrPath?: string): MediaResolutionResult {
  if (!rawUrlOrPath || !rawUrlOrPath.trim()) {
    return {
      isPublic: false,
      url: '',
      error: 'Media URL or file path is empty.'
    };
  }

  const clean = rawUrlOrPath.trim();

  // Extract file extension
  const extMatch = clean.split('?')[0].split('.').pop()?.toLowerCase() || '';
  const fileExtension = extMatch;

  let finalUrl = clean;

  // 1. Fully qualified HTTP/HTTPS URL
  if (/^https?:\/\//i.test(clean)) {
    if (/localhost|127\.0\.0\.1/i.test(clean)) {
      const publicOrigin = 'https://courses.excelcomputers.info';
      const path = new URL(clean).pathname;
      finalUrl = `${publicOrigin}${path}`;
    }
  } else {
    // 2. Relative path (e.g. /assets/materials/syllabus.pdf)
    const relativePath = clean.startsWith('/') ? clean : `/${clean}`;
    let baseOrigin = 'https://courses.excelcomputers.info';

    if (typeof window !== 'undefined' && window.location && window.location.origin) {
      if (!/localhost|127\.0\.0\.1/i.test(window.location.origin)) {
        baseOrigin = window.location.origin;
      }
    }
    finalUrl = `${baseOrigin}${relativePath}`;
  }

  // Pre-flight HTTPS Validation
  if (!finalUrl.startsWith('https://')) {
    return {
      isPublic: false,
      url: finalUrl,
      fileExtension,
      error: `Media URL must use secure HTTPS scheme for Meta Cloud API. Received: "${finalUrl}"`
    };
  }

  // Pre-flight Extension Check (if extension present)
  if (fileExtension && fileExtension.length <= 4 && !SUPPORTED_EXTENSIONS.includes(fileExtension)) {
    console.warn(`[MediaUrlResolver] File extension ".${fileExtension}" is outside standard WhatsApp supported formats.`);
  }

  return {
    isPublic: true,
    url: finalUrl,
    fileExtension
  };
}
