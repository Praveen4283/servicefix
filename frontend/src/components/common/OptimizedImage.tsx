
import { Box, BoxProps } from '@mui/material';

interface OptimizedImageProps extends Omit<BoxProps, 'component'> {
  src: string;
  alt: string;
  avifSrc?: string;
  webpSrc?: string;
  fallbackSrc?: string;
  width?: string | number;
  height?: string | number;
}

/**
 * OptimizedImage component that uses picture element to serve optimal image format
 * Serves AVIF first, then WebP, then falls back to original format (PNG/JPG)
 */
const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  avifSrc,
  webpSrc,
  fallbackSrc,
  width,
  height,
  sx,
  ...props
}) => {
  // If no specific formats are provided, generate paths based on the original src
  const baseSrc = fallbackSrc || src;
  const baseWithoutExt = baseSrc.substring(0, baseSrc.lastIndexOf('.')) || baseSrc;

  const avifPath = avifSrc || `${baseWithoutExt}.avif`;
  const webpPath = webpSrc || `${baseWithoutExt}.webp`;

  return (
    <Box
      component="picture"
      sx={{
        display: 'inline-block',
        ...sx
      }}
      {...props}
    >
      {/* AVIF format - best compression and quality */}
      <source
        srcSet={avifPath}
        type="image/avif"
      />

      {/* WebP format - good compression, wider support */}
      <source
        srcSet={webpPath}
        type="image/webp"
      />

      {/* Original format fallback */}
      <Box
        component="img"
        src={baseSrc}
        alt={alt}
        sx={{
          width: width || '100%',
          height: height || 'auto',
          display: 'block',
        }}
        loading="lazy"
      />
    </Box>
  );
};

export default OptimizedImage; 