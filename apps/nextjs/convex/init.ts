import { internalMutation } from "./_generated/server";

export default internalMutation(async (ctx) => {
  const baseLocations = [
    {
      title: "Florida State Capitol Tour",
      description: "Guided tour of the historic Capitol building.",
      lat: 30.4384,
      lng: -84.2809,
      color: "#2563eb",
    },
    {
      title: "Cascades Park Concert",
      description: "Live music and food trucks at the amphitheater.",
      lat: 30.4332,
      lng: -84.2741,
      color: "#16a34a",
    },
    {
      title: "Railroad Square Art Walk",
      description: "Evening art walk with local galleries and vendors.",
      lat: 30.4274,
      lng: -84.2915,
      color: "#f59e0b",
    },
    {
      title: "Game Day at Doak Campbell Stadium",
      description: "FSU home game tailgate and festivities.",
      lat: 30.4389,
      lng: -84.3043,
      color: "#ef4444",
    },
  ];

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  // Two events per location within the next week
  const events = baseLocations.flatMap((loc, i) => {
    const e1Start = now + (i + 1) * day; // 1..4 days ahead
    const e1End = e1Start + 2 * 60 * 60 * 1000; // +2h
    const e2Start = now + (i + 3) * day + 6 * 60 * 60 * 1000; // 3..6 days ahead +6h
    const e2End = e2Start + 90 * 60 * 1000; // +1.5h
    return [
      {
        title: `${loc.title} – Morning`,
        description: loc.description,
        lat: loc.lat,
        lng: loc.lng,
        color: loc.color,
        startAt: e1Start,
        endAt: e1End,
      },
      {
        title: `${loc.title} – Evening`,
        description: loc.description,
        lat: loc.lat,
        lng: loc.lng,
        color: loc.color,
        startAt: e2Start,
        endAt: e2End,
      },
    ];
  });

  for (const e of events) {
    const existing = await ctx.db
      .query("events")
      .filter((q) =>
        q.and(
          q.eq(q.field("title"), e.title),
          q.eq(q.field("lat"), e.lat),
          q.eq(q.field("lng"), e.lng),
        ),
      )
      .first();

    if (!existing) {
      await ctx.db.insert("events", e);
    }
  }
});
