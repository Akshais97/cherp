---
name: react-bits
description: Use when creating or adding interactive, animated components, text animations, spotlight cards, or custom canvas backgrounds. Documents installation via jsrepo, shadcn, or manual code pasting for TS-CSS (TypeScript + CSS) and TS-TW (TypeScript + Tailwind) configurations. Contains a complete index of all 134 components.
license: MIT
version: "1.0.0"
---

# React Bits Skill

React Bits is a collection of open-source, lightweight, and highly customizable React animated components. It focuses on creative UI components (text animations, interactive cards, backgrounds) built on top of Framer Motion and HTML5 Canvas.

## Project Stack Alignment

This project is built using:
- **React 19 + TypeScript + Vite**
- **Vanilla CSS** (stored in [App.css](file:///d:/Chlear%20Projects/Marketerp/cherp/frontend/src/App.css))
- **Framer Motion** (`framer-motion` or `motion/react`)

When integrating components:
1. **Prefer the TS-CSS variant** of components because our project uses Vanilla CSS rather than Tailwind.
2. If custom styling is needed, write the styling in [App.css](file:///d:/Chlear%20Projects/Marketerp/cherp/frontend/src/App.css) or create a component-specific `.css` file.
3. Import from `motion/react` if Framer Motion v12 imports are required.

---

## 1. Installation Methods

You can install React Bits components using three methods:

### Method A: Manual Copy-Paste (Recommended for Vanilla CSS)
1. Visit the component page on [reactbits.dev](https://reactbits.dev).
2. Select the **TS-CSS** tab.
3. Copy the component code and place it under `frontend/src/components/ui/` (e.g., `DecryptedText.tsx`).
4. Copy the CSS file code and place it alongside the component (e.g., `DecryptedText.css`), or append the classes to `App.css`.

### Method B: Using jsrepo CLI
To add components directly to your workspace:
```bash
# Suffix with component Category and Name:
npx jsrepo add github/DavidHDev/react-bits/src/ts-css/<Category>/<ComponentName>
```
*Variants available: `ts-css` (preferred), `ts-tailwind`, `js-css`, `js-tailwind`.*

### Method C: Using shadcn CLI
```bash
# Suffix component name with -TS-CSS or -TS-TW
npx shadcn@latest add @react-bits/<ComponentName>-TS-CSS
```

---

## 2. Complete Component Index (134 Components)

### Category: TextAnimations (23 Components)
*Installation path:* `TextAnimations/<ComponentName>`

* **ASCIIText:** Renders text converted into interactive ASCII art characters.
* **BlurText:** Animates text characters with blur transition.
* **CircularText:** Renders text along a circular path.
* **CountUp:** Animate numeric counting transitions.
* **CurvedLoop:** Text rotating on a curved loop banner.
* **DecryptedText:** Scrambles characters before resolving to the final text.
* **FallingText:** Animates characters falling down physics-style.
* **FuzzyText:** Text with an interactive particle fuzzy noise effect.
* **GlitchText:** Glitching pixel style text animations.
* **GradientText:** Moving gradient coloration for text.
* **RotatingText:** Transitions through a list of words with sliding animations.
* **ScrambledText:** Characters shuffle randomly before fixing.
* **ScrollFloat:** Character letters floating on window scroll.
* **ScrollReveal:** Reveals text word-by-word or letter-by-letter on scroll.
* **ScrollVelocity:** Text moving banner with speed based on scroll velocity.
* **ShinyText:** Sliding shimmer overlay reflect across text.
* **Shuffle:** Shuffles characters/words.
* **SplitText:** Splits text into words or characters for separate animations.
* **TextCursor:** Custom text cursor typing effect.
* **TextPressure:** Fluid text scaling based on container width.
* **TextType:** Typewriter typing text effect.
* **TrueFocus:** Animates blur/focus contrast on words.
* **VariableProximity:** Changes text weight/width based on mouse cursor distance.

---

### Category: Backgrounds (45 Components)
*Installation path:* `Backgrounds/<ComponentName>`

* **Aurora:** Smooth northern-lights shifting wavy gradient background.
* **Balatro:** Trippy rolling color wave background (inspired by Balatro game).
* **Ballpit:** Interactive 2D bouncing ball physics simulation.
* **Beams:** Moving light beam lasers background.
* **ColorBends:** Curving color bands wave background.
* **DarkVeil:** Dark abstract moving mist.
* **Dither:** Dithered retro image/video shading layer.
* **DotField:** 3D shifting field of dot particles.
* **DotGrid:** Interactive grid of dot elements.
* **EvilEye:** Stylized staring geometric eye pattern background.
* **FaultyTerminal:** Old CRT terminal glitch noise background.
* **Ferrofluid:** Liquid magnetic ferrofluid particle physics simulations.
* **FloatingLines:** Moving horizontal/vertical neon outline wires.
* **Galaxy:** Particle vortex galaxy space simulation.
* **GradientBlinds:** Rotating linear gradient blinds background.
* **Grainient:** Grainy noise animated gradient.
* **GridDistortion:** Grid warping under mouse movements.
* **GridMotion:** Scrolling grid of tiles.
* **GridScan:** Grid scanning matrix cyber effect.
* **Hyperspeed:** Warp speed space stars streak lines.
* **Iridescence:** Shimmering oil-spill rainbow colors.
* **LetterGlitch:** Grid of glitching binary/ASCII characters.
* **LightPillar:** Moving volumetric light pillars.
* **LightRays:** Shimmering light beams behind content.
* **Lightfall:** Matrix-style cascading rain of light.
* **Lightning:** Procedural electric lightning strikes.
* **LineWaves:** Wavy line network grids.
* **LiquidChrome:** Metallic reflective mercury liquid chrome background.
* **LiquidEther:** Smooth morphing liquid color wash.
* **Orb:** Volumetric moving liquid glass sphere.
* **Particles:** Lightweight canvas-based moving interactive particles.
* **PixelBlast:** Exploding pixel debris interactive particles.
* **PixelSnow:** Retro pixelated falling snow simulation.
* **Plasma:** Classic colorful shifting plasma wave simulation.
* **PlasmaWave:** Horizontal sine wave line ribbons.
* **Prism:** Shifting color glass prism refracting colors.
* **PrismaticBurst:** Concentric pulsing color ring blasts.
* **Radar:** Concentric sweep sonar radar scanner.
* **RippleGrid:** Grid that ripples outwards when clicked.
* **ShapeGrid:** Interactive responsive shapes layout grid.
* **SideRays:** Side light ray streams.
* **Silk:** Morphing wavy abstract silk sheets.
* **SoftAurora:** A lighter, softer CSS aurora wash.
* **Threads:** Network of connecting spline thread nodes.
* **Waves:** Flowing wave curves.

---

### Category: Components (36 Components)
*Installation path:* `Components/<ComponentName>`

* **AnimatedList:** Container animating list items on insert/delete.
* **BorderGlow:** Border card with moving neon neon outlines.
* **BounceCards:** Cards that bounce when hovered.
* **BubbleMenu:** Menu items expanding/shifting like bubbles.
* **CardNav:** Nav items rendered as sliding interactive cards.
* **CardSwap:** Cards swapping layers on click.
* **Carousel:** Smooth 3D/horizontal carousel list.
* **ChromaGrid:** Chromatic grid matrix.
* **CircularGallery:** Rotating ring gallery layout.
* **Counter:** Animated odometer counting numbers.
* **DecayCard:** Card crumbling/decaying on hover.
* **Dock:** MacOS style magnifying navigation dock.
* **DomeGallery:** Perspective dome image layout.
* **ElasticSlider:** Slider that stretches elastically.
* **FlowingMenu:** Menu with text labels stretching/following the cursor.
* **FluidGlass:** Glassmorphism frosted card.
* **FlyingPosters:** Dynamic floating image banner stack.
* **Folder:** Interactive tabbed folder files view.
* **GlassIcons:** Frosted glass dock shortcut icons.
* **GlassSurface:** Interactive glass reflection surface card.
* **GooeyNav:** Sticky gooey menu bubble navigation.
* **InfiniteMenu:** Vertical infinite looping navigation menu.
* **Lanyard:** Bouncing 3D employee badge card.
* **MagicBento:** Bento grid layout with interactive tiles.
* **Masonry:** Grid masonry layouts.
* **ModelViewer:** Interactive 3D Model viewer.
* **PillNav:** Pill-shaped nav indicators sliding between buttons.
* **PixelCard:** Card whose contents pixelate on hover.
* **ProfileCard:** Hover-expand interactive profile avatar card.
* **ReflectiveCard:** 3D card showing active glare reflections.
* **ScrollStack:** Vertical stack of cards scrolling overlay.
* **SpotlightCard:** Mouse-follow radial hover spotlight highlight.
* **SpotlightCard:** Card showing radial highlight borders.
* **Stack:** 3D stacked deck layout.
* **StaggeredMenu:** Nested menus expanding with staggered timing.
* **Stepper:** Animated step tracker progress bar.
* **TiltedCard:** 3D hover-tilt card.

---

### Category: Animations (30 Components)
*Installation path:* `Animations/<ComponentName>`

* **AnimatedContent:** Basic wrappers animating content on mount/update.
* **Antigravity:** Floating debris items rising up physics-style.
* **BlobCursor:** Elastic liquid blob following the cursor.
* **ClickSpark:** Particle spark explosion at mouse click coordinates.
* **Crosshair:** Interactive targeted scope overlay.
* **Cubes:** 3D wireframe rotating cubes.
* **ElectricBorder:** High-voltage outline border.
* **FadeContent:** Basic fade-in opacity wrappers.
* **GhostCursor:** Cursor leaving a trail of fading ghost duplicates.
* **GlareHover:** Card that shows specular highlights under mouse.
* **GradualBlur:** Content that focuses smoothly.
* **ImageTrail:** Mouse movement leaving a trail of pictures.
* **LaserFlow:** Laser streams looping along vector lines.
* **LogoLoop:** Endless sliding logo slider marquee.
* **MagicRings:** Pulsing nested geometric outline circles.
* **Magnet:** Element attracted to the cursor on close hover.
* **MagnetLines:** Grid lines that point towards mouse coordinates.
* **MetaBalls:** Liquid metaballs blending together.
* **MetallicPaint:** Metallic morphing color canvas brush.
* **Noise:** Subtle animated grain/noise texture overlay.
* **OrbitImages:** Images orbiting around a central hub.
* **PixelTrail:** Mouse movements leaving a fading pixelated trail grid.
* **PixelTransition:** Transitions showing pixel blocks.
* **Ribbons:** Cascading 3D silk ribbons.
* **ShapeBlur:** Morphing blurry vector blobs.
* **SplashCursor:** Volumetric fluid liquid paint splashes on click/drag.
* **StarBorder:** Card with scrolling gradient running along borders.
* **StickerPeel:** Content that peels off like a sticker.
* **Strands:** Wave strands.
* **TargetCursor:** Crosshair mouse cursor theme.

---

## 3. Reference Implementations

### SpotlightCard Component (TS-CSS)
Place in `frontend/src/components/ui/SpotlightCard.tsx`:
```tsx
import React, { useRef, useState } from 'react';
import './SpotlightCard.css';

interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  spotlightColor?: string;
  children: React.ReactNode;
}

export default function SpotlightCard({
  spotlightColor = 'rgba(59, 109, 214, 0.15)',
  children,
  className = '',
  ...props
}: SpotlightCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setCoords({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div
      ref={cardRef}
      className={`spotlight-card ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        ['--spotlight-color' as any]: spotlightColor,
        ['--x' as any]: `${coords.x}px`,
        ['--y' as any]: `${coords.y}px`,
      } as React.CSSProperties}
      {...props}
    >
      <div className="spotlight-card-border" />
      <div className="spotlight-card-content">{children}</div>
    </div>
  );
}
```
Add styles to `SpotlightCard.css`:
```css
.spotlight-card {
  position: relative;
  border-radius: 12px;
  background: var(--card);
  border: 1px solid var(--border);
  overflow: hidden;
}
.spotlight-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(
    circle 250px at var(--x) var(--y),
    var(--spotlight-color),
    transparent 80%
  );
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
}
.spotlight-card:hover::before {
  opacity: 1;
}
```
