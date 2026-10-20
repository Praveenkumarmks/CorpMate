(function () {
"use strict";
// Built-in examples for the Crop Doctor, available even without a photo or AI.
const DISEASE_SAMPLES = {
  blight: {
    name: "Early Blight",
    confidence: 91,
    symptoms: ["Brown spots with ring pattern on lower leaves", "Yellow halo around the spots", "Leaves dry and drop from the bottom up"],
    recommendations: ["Remove and bin affected leaves", "Spray a copper-based or mancozeb fungicide as per the label", "Water at the base and avoid wetting leaves", "Rotate crops next season"],
  },
  yellow: {
    name: "Yellow Deficiency",
    confidence: 84,
    symptoms: ["Older leaves turn yellow from the tips", "Slow growth and pale green canopy", "Veins stay green on some leaves"],
    recommendations: ["Apply nitrogen (for example Urea) in split doses", "Check soil pH and drainage", "Add compost to hold nutrients", "Check the plants again after 7 days"],
  },
  caterpillar: {
    name: "Caterpillar Attack",
    confidence: 88,
    symptoms: ["Ragged holes in leaves and fruit", "Dark droppings on the leaves", "Caterpillars under leaves in the morning"],
    recommendations: ["Hand-pick larvae in small plots", "Set pheromone traps", "Spray neem oil or a label-approved bio-pesticide", "Scout the field every 2 days"],
  },
};
CM.diseaseSamples = { DISEASE_SAMPLES };
})();
