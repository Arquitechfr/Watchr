import { User } from "../models/user.model.js";

const ADJECTIVES = [
  "Cosmic", "Lunar", "Swift", "Misty", "Sunny", "Starry", "Crimson", "Azure",
  "Velvet", "Golden", "Silver", "Neon", "Frosty", "Ember", "Zephyr", "Aurora",
  "Crystal", "Shadow", "Radiant", "Vivid", "Nimbus", "Onyx", "Quartz", "Jade",
  "Coral", "Sage", "Hazel", "Ivory", "Cobalt", "Amber", "Dawn", "Dusk",
  "Echo", "Halo", "Indigo", "Karma", "Lotus", "Maple", "Nova", "Opal",
  "Pixel", "Ruby", "Solstice", "Tidal", "Umbra", "Vesper", "Willow", "Xenon",
  "Yonder", "Zenith",
];

const ANIMALS = [
  "Fox", "Otter", "Panda", "Falcon", "Wolf", "Lynx", "Heron", "Bison",
  "Koala", "Lemur", "Narwhal", "Owl", "Puma", "Quail", "Raven", "Seal",
  "Tiger", "Urchin", "Viper", "Whale", "Yak", "Zebra", "Badger", "Crane",
  "Dolphin", "Eagle", "Ferret", "Gazelle", "Hedgehog", "Ibis", "Jaguar", "Kite",
  "Lion", "Mantis", "Newt", "Octopus", "Platypus", "Raccoon", "Salamander", "Trout",
  "Unicorn", "Vulture", "Walrus", "Xray", "Yellowfin", "Zebu", "Bear", "Cat",
  "Dog", "Hare",
];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateCandidate(): string {
  const adj = ADJECTIVES[randomInt(0, ADJECTIVES.length - 1)];
  const animal = ANIMALS[randomInt(0, ANIMALS.length - 1)];
  const num = randomInt(10, 99);
  return `${adj}${animal}${num}`;
}

export async function generateUniqueUsername(maxAttempts = 10): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const candidate = generateCandidate();
    const existing = await User.findOne({
      username: { $regex: `^${candidate.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
    }).lean();
    if (!existing) {
      return candidate;
    }
  }
  const fallback = generateCandidate() + randomInt(100, 999);
  return fallback;
}
