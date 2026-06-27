/**
 * Kompresi gambar client-side menggunakan HTML5 Canvas.
 * Mengurangi ukuran gambar hingga 80% dan meresize jika terlalu besar.
 */

export async function compressImageToBase64(file: File, quality = 0.8, maxWidth = 1024, maxHeight = 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate the width and height, constraining the proportions
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        // Draw image on canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Get base64 representation of the compressed image
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        
        // ImgBB needs raw base64 without the data URI prefix
        const base64Raw = dataUrl.split(',')[1];
        resolve(base64Raw);
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
}
