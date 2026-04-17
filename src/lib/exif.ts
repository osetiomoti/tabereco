import EXIF from 'exif-js';

export type GPSCoords = {
  latitude: number;
  longitude: number;
};

/**
 * 画像ファイルから GPS 情報を抽出する
 */
export async function getExifGPS(file: File): Promise<GPSCoords | null> {
  return new Promise((resolve) => {
    EXIF.getData(file as any, function (this: any) {
      const lat = EXIF.getTag(this, 'GPSLatitude');
      const latRef = EXIF.getTag(this, 'GPSLatitudeRef');
      const lng = EXIF.getTag(this, 'GPSLongitude');
      const lngRef = EXIF.getTag(this, 'GPSLongitudeRef');

      if (!lat || !lng || !latRef || !lngRef) {
        resolve(null);
        return;
      }

      const latitude = convertToDecimal(lat, latRef);
      const longitude = convertToDecimal(lng, lngRef);

      resolve({ latitude, longitude });
    });
  });
}

function convertToDecimal(params: number[], ref: string): number {
  const degrees = params[0];
  const minutes = params[1];
  const seconds = params[2];
  let decimal = degrees + minutes / 60 + seconds / 3600;

  if (ref === 'S' || ref === 'W') {
    decimal = -decimal;
  }

  return decimal;
}
