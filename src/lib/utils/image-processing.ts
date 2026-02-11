
/**
 * Processes a blob URL or image source into a persistent Base64 string.
 * Resizes the image to a maximum dimension of 800px to optimize storage.
 * 
 * @param blobUrl The ephemeral blob URL (e.g., blob:http://localhost:3000/...)
 * @returns A Promise resolving to the Base64 Data URL string, or undefined if processing fails.
 */
export async function processImageForPersistence(blobUrl: string | null): Promise<string | undefined> {
    if (!blobUrl) return undefined;

    try {
        // Fetch the blob
        const response = await fetch(blobUrl);
        const blob = await response.blob();

        // Compress and convert to Base64
        return await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = reject;
            reader.onloadend = () => {
                const img = new Image();
                img.onerror = reject;
                img.src = reader.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    // Resize to max 800px width/height to save DB space
                    const MAX_SIZE = 800;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_SIZE) {
                            height *= MAX_SIZE / width;
                            width = MAX_SIZE;
                        }
                    } else {
                        if (height > MAX_SIZE) {
                            width *= MAX_SIZE / height;
                            height = MAX_SIZE;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    ctx?.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.7)); // 70% quality JPEG
                };
            };
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.error("Failed to process image for persistence:", e);
        return undefined;
    }
}
