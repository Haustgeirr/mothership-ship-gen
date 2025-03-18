import './styles.css';
import { DungeonGenerator } from './generator';
import { ShipGenerator } from './shipGenerator';
import { SquareCellRenderer } from './renderer';
import { PRNG } from './prng';
import { Dice } from './dice';


const svgElement = document.querySelector<SVGSVGElement>('#dungeon-svg');
const seedInput = document.querySelector<HTMLInputElement>('#seed-input');
const persistSeedCheckbox = document.querySelector<HTMLInputElement>('#persist-seed');
const stepDisplay = document.querySelector<HTMLSpanElement>('#step-display');
const nextButton = document.querySelector<HTMLButtonElement>('#next-step');
const prevButton = document.querySelector<HTMLButtonElement>('#prev-step');
const lastStepButton = document.querySelector<HTMLButtonElement>('#last-step');
const resetButton = document.querySelector<HTMLButtonElement>('#reset');

// Ship detail elements
const shipNameElement = document.querySelector<HTMLElement>('.ship-name');
const shipTypeElement = document.querySelector<HTMLElement>('#ship-type');
const shipStatusElement = document.querySelector<HTMLElement>('#ship-status');
const survivorsElement = document.querySelector<HTMLElement>('#survivors');
const shipSystemsElement = document.querySelector<HTMLElement>('#ship-systems');
const salvageElement = document.querySelector<HTMLElement>('#salvage');
const cargoElement = document.querySelector<HTMLElement>('#cargo');
const causeOfRuinElement = document.querySelector<HTMLElement>('#cause-of-ruin');
const weirdFeatureElement = document.querySelector<HTMLElement>('#weird-feature');
const randomCargoElement = document.querySelector<HTMLElement>('#random-cargo');

const controlsContainer = document.querySelector('.controls');

// Local storage keys
const SEED_KEY = 'dungeon-seed';
const PERSIST_SEED_KEY = 'persist-dungeon-seed';

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
  seed = Date.now();
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

type ShipTypeDeadPlanet = {
  name: string;
  minDecks: number;
  maxDecks: number;
  roomsPerDeck: string;
}

const shipTypesDeadPlanet: Record<number, ShipTypeDeadPlanet> = {
  0: { name: "Mining Frigate", minDecks: 10, maxDecks: 16, roomsPerDeck: "2d6" },
  35: { name: "Freighter", minDecks: 5, maxDecks: 8, roomsPerDeck: "3d6" },
  58: { name: "Raider", minDecks: 4, maxDecks: 4, roomsPerDeck: "1d6" },
  72: { name: "Executive Transport", minDecks: 5, maxDecks: 5, roomsPerDeck: "2d6" },
  81: { name: "Exploration Vessel", minDecks: 10, maxDecks: 30, roomsPerDeck: "4d6" },
  85: { name: "Jumpliner", minDecks: 10, maxDecks: 15, roomsPerDeck: "3d6" },
  89: { name: "Corvette", minDecks: 5, maxDecks: 8, roomsPerDeck: "5d6" },
  92: { name: "Troopship", minDecks: 15, maxDecks: 30, roomsPerDeck: "3d6" },
  96: { name: "Colony Ship", minDecks: 20, maxDecks: 60, roomsPerDeck: "5d6" },
}

type ShipTypeShipBreakers = {
  name: string;
  decks: string;
}

const shipTypesShipBreakers: Record<number, ShipTypeShipBreakers> = {
  0: { name: "Mining Frigate", decks: "2d6" },
  35: { name: "Freighter", decks: "3d6" },
  58: { name: "Raider", decks: "1d6" },
  72: { name: "Executive Transport", decks: "2d6" },
  81: { name: "Exploration Vessel", decks: "4d6" },
  85: { name: "Jumpliner", decks: "3d6" },
  89: { name: "Corvette", decks: "5d6" },
  92: { name: "Troopship", decks: "3d6" },
  96: { name: "Colony Ship", decks: "5d6" },
}

/**
 * Space Encounter Table (d100)
 * Used to determine random encounters in deep space
 */
const shipTypeTable = Dice.createOutcomeTable<ShipTypeShipBreakers>(
  100,
  1,
  shipTypesShipBreakers
);

const shipStatusTable = Dice.createOutcomeTable(
  100,
  1,
  {
    0: "Uninhabitable",
    85: "Habitable (Non-Functioning)",
    95: "Habitable (Functioning)"
  }
);

const survivorsTable = Dice.createOutcomeTable(
  100,
  1,
  {
    0: "No Survivors",
    90: "2D10 Survivors (In Cryosleep)",
    96: "Survivors"
  }
);

const shipSystemsTable = Dice.createOutcomeTable(
  100,
  1,
  {
    0: "Reactor, Thrusters, Jump Drive non-functioning",
    81: "Stable Reactor, Thrusters, Jump Drive",
    94: "Unstable Warp Cores"
  }
);

