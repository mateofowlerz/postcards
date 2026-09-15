import { getImageProps } from "next/image";
import postcard from "../../public/images/split-rock-postcard.png";

const { props: paperImage } = getImageProps({ src: postcard, alt: "", width: 1032, height: 1310 });

export function PaperTexture() {
  return (
    <svg className="paper-texture" aria-hidden="true" focusable="false" width="100%" height="100%">
      <defs>
        <svg id="paper-swatch" width="192" height="192" viewBox="80 1830 680 680">
          <image href={paperImage.src} width="2064" height="2620" />
        </svg>
        <pattern id="paper-repeat" width="384" height="384" patternUnits="userSpaceOnUse">
          <use href="#paper-swatch" />
          <use href="#paper-swatch" transform="translate(384 0) scale(-1 1)" />
          <use href="#paper-swatch" transform="translate(0 384) scale(1 -1)" />
          <use href="#paper-swatch" transform="translate(384 384) scale(-1 -1)" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#paper-repeat)" />
    </svg>
  );
}
