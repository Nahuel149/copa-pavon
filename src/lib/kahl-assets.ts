export const heroTrophyImage = "/kahl-assets/copa-kahl.jpeg";

export const kahlGalleryImages = [
  "/kahl-assets/asset-01.jpeg",
  "/kahl-assets/asset-02.jpeg",
  "/kahl-assets/asset-03.jpeg",
  "/kahl-assets/asset-04.jpeg",
  "/kahl-assets/asset-05.jpeg",
  "/kahl-assets/asset-06.jpeg",
  "/kahl-assets/asset-07.jpeg",
  "/kahl-assets/asset-08.jpeg",
  "/kahl-assets/asset-09.jpeg",
  "/kahl-assets/asset-10.jpeg",
  "/kahl-assets/asset-11.jpeg",
  "/kahl-assets/asset-12.jpeg",
  "/kahl-assets/asset-13.jpeg",
  "/kahl-assets/asset-14.jpeg",
];

export function getPageImages(seed: string, count = 4) {
  const offset = seed.split("").reduce((total, letter) => total + letter.charCodeAt(0), 0) % kahlGalleryImages.length;
  return Array.from({ length: count }, (_, index) => kahlGalleryImages[(offset + index * 3) % kahlGalleryImages.length]);
}