const salvageTable = Dice.createOutcomeTable(
  100,
  1,
  {
    0: `${Dice.roll(100, 2).total} Scrap`,
    50: `${Dice.roll(10, 1).total} Fuel`,
    76: `${Dice.roll(5, 1).total} Warp Cores`,
    82: `${Dice.roll(10, 1).total} Cryopods`,
    86: "Medbay",
    89: "Weapon",
    92: "Computer",
    96: "Jump Drive"
  }
);

const cargoTable = Dice.createOutcomeTable(
  100,
  1,
  {
    0: `${Dice.roll(10, 4).total} Containers of Ore`,
    61: `${Dice.roll(10, 3).total} Containers of Metal`,
    76: `${Dice.roll(10, 1).total} Containers of Random Cargo`,
    86: `${Dice.roll(10, 1).total} Containers of Precious Metal`,
    93: `${Dice.roll(5, 1).total} Containers of Contraband`
  }
);

const causeOfRuinTable = Dice.createOutcomeTable(
  100,
  1,
  {
    0: "Virus",
    1: "Combat",
    10: "Raided by Pirates",
    20: "Jump Drive Malfunction",
    25: "Abandoned Ship",
    30: "Rogue AI",
    35: "Mutiny",
    40: "Crash: Other Ship",
    45: "Crash: Space Debris",
    50: "Crash: Jump Drive Miscalculation",
    55: "Engine Failure",
    58: "Cannibalism",
    61: "Nerve Gas",
    64: "Escape Pod Never Returned",
    67: "Betrayal/Backstabbing",
    70: "Succumbed to Nightmares",
    72: "Hatch Opened, No Air",
    74: "Cargo Created Mishap",
    76: "Starvation",
    78: "Part of a Conspiracy",
    80: "Thrusters Slagged",
    81: "Weapons System Malfunction",
    82: "Cryosleep Never Disengaged",
    83: "Complex Series of Events",
    84: "Suicide Pact",
    85: "Parasite Infestation",
    86: "Environmental Systems Failure",
    87: "Uncontrollable Fire",
    88: "Failed Fraud Attempt",
    89: "Void Worshiping",
    90: "Bizarre Love Triangle",
    91: "Fight Spiraled Out of Control",
    92: "Chainsaw Rampage",
    93: "Drug Addled Debauchery",
    94: "Fatal Depressurization",
    95: "Nightmares Ending in Heart Attack",
    96: "Mob Hit",
    97: "Crew Members Vanished",
    98: "Prank Taken Too Far",
    99: "William Tell Trick"
  }
);

const weirdTable = Dice.createOutcomeTable(
  100,
  1,
  {
    0: "Haunted",
    1: "Inhabited by Alien Life",
    10: "Terraformed by Strange Creatures",
    20: "Crew Dressed for Costume Party",
    25: "Crew All Identical",
    30: "Crew was preparing Theatrical Performance",
    35: "Morbid Artwork",
    40: "Pet Hoarders",
    45: "Erotic Sculptures",
    50: "Communist Regalia",
    55: "Company Uniform",
    58: "Cult Members",
    61: "Extensive Journals Kept",
    64: "Strange Health Obsession",
    67: "Unnervingly Clean",
    70: "Android was poisoning Captain",
    72: "Ancient Ship",
    74: "Temporal Distortions",
    76: "Failed Utopia",
    78: "Crew Weighed and Measured Weekly",
    80: "Extensive Body Modification",
    81: "Isolated Physics Anomalies",
    82: "Sexual Deviants",
    83: "Religious Extremists",
    84: "Transhumanist Android Worshipers",
    85: "Anti-Android Conspirators",
    86: "Nauseating Stench",
    87: "Everything is Jury-Rigged",
    88: "Crew Taking Video Through the Catastrophe",
    89: "Body Horror",
    90: "Scooby-Doo Crew",
    91: "Interior Coated in Flesh, Doors are Membranes",
    92: "Whispering Echoes Always a Room Ahead",
    93: "Dolls in Macabre Tableaux",
    94: "Dead Crew: Exploded Heads",
    95: "Elaborately Posed Corpses (Hooks & Chains)",
    96: "Flickering Lights and Frenzied Screams",
    97: "Ship Rearranges Itself Frequently",
    98: "Ship Has Infinite Depth",
    99: "Fruit Basket, Greeting Card Inexplicably Addressed to Crew"
  }
);

