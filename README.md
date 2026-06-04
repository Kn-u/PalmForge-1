# 🌴 PalmForge RPG — Island Botanist

A browser-based botanical RPG where you explore a tropical island, excavate genome fragments, cross-breed palm specimens, and manage a greenhouse economy.

## Gameplay

| Section | What you do |
|---|---|
| **Island Exploration** | Walk the 12×12 grid with WASD / arrow keys or the D-pad. Stepping into tall grass (🌿) triggers genome excavation encounters. Each step generates fruit based on your palms' production stats. Random El Niño / Monsoon events can hit your greenhouse. |
| **Gene Sequencer** | Match complementary DNA base pairs (A↔T, C↔G) to earn DNA points. Three difficulty levels: Easy (3 bases), Medium (5), Hard (8). |
| **Cross-breeding Lab** | Select two parent palms to hybridise for 50 DNA. Mendelian Punnett squares show inheritance odds in real time. Also houses the **Fossil Specimen Assembler** — spend 1 Leaf + 1 Bark + 1 Seed from your vault to grow a mystery palm. |
| **Soil Calibrator** | Solve a quadratic equation (discriminant + roots) to earn +50 DNA and boost greenhouse resistance. |
| **Botanist Market** | Sell harvested fruit at $3 each, then spend cash on fertilizer, irrigation, fossil brushes, or weather shields. |
| **Greenhouse Nursery** | View all specimens with their genotypes, resistance bars, and production rates. Transplant palms back to the wild for +30 DNA. |

## Genome Puzzle Vault

Fragments (🍃 Leaf, 🪵 Bark, 🥥 Seed) persist permanently in your sidebar vault across excavation runs. Collect one of each, then assemble a random wild palm in the Lab.

## Weather Shields

Shields block the next natural disaster entirely (El Niño Heatwave or Tropical Monsoon Storm). Each event consumes one shield. Buy more at the Botanist Market for $250.

## Tech Stack

- **React 18** + **TypeScript**
- **Vite 5** (build tool)
- **Tailwind CSS 3**
- **Lucide React** (icons)
- Web Audio API for retro synth sound effects

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5000](http://localhost:5000).

## Build for Production

```bash
npm run build
```

Output goes to `dist/`. Deploy the `dist/` folder to any static host (Netlify, Vercel, GitHub Pages, etc.).

## Netlify Deployment

Set the build command to `npm run build` and publish directory to `dist`. No environment variables required.
