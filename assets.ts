// Asset SVGs as strings
const geckoSVG = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(50,50) rotate(45)">
    <ellipse cx="0" cy="0" rx="30" ry="18" fill="#34D399"/>
    <path d="M -25 0 C -50 -50, 50 -50, 25 0 C 40 20, -40 20, -25 0" fill="#10B981"/>
    <circle cx="-10" cy="-5" r="5" fill="white"/>
    <circle cx="-9" cy="-5" r="2.5" fill="black"/>
    <circle cx="10" cy="-5" r="5" fill="white"/>
    <circle cx="9" cy="-5" r="2.5" fill="black"/>
  </g>
</svg>
`;

const cricketNormalSVG = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <g fill="#EF4444">
    <ellipse cx="50" cy="55" rx="30" ry="20"/>
    <circle cx="50" cy="40" r="15"/>
    <path d="M 40 30 Q 20 10 35 20" stroke="black" stroke-width="3" fill="none"/>
    <path d="M 60 30 Q 80 10 65 20" stroke="black" stroke-width="3" fill="none"/>
  </g>
  <g fill="black">
    <circle cx="45" cy="40" r="3"/>
    <circle cx="55" cy="40" r="3"/>
  </g>
</svg>
`;

const cricketRangerSVG = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <g fill="#F97316">
    <ellipse cx="50" cy="55" rx="30" ry="20"/>
    <circle cx="50" cy="40" r="15"/>
    <path d="M 40 30 Q 10 -10 35 15" stroke="black" stroke-width="4" fill="none"/>
    <path d="M 60 30 Q 90 -10 65 15" stroke="black" stroke-width="4" fill="none"/>
  </g>
  <g fill="white">
    <circle cx="45" cy="40" r="4"/>
    <circle cx="55" cy="40" r="4"/>
  </g>
   <g fill="black">
    <circle cx="45" cy="40" r="2"/>
    <circle cx="55" cy="40" r="2"/>
  </g>
</svg>
`;

const cricketFastSVG = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <g fill="#EC4899">
    <ellipse cx="50" cy="60" rx="25" ry="15"/>
    <ellipse cx="50" cy="40" rx="12" ry="18"/>
    <path d="M 40 30 Q 30 10 45 20" stroke="black" stroke-width="2" fill="none"/>
    <path d="M 60 30 Q 70 10 55 20" stroke="black" stroke-width="2" fill="none"/>
  </g>
  <g fill="yellow">
    <circle cx="46" cy="38" r="2"/>
    <circle cx="54" cy="38" r="2"/>
  </g>
</svg>
`;

const cricketTankSVG = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <g fill="#8B5CF6">
    <ellipse cx="50" cy="55" rx="35" ry="25"/>
    <rect x="30" y="25" width="40" height="30" rx="10"/>
  </g>
  <g fill="#4C1D95">
      <rect x="25" y="45" width="50" height="20" rx="5"/>
  </g>
  <g fill="red">
    <circle cx="45" cy="40" r="3"/>
    <circle cx="55" cy="40" r="3"/>
  </g>
</svg>
`;

const championSVG = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <rect x="20" y="20" width="60" height="60" rx="10" fill="#4B5563"/>
    <path d="M30 20 L 70 20 L 80 50 L 50 80 L 20 50 Z" fill="#6B7280"/>
    <circle cx="50" cy="50" r="15" fill="#DC2626"/>
    <circle cx="50" cy="50" r="10" fill="#F87171"/>
    <g transform="translate(50,50)">
        <path d="M 0 -20 L 5 -15 L 0 -10 L -5 -15 Z" fill="#FBBF24"/>
        <path d="M 0 20 L 5 15 L 0 10 L -5 15 Z" fill="#FBBF24"/>
        <path d="M -20 0 L -15 5 L -10 0 L -15 -5 Z" fill="#FBBF24"/>
        <path d="M 20 0 L 15 5 L 10 0 L 15 -5 Z" fill="#FBBF24"/>
    </g>
</svg>
`

export interface GameAssets {
    player: HTMLImageElement;
    enemyNormal: HTMLImageElement;
    enemyRanger: HTMLImageElement;
    enemyFast: HTMLImageElement;
    enemyTank: HTMLImageElement;
    enemyChampion: HTMLImageElement;
    loaded: boolean;
}

const createImage = () => typeof Image !== 'undefined' ? new Image() : ({} as HTMLImageElement);

// Initialize asset objects
export const gameAssets: GameAssets = {
    player: createImage(),
    enemyNormal: createImage(),
    enemyRanger: createImage(),
    enemyFast: createImage(),
    enemyTank: createImage(),
    enemyChampion: createImage(),
    loaded: false,
};

// Function to convert SVG string to Image object
function svgToImage(svgString: string, image: HTMLImageElement): Promise<void> {
    return new Promise((resolve, reject) => {
        const blob = new Blob([svgString], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        image.onload = () => {
            URL.revokeObjectURL(url);
            resolve();
        };
        image.onerror = (err) => {
            URL.revokeObjectURL(url);
            reject(err);
        };
        image.src = url;
    });
}

// Function to load all assets
export async function loadAssets(): Promise<void> {
    const promises = [
        svgToImage(geckoSVG, gameAssets.player),
        svgToImage(cricketNormalSVG, gameAssets.enemyNormal),
        svgToImage(cricketRangerSVG, gameAssets.enemyRanger),
        svgToImage(cricketFastSVG, gameAssets.enemyFast),
        svgToImage(cricketTankSVG, gameAssets.enemyTank),
        svgToImage(championSVG, gameAssets.enemyChampion),
    ];
    await Promise.all(promises);
    gameAssets.loaded = true;
}