import './styles.css';
import { DungeonGenerator } from './generator';
import { DungeonRenderer } from './renderer';
import type { GenerationConfig } from './types';
import { PRNG } from './prng';
import { Dice } from './dice';
import { DUNGEON_CONSTANTS } from './constants';

const svgElement = document.querySelector<SVGSVGElement>('#dungeon-svg');
const seedInput = document.querySelector<HTMLInputElement>('#seed-input');
const persistSeedCheckbox = document.querySelector<HTMLInputElement>('#persist-seed');
const stepDisplay = document.querySelector<HTMLSpanElement>('#step-display');
const nextButton = document.querySelector<HTMLButtonElement>('#next-step');
const prevButton = document.querySelector<HTMLButtonElement>('#prev-step');
const lastStepButton = document.querySelector<HTMLButtonElement>('#last-step');
const resetButton = document.querySelector<HTMLButtonElement>('#reset');

if (!svgElement) {
  throw new Error("SVG element with id 'dungeon-svg' not found");
}

// Local storage keys
const SEED_KEY = 'dungeon-seed';
const PERSIST_SEED_KEY = 'persist-dungeon-seed';

// Initialize PRNG, generator and renderer
// const seed = 1738277232585;
// const seed = 1738405946252;
// const seed = 1738879648505; // TypeError: Cannot read properties of undefined (reading 'y')
// const seed = 1738879581226; //  straight path solve
// const seed = 1738879852013; //  straight path solve 2
// const seed = 1738880047796; //  straight path solve 2

// Check if we should use a persisted seed
const shouldPersistSeed = localStorage.getItem(PERSIST_SEED_KEY) === 'true';
let seed: number;

if (shouldPersistSeed && localStorage.getItem(SEED_KEY)) {
  // Use the persisted seed if available and persistence is enabled
  seed = parseInt(localStorage.getItem(SEED_KEY) || '', 10);

  // Update the checkbox state
  if (persistSeedCheckbox) {
    persistSeedCheckbox.checked = true;
  }
} else {
  // Otherwise use the current timestamp
  // Initialize PRNG, generator and renderer
  // seed = 1738277232585;
  // seed = 1738405946252;
  // seed = 1738879648505; // TypeError: Cannot read properties of undefined (reading 'y')
  // seed = 1738879581226; //  straight path solve
  // seed = 1738879852013; //  straight path solve 2
  // seed = 1738880047796; //  straight path solve 2
  seed = 1740871377536;
  // seed = Date.now();
}

// Initialize the PRNG with the seed
new PRNG(seed);


if (seedInput) {
  seedInput.value = seed.toString();
}

// Set up event listeners for seed controls
if (persistSeedCheckbox) {
  persistSeedCheckbox.addEventListener('change', () => {
    localStorage.setItem(PERSIST_SEED_KEY, persistSeedCheckbox.checked.toString());

    // If persistence is enabled, save the current seed
    if (persistSeedCheckbox.checked && seedInput) {
      localStorage.setItem(SEED_KEY, seedInput.value);
    }
  });
}

// Function to generate a dungeon with a specific seed
function generateDungeon(seedValue: number) {
  // Store the seed if persistence is enabled
  if (persistSeedCheckbox && persistSeedCheckbox.checked) {
    localStorage.setItem(SEED_KEY, seedValue.toString());
  }

  // Initialize the PRNG with the new seed
  new PRNG(seedValue);

  // Generate dungeon configuration using dice rolls
  const numRooms = Dice.roll(6, 4).total; // 4d6 rooms

  const config: GenerationConfig = {
    numRooms,
    dungeonWidth: numRooms * DUNGEON_CONSTANTS.CELL_SIZE,
    dungeonHeight: numRooms * DUNGEON_CONSTANTS.CELL_SIZE,
    branchingFactor: Dice.roll(100).total, // d100: higher means more linear
    directionalBias: Dice.roll(100).total, // d100: higher means more likely to continue same direction
    minSecondaryLinks: Dice.roll(2).total, // 1d2 minimum secondary connections
    maxSecondaryLinks: Dice.roll(2).total + 2, // 1d2+2 maximum secondary connections
    cellSize: DUNGEON_CONSTANTS.CELL_SIZE,
  };

  console.log('Generating dungeon with config:', config);

  // Generate the dungeon
  const dungeon = generator.generate(config);

  if (generator.validateDungeon(dungeon)) {
    console.log('Generated valid dungeon with:', {
      rooms: dungeon.rooms.length,
      links: dungeon.links.length,
    });
    const navigationData = generator.createNavigationGrid();

    // Initialize the render but don't draw links yet
    renderer.initializeRender(dungeon, navigationData);

    // Immediately advance to the last step
    while (renderer.nextStep()) { }

    // Update step display
    updateStepDisplay();
  } else {
    console.error('Generated dungeon is not fully connected');
    const navigationData = generator.createNavigationGrid();
    renderer.renderDebug(dungeon, navigationData);
  }
}

// Set up seed input event listener
if (seedInput) {
  // Apply seed when Enter key is pressed in the input field
  seedInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      const newSeed = parseInt(seedInput.value, 10);
      if (!isNaN(newSeed)) {
        generateDungeon(newSeed);
      }
    }
  });

  // Also apply seed when input loses focus
  seedInput.addEventListener('blur', () => {
    const newSeed = parseInt(seedInput.value, 10);
    if (!isNaN(newSeed)) {
      generateDungeon(newSeed);
    }
  });
}

const generator = new DungeonGenerator();
const renderer = new DungeonRenderer(svgElement);

// Update step display
const updateStepDisplay = () => {
  if (stepDisplay) {
    stepDisplay.textContent = `Step ${renderer.getCurrentStep() + 1} of ${renderer.getTotalSteps()}`;
  }
};

// Generate the initial dungeon
generateDungeon(seed);

// Add button event listeners
if (nextButton) {
  nextButton.addEventListener('click', () => {
    renderer.nextStep();
    updateStepDisplay();
  });
}

if (prevButton) {
  prevButton.addEventListener('click', () => {
    renderer.previousStep();
    updateStepDisplay();
  });
}

if (lastStepButton) {
  lastStepButton.addEventListener('click', () => {
    // Keep stepping until we reach the end
    while (renderer.nextStep()) { }
    updateStepDisplay();
  });
}

if (resetButton) {
  resetButton.addEventListener('click', () => {
    // Generate a new dungeon with a new seed
    const newSeed = Date.now();
    if (seedInput) {
      seedInput.value = newSeed.toString();
    }
    generateDungeon(newSeed);
  });
}
