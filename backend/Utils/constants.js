// Controlled list of fonts the admin can choose from. The frontend loads them from Google Fonts,
// so only well-known names are accepted — never arbitrary CSS. `weights` lists only weights each
// family actually ships (Google Fonts rejects requests for missing weights).
export const FONT_OPTIONS = [
    { name: "Inter", category: "sans-serif", weights: [400, 500, 600, 700, 800] },
    { name: "DM Sans", category: "sans-serif", weights: [400, 500, 600, 700, 800] },
    { name: "Manrope", category: "sans-serif", weights: [400, 500, 600, 700, 800] },
    { name: "Poppins", category: "sans-serif", weights: [400, 500, 600, 700, 800] },
    { name: "Montserrat", category: "sans-serif", weights: [400, 500, 600, 700, 800] },
    { name: "Space Grotesk", category: "sans-serif", weights: [400, 500, 600, 700] },
    { name: "Playfair Display", category: "serif", weights: [400, 500, 600, 700, 800] },
    { name: "Cormorant Garamond", category: "serif", weights: [400, 500, 600, 700] },
    { name: "Lora", category: "serif", weights: [400, 500, 600, 700] },
    { name: "Libre Baskerville", category: "serif", weights: [400, 700] },
];

export const FONT_NAMES = FONT_OPTIONS.map((font) => font.name);

export const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}){1,2}$/;
