export const CUISINE_OPTIONS = [
  "Italian",
  "Mexican",
  "Asian",
  "Mediterranean",
  "American",
  "Indian",
  "French",
  "Japanese",
  "Thai",
  "Greek",
];

export const COMMON_ALLERGIES = [
  "Gluten",
  "Dairy",
  "Nuts",
  "Eggs",
  "Shellfish",
  "Soy",
  "Fish",
  "Sesame",
];

export const HOUSEHOLD_SIZE_OPTIONS = [
  { value: 1, label: "1 person" },
  { value: 2, label: "2 people" },
  { value: 3, label: "3 people" },
  { value: 4, label: "4 people" },
  { value: 5, label: "5 people" },
  { value: 6, label: "6+ people" },
];

export const STORAGE_AREA_OPTIONS = [
  { id: "fridge", label: "Fridge", icon: "thermometer" as const },
  { id: "freezer", label: "Freezer", icon: "wind" as const },
  { id: "pantry", label: "Pantry", icon: "archive" as const },
  { id: "counter", label: "Counter", icon: "coffee" as const },
];

export const DAILY_MEALS_OPTIONS = [
  { value: 2, label: "2 meals" },
  { value: 3, label: "3 meals" },
  { value: 4, label: "4 meals" },
  { value: 5, label: "5+ meals" },
];
