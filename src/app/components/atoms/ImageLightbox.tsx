import { useState } from 'react';

type ImageLightboxProps = {
  src: string;
  alt: string;
  className?: string;
};

export function ImageLightbox({ src, alt, className }: ImageLightboxProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!src) return null;

  return (
    <>
      <img
        src={src}
        alt={alt}
        className={`${className} cursor-pointer hover:opacity-80 transition-opacity`}
        onClick={() => setIsOpen(true)}
      />

      {isOpen && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh] flex flex-col items-center">
            <button 
              className="absolute -top-12 right-0 text-white hover:text-primary transition-colors flex items-center gap-2 font-bold"
              onClick={() => setIsOpen(false)}
            >
              <span className="material-symbols-outlined">close</span>
              Tutup
            </button>
            <img
              src={src}
              alt={alt}
              className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <p className="text-white/60 text-sm mt-4 italic">{alt}</p>
          </div>
        </div>
      )}
    </>
  );
}