const randomCargoTable = Dice.createOutcomeTable(
  100,
  1,
  {
    0: "Body Bags (Full)",
    1: "Wine",
    10: "Complex Navigational Equipment",
    20: "Ceramics",
    25: "Antique Books",
    30: "Garden Gnomes (Full of Illegal Stimulants)",
    35: "Opium",
    40: "Tea",
    45: "Silver Bars",
    50: "Sensitive Documents",
    55: "Anthropology Mission",
    58: "Botanists/Horticulturists",
    61: "Industrial Engineers/Architects",
    64: "Terraforming Equipment",
    67: "Hydroponic Plants",
    70: "Rare Wood",
    72: "Lab Rats",
    74: "Cultured Cells",
    76: "Cremains",
    78: "Drug Production Starter Equipment",
    80: "Common Cloth",
    81: "Designer Clothes",
    82: "Expensive Fish (Food)",
    83: "Pets",
    84: "Plastic Junk (gewgaws)",
    85: "Legionaries (guns & ammo)",
    86: "Religious Pilgrims (religious texts and symbols)",
    87: "Compressed Algae Blocks (1 = days rations, gross)",
    88: "Disarmed Ordnance (lacking detonators)",
    89: "Cars (high end)",
    90: "Medicine",
    91: "Cosmetics",
    92: "Race Horse Reproductive Material",
    93: "Livestock",
    94: "Prisoners",
    95: "Mobile Black Site (used for completely illegal interrogation)",
    96: "Census Takers",
    97: "Cadmium",
    98: "Preserved Fruit",
    99: "Refugees"
  }
);

const namePartATable = Dice.createOutcomeTable(
  10,
  1,
  {
    0: "IAGO",
    1: "HECATE",
    2: "OBERON",
    3: "WHITEHALL",
    4: "DUNCAN",
    5: "BANQUO",
    6: "WINTER",
    7: "MARLOWE",
    8: "TEMPEST",
    9: "FAUST"
  }
);

const namePartBTable = Dice.createOutcomeTable(
  10,
  1,
  {
    0: "VALEFOR",
    1: "OPHANIM",
    2: "MARAX",
    3: "MARINER",
    4: "LABOLAS",
    5: "ASTAROTH",
    6: "CHERUBIM",
    7: "TYRANT",
    8: "BALAAM",
    9: "MURMUR"
  }
);

const namePartCTable = Dice.createOutcomeTable(
  10,
  1,
  {
    0: "ECHO",
    1: "ALPHA",
    2: "OMEGA",
    3: "KING",
    4: "BEGGAR",
    5: "DELTA",
    6: "EPSILON",
    7: "JIBRIL",
    8: "BRAVO",
    9: "TANGO"
  }
);


// Function to generate a dungeon with a specific seed
function generateDungeon(seedValue: number) {
  // Store the seed if persistence is enabled
  if (persistSeedCheckbox && persistSeedCheckbox.checked) {
    localStorage.setItem(SEED_KEY, seedValue.toString());
  }

  // Generate ship name
  const namePartA = Dice.rollWithOutcome(namePartATable);
  const namePartB = Dice.rollWithOutcome(namePartBTable);
  const namePartC = Dice.rollWithOutcome(namePartCTable);
  const shipName = `${namePartA} ${namePartB} ${namePartC}`;

  // Update ship name in the UI
  if (shipNameElement) {
    shipNameElement.textContent = shipName;
  }

  const shipType = Dice.rollWithOutcome(shipTypeTable);
  if (shipTypeElement) {
    shipTypeElement.textContent = `${shipType.name}`;
  }

  const shipStatus = Dice.rollWithOutcome(shipStatusTable);
  if (shipStatusElement) {
    shipStatusElement.textContent = shipStatus;
  }

  const survivors = Dice.rollWithOutcome(survivorsTable);
  if (survivorsElement) {
    survivorsElement.textContent = survivors;
  }

  const shipSystems = Dice.rollWithOutcome(shipSystemsTable);
  if (shipSystemsElement) {
    shipSystemsElement.textContent = shipSystems;
  }

  const salvage = Dice.rollWithOutcome(salvageTable);
  if (salvageElement) {
    salvageElement.textContent = salvage;
  }

  const cargo = Dice.rollWithOutcome(cargoTable);
  if (cargoElement) {
    cargoElement.textContent = cargo;
  }

  const causeOfRuin = Dice.rollWithOutcome(causeOfRuinTable);
  if (causeOfRuinElement) {
    causeOfRuinElement.textContent = causeOfRuin;
  }

  const weird = Dice.rollWithOutcome(weirdTable);
  if (weirdFeatureElement) {
    weirdFeatureElement.textContent = weird;
  }

  const randomCargo = Dice.rollWithOutcome(randomCargoTable);
  if (randomCargoElement) {
    randomCargoElement.textContent = randomCargo;
  }

  let dungeon;
  let navigationData;

  // Generate the ship layout
  dungeon = shipGenerator.generateShipFromType(shipType);

  if (shipGenerator.validateDungeon(dungeon)) {
    navigationData = shipGenerator.createNavigationGrid();
  } else {
    navigationData = shipGenerator.createNavigationGrid();
    renderer.renderDebug(dungeon, navigationData);
    return;
  }

  // Initialize the render but don't draw links yet
  renderer.initializeRender(dungeon, navigationData);

  // Immediately advance to the last step
  while (renderer.nextStep()) { }

  // Update step display
  updateStepDisplay();
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

// Initialize generators
const dungeonGenerator = new DungeonGenerator();
const shipGenerator = new ShipGenerator();

if (!svgElement) {
  throw new Error("SVG element with id 'dungeon-svg' not found");
}

// Always use the SquareCellRenderer
const renderer = new SquareCellRenderer(svgElement);

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
