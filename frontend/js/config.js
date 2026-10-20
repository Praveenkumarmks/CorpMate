(function () {
"use strict";
const CROPS = ["Tomato", "Chilli", "Banana", "Coconut", "Onion"];

const STAGES = ["Planned", "Planted", "Growing", "Flowering", "Fruiting", "Harvesting", "Completed"];

// Every screen in the app. `short` is the label used in the phone bottom bar.
const PAGES = [
  { id: "home", icon: "🏠", label: "Home" },
  { id: "notes", icon: "📝", label: "AgriTrack", short: "Notes" },
  { id: "harvest", icon: "🌾", label: "Harvest" },
  { id: "farms", icon: "🚜", label: "My Farms" },
  { id: "crops", icon: "🌱", label: "Crops" },
  { id: "fertilizers", icon: "🧪", label: "Fertilizers" },
  { id: "pesticides", icon: "🐛", label: "Pesticides" },
  { id: "irrigations", icon: "💧", label: "Irrigation" },
  { id: "labour", icon: "👷", label: "Labour" },
  { id: "expenses", icon: "💰", label: "Expenses" },
  { id: "sales", icon: "🛒", label: "Sales" },
  { id: "pestrecords", icon: "🩺", label: "Pest records" },
  { id: "records", icon: "📋", label: "Records" },
  { id: "analytics", icon: "📊", label: "Analytics" },
  { id: "doctor", icon: "👁️", label: "Crop Doctor" },
  { id: "market", icon: "🏪", label: "Market prices" },
  { id: "assistant", icon: "🤖", label: "AI Assistant" },
  { id: "predictions", icon: "💡", label: "Predictions" },
  { id: "settings", icon: "⚙️", label: "Profile & backup", short: "Profile" },
];

// The five items shown in the bottom bar on phones.
const BOTTOM_NAV = ["home", "notes", "records", "analytics", "settings"];
CM.config = { CROPS, STAGES, PAGES, BOTTOM_NAV };
})();
