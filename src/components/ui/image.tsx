
import React from 'react';

interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  alt: string;
}

const Image = ({ src, alt, className, ...props }: ImageProps) => {
  return (
    <img 
      src={src} 
      alt={alt}
      className={className}
      {...props}
    />
  );
};

export default Image;
