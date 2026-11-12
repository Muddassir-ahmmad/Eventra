export const EVENT_FONT_OPTIONS = [
  {
    id: "modern",
    label: "Modern Sans",
    category: "Clean & Balanced",
    sampleText: "Tech conferences, hackathons, workshops",
    headingFont: "'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, sans-serif",
    bodyFont: "'Inter', 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
  },
  {
    id: "editorial",
    label: "Editorial Serif",
    category: "Refined & Artistic",
    sampleText: "Cultural fests, keynotes, design summits",
    headingFont: "'Playfair Display', Georgia, 'Times New Roman', serif",
    bodyFont: "'Source Sans 3', 'Inter', system-ui, -apple-system, sans-serif",
  },
  {
    id: "futuristic",
    label: "Cyber Tech",
    category: "Tech & Startup",
    sampleText: "AI summits, coding sprints, product launches",
    headingFont: "'Space Grotesk', 'Inter', system-ui, sans-serif",
    bodyFont: "'DM Sans', 'Inter', system-ui, sans-serif",
  },
  {
    id: "classic",
    label: "Classic Heritage",
    category: "Academic & Formal",
    sampleText: "Symposiums, convocations, honor lectures",
    headingFont: "'Cormorant Garamond', Georgia, 'Times New Roman', serif",
    bodyFont: "'Lora', Georgia, 'Times New Roman', serif",
  },
  {
    id: "bold",
    label: "Display Impact",
    category: "High-Energy Fest",
    sampleText: "College fests, sports meets, music nights",
    headingFont: "'Outfit', 'Plus Jakarta Sans', system-ui, sans-serif",
    bodyFont: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif",
  },
  {
    id: "mono",
    label: "Developer Mono",
    category: "Code & Open Source",
    sampleText: "CTFs, dev meetups, systems workshops",
    headingFont: "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace",
    bodyFont: "'Inter', system-ui, -apple-system, sans-serif",
  },
];

export function getEventFontConfig(fontId) {
  return EVENT_FONT_OPTIONS.find((item) => item.id === fontId) || EVENT_FONT_OPTIONS[0];
}
