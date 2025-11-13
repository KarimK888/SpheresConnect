import type {
  Artwork,
  Chat,
  ChatMessage,
  Checkin,
  Event,
  Hub,
  MatchAction,
  Order,
  RewardLog,
  User,
  UserProfile,
  UserProfileMedia,
  UserProfileProject
} from "./types";

const placeholderImage = (label: string, size = "600x420") =>
  `https://placehold.co/${size}?text=${encodeURIComponent(label)}`;

const makeMedia = (
  mediaId: string,
  title: string,
  overrides: Partial<UserProfileMedia> = {}
): UserProfileMedia => ({
  mediaId,
  type: "image",
  title,
  url: placeholderImage(title),
  description: `Preview for ${title}`,
  tags: ["portfolio"],
  ...overrides
});

const makeProject = (
  projectId: string,
  title: string,
  overrides: Partial<UserProfileProject> = {}
): UserProfileProject => ({
  projectId,
  title,
  summary: `${title} concept deck`,
  tags: ["concept"],
  mediaIds: [],
  status: "live",
  ...overrides
});

const baseProfile = (name: string, overrides: Partial<UserProfile> = {}): UserProfile => ({
  headline: undefined,
  locationName: undefined,
  availability: "open",
  timezone: "UTC",
  coverImageUrl: placeholderImage(`${name} cover`, "1200x420"),
  avatarType: "photo",
  socials: {},
  media: [],
  projects: [],
  preferredCollabModes: ["remote", "hybrid"],
  ...overrides
});

const now = Date.now();

export const sampleUsers: User[] = [
  {
    userId: "usr_alina",
    email: "alina@spheraconnect.art",
    displayName: "Alina Vargas",
    bio: "Mixed-media painter fusing analog textures with digital collages.",
    skills: ["painting", "mixed-media", "digital"],
    profilePictureUrl: "/images/users/alina.jpg",
    connections: ["usr_bastien", "usr_cyrus"],
    isVerified: true,
    language: "en",
    location: { lat: 45.5017, lng: -73.5673 },
    joinedAt: now - 1000 * 60 * 60 * 24 * 120,
    profile: baseProfile("Alina", {
      headline: "Analog collage surfaces & projection mapping",
      locationName: "Montreal, Canada",
      socials: {
        website: "https://alinavargas.com",
        instagram: "https://instagram.com/alinavargas",
        behance: "https://www.behance.net/alinavargas"
      },
      media: [
        makeMedia("alina_collage", "Collage Bloom", { tags: ["collage", "projection"] }),
        makeMedia("alina_studio", "Studio color script", { tags: ["research"] })
      ],
      projects: [
        makeProject("alina_city_bloom", "City Bloom Residency", {
          summary: "Immersive projection mapping with analog paper textures.",
          mediaIds: ["alina_collage", "alina_studio"],
          tags: ["installation", "light"],
          link: "https://alinavargas.com/projects/city-bloom"
        })
      ],
      resumeUrl: "https://cdn.spheraconnect.dev/docs/alina-cv.pdf"
    })
  },
  {
    userId: "usr_bastien",
    email: "bastien@spheraconnect.art",
    displayName: "Bastien Leroy",
    bio: "Paris-based curator connecting emerging visual storytellers.",
    skills: ["curation", "photography"],
    profilePictureUrl: "/images/users/bastien.jpg",
    connections: ["usr_alina"],
    isVerified: true,
    language: "fr",
    location: { lat: 48.8566, lng: 2.3522 },
    joinedAt: now - 1000 * 60 * 60 * 24 * 210,
    profile: baseProfile("Bastien", {
      headline: "Curator for immersive photo narratives",
      locationName: "Paris, France",
      availability: "limited",
      socials: {
        website: "https://bastienleroy.fr",
        linkedin: "https://linkedin.com/in/bastienleroy",
        instagram: "https://instagram.com/curateur_bastien"
      },
      media: [
        makeMedia("bastien_edit", "Edit suite", { tags: ["curation"] }),
        makeMedia("bastien_show", "Exhibit layout", { tags: ["exhibit"] })
      ],
      projects: [
        makeProject("bastien_residency", "Residency Selection 2024", {
          summary: "Curated 12 residencies focused on climate storytelling.",
          mediaIds: ["bastien_show"],
          tags: ["curation", "photography"],
          link: "https://bastienleroy.fr/projects/residency"
        })
      ]
    })
  },
  {
    userId: "usr_cyrus",
    email: "cyrus@spheraconnect.art",
    displayName: "Cyrus Okafor",
    bio: "3D sound designer exploring immersive spatial audio.",
    skills: ["sound-design", "3d-audio", "mixing"],
    profilePictureUrl: "/images/users/cyrus.jpg",
    connections: ["usr_alina"],
    isVerified: true,
    language: "en",
    location: { lat: 43.6532, lng: -79.3832 },
    joinedAt: now - 1000 * 60 * 60 * 24 * 90,
    profile: baseProfile("Cyrus", {
      headline: "Spatial audio + XR soundscapes",
      locationName: "Toronto, Canada",
      socials: {
        website: "https://cyrusokafor.audio",
        twitter: "https://twitter.com/cyrusokafor",
        youtube: "https://youtube.com/@cyrusokafor"
      },
      media: [
        makeMedia("cyrus_wave", "Wave studies", { tags: ["sound"] })
      ],
      projects: [
        makeProject("cyrus_skyline", "Skyline Resonance", {
          summary: "360º ambisonic installation for waterfront park.",
          tags: ["audio", "installation"],
          mediaIds: ["cyrus_wave"]
        })
      ],
      featuredVideoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    })
  },
  {
    userId: "usr_daniela",
    email: "daniela@spheraconnect.art",
    displayName: "Daniela Ruiz",
    bio: "Illustrator focused on editorial narratives and vibrant characters.",
    skills: ["illustration", "character-design", "storyboarding"],
    profilePictureUrl: "/images/users/daniela.jpg",
    connections: [],
    isVerified: false,
    language: "es",
    location: { lat: 19.4326, lng: -99.1332 },
    joinedAt: now - 1000 * 60 * 60 * 24 * 45,
    profile: baseProfile("Daniela", {
      headline: "Editorial illustrator + AR stickers",
      locationName: "Mexico City, MX",
      socials: {
        instagram: "https://instagram.com/daniela.draws",
        dribbble: "https://dribbble.com/daniela"
      },
      media: [
        makeMedia("daniela_story", "Story frames", { tags: ["illustration", "storyboards"] })
      ],
      projects: [
        makeProject("daniela_zine", "Vibrant Zine", {
          summary: "Limited zine with AR-enabled characters.",
          mediaIds: ["daniela_story"],
          tags: ["zine", "ar"],
          link: "https://daniela.art/vibrant-zine"
        })
      ]
    })
  },
  {
    userId: "usr_elio",
    email: "elio@spheraconnect.art",
    displayName: "Elio Chen",
    bio: "Interactive installation artist blending light and motion.",
    skills: ["installation", "light-design", "arduino"],
    profilePictureUrl: "/images/users/elio.jpg",
    connections: ["usr_fatima"],
    isVerified: true,
    language: "en",
    location: { lat: 40.7128, lng: -74.006 },
    joinedAt: now - 1000 * 60 * 60 * 24 * 150,
    profile: baseProfile("Elio", {
      headline: "Interactive light designer",
      locationName: "New York, USA",
      availability: "limited",
      socials: {
        instagram: "https://instagram.com/eliolights",
        website: "https://eliochen.studio"
      }
    })
  },
  {
    userId: "usr_fatima",
    email: "fatima@spheraconnect.art",
    displayName: "Fátima Benali",
    bio: "Wearable tech designer crafting responsive garments.",
    skills: ["fashion", "wearables", "textiles"],
    profilePictureUrl: "/images/users/fatima.jpg",
    connections: ["usr_elio"],
    isVerified: false,
    language: "fr",
    location: { lat: 45.764, lng: 4.8357 },
    joinedAt: now - 1000 * 60 * 60 * 24 * 30,
    profile: baseProfile("Fatima", {
      headline: "Responsive garments & wearable tech",
      locationName: "Lyon, France",
      socials: {
        instagram: "https://instagram.com/fatimawearables",
        tiktok: "https://www.tiktok.com/@fatimawearables"
      }
    })
  },
  {
    userId: "usr_giovanni",
    email: "giovanni@spheraconnect.art",
    displayName: "Giovanni Russo",
    bio: "Cinematic composer scoring games and interactive media.",
    skills: ["composition", "orchestration", "synths"],
    profilePictureUrl: "/images/users/giovanni.jpg",
    connections: [],
    isVerified: true,
    language: "en",
    location: { lat: 41.9028, lng: 12.4964 },
    joinedAt: now - 1000 * 60 * 60 * 24 * 220,
    profile: baseProfile("Giovanni", {
      headline: "Cinematic composer & synth engineer",
      locationName: "Rome, Italy",
      socials: {
        website: "https://giovannirusso.studio",
        youtube: "https://youtube.com/@giovanni-scores"
      }
    })
  },
  {
    userId: "usr_hana",
    email: "hana@spheraconnect.art",
    displayName: "Hana Sato",
    bio: "XR art director bridging physical and virtual worlds.",
    skills: ["xr", "art-direction", "3d-modeling"],
    profilePictureUrl: "/images/users/hana.jpg",
    connections: ["usr_cyrus"],
    isVerified: true,
    language: "en",
    location: { lat: 35.6762, lng: 139.6503 },
    joinedAt: now - 1000 * 60 * 60 * 24 * 300,
    profile: baseProfile("Hana", {
      headline: "XR art direction & volumetric capture",
      locationName: "Tokyo, Japan",
      socials: {
        website: "https://hanasato.jp",
        instagram: "https://instagram.com/hanaxsato"
      }
    })
  },
  {
    userId: "usr_isa",
    email: "isa@spheraconnect.art",
    displayName: "Isabela Rocha",
    bio: "Documentary photographer capturing cultural resilience.",
    skills: ["photography", "storytelling", "editing"],
    profilePictureUrl: "/images/users/isabela.jpg",
    connections: ["usr_daniela"],
    isVerified: false,
    language: "es",
    location: { lat: -23.5505, lng: -46.6333 },
    joinedAt: now - 1000 * 60 * 60 * 24 * 75,
    profile: baseProfile("Isabela", {
      headline: "Documentary photographer",
      locationName: "São Paulo, Brazil",
      socials: {
        instagram: "https://instagram.com/isacrafts",
        website: "https://isabelarocha.photo"
      }
    })
  },
  {
    userId: "usr_jamal",
    email: "jamal@spheraconnect.art",
    displayName: "Jamal Greene",
    bio: "Fabrication specialist helping artists prototype at scale.",
    skills: ["fabrication", "cad", "metalwork"],
    profilePictureUrl: "/images/users/jamal.jpg",
    connections: [],
    isVerified: true,
    language: "en",
    location: { lat: 34.0522, lng: -118.2437 },
    joinedAt: now - 1000 * 60 * 60 * 24 * 60,
    profile: baseProfile("Jamal", {
      headline: "Large-scale fabrication & metalwork",
      locationName: "Los Angeles, USA",
      socials: {
        linkedin: "https://linkedin.com/in/jamal-greene"
      }
    })
  },
  {
    userId: "usr_kamilah",
    email: "kamilah@spheraconnect.art",
    displayName: "Kamilah Osei",
    bio: "Cultural strategist advising residencies and placemaking.",
    skills: ["strategy", "community", "research"],
    profilePictureUrl: "/images/users/kamilah.jpg",
    connections: [],
    isVerified: true,
    language: "en",
    location: { lat: 51.5072, lng: -0.1276 },
    joinedAt: now - 1000 * 60 * 60 * 24 * 55,
    profile: baseProfile("Kamilah", {
      headline: "Cultural strategist & residency advisor",
      locationName: "London, UK",
      socials: {
        linkedin: "https://linkedin.com/in/kamilah-osei"
      },
      availability: "limited"
    })
  },
  {
    userId: "usr_admin",
    email: "admin@spheraconnect.art",
    displayName: "Admin Sphera",
    bio: "Platform steward verifying artists and curating opportunities.",
    skills: ["ops", "support"],
    profilePictureUrl: "/images/users/admin.jpg",
    connections: [],
    isVerified: true,
    language: "en",
    location: { lat: 45.5017, lng: -73.5673 },
    joinedAt: now - 1000 * 60 * 60 * 24 * 400,
    profile: baseProfile("Admin", {
      headline: "Platform curator",
      locationName: "Global",
      availability: "limited"
    })
  }
];

export const sampleArtworks: Artwork[] = Array.from({ length: 20 }).map((_, index) => ({
  artworkId: `art_${index + 1}`,
  artistId: sampleUsers[index % sampleUsers.length].userId,
  title: `Artwork ${index + 1}`,
  description: "Placeholder description for showcase pieces.",
  mediaUrls: [`https://placehold.co/600x400?text=Artwork+${index + 1}`],
  price: 15000 + index * 250,
  currency: "usd",
  status: index % 7 === 0 ? "sold" : index % 5 === 0 ? "negotiation" : "listed",
  isSold: index % 7 === 0,
  tags: ["painting", "studio", index % 2 === 0 ? "featured" : "new"],
  createdAt: now - index * 1000 * 60 * 60 * 24
}));

export const sampleHubs: Hub[] = [
  {
    hubId: "hub_montreal",
    name: "Montreal Creative Loft",
    location: { lat: 45.5017, lng: -73.5673 },
    activeUsers: ["usr_alina", "usr_admin"]
  },
  {
    hubId: "hub_toronto",
    name: "Toronto Sound Lab",
    location: { lat: 43.6532, lng: -79.3832 },
    activeUsers: ["usr_cyrus"]
  },
  {
    hubId: "hub_nyc",
    name: "Brooklyn Light Studio",
    location: { lat: 40.7128, lng: -74.006 },
    activeUsers: ["usr_elio"]
  },
  {
    hubId: "hub_paris",
    name: "Paris Atelier 19",
    location: { lat: 48.8566, lng: 2.3522 },
    activeUsers: ["usr_bastien"]
  }
];

export const sampleCheckins: Checkin[] = sampleUsers.slice(0, 6).map((user, idx) => ({
  checkinId: `chk_${idx}`,
  userId: user.userId,
  hubId: sampleHubs[idx % sampleHubs.length]?.hubId,
  location: user.location ?? { lat: 0, lng: 0 },
  status: "online",
  expiresAt: now + 1000 * 60 * 60 * 4,
  createdAt: now - idx * 1000 * 60 * 10
}));

export const sampleChats: Chat[] = [
  {
    chatId: "chat_alina_bastien",
    memberIds: ["usr_alina", "usr_bastien"],
    isGroup: false,
    createdAt: now - 1000 * 60 * 60 * 24 * 5,
    title: undefined,
    archivedBy: [],
    hiddenBy: []
  },
  {
    chatId: "chat_installation",
    memberIds: ["usr_elio", "usr_fatima", "usr_jamal"],
    isGroup: true,
    title: "Installation Collab",
    createdAt: now - 1000 * 60 * 60 * 24 * 2,
    archivedBy: [],
    hiddenBy: []
  }
];

export const sampleMessages: ChatMessage[] = [
  {
    messageId: "msg_1",
    chatId: "chat_alina_bastien",
    senderId: "usr_alina",
    content: "Hey Bastien, sharing the new mixed-media drafts!",
    attachments: [],
    createdAt: now - 1000 * 60 * 20,
    deliveredTo: ["usr_alina", "usr_bastien"],
    readBy: ["usr_alina", "usr_bastien"],
    reactions: [],
    metadata: {}
  },
  {
    messageId: "msg_2",
    chatId: "chat_alina_bastien",
    senderId: "usr_bastien",
    content: "Love the textures�let's prep for the Paris show.",
    attachments: [],
    createdAt: now - 1000 * 60 * 18,
    deliveredTo: ["usr_alina", "usr_bastien"],
    readBy: ["usr_alina"],
    reactions: [],
    metadata: {}
  },
  {
    messageId: "msg_3",
    chatId: "chat_installation",
    senderId: "usr_elio",
    content: "Uploading the new light choreography now.",
    attachments: [],
    createdAt: now - 1000 * 60 * 8,
    deliveredTo: ["usr_elio", "usr_fatima", "usr_jamal"],
    readBy: ["usr_elio"],
    reactions: [],
    metadata: {
      project: "installation"
    }
  }
];

export const sampleOrders: Order[] = [
  {
    orderId: "ord_1",
    artworkId: "art_1",
    buyerId: "usr_bastien",
    sellerId: "usr_alina",
    amount: 18000,
    currency: "usd",
    status: "paid",
    stripePaymentIntentId: "pi_sample_123",
    createdAt: now - 1000 * 60 * 60 * 48
  }
];

export const sampleEvents: Event[] = [
  {
    eventId: "evt_future_1",
    title: "Immersive Audiovisual Lab",
    description: "Hands-on prototyping sprints with spatial audio and reactive visuals.",
    startsAt: now + 1000 * 60 * 60 * 72,
    endsAt: now + 1000 * 60 * 60 * 76,
    location: { lat: 43.6532, lng: -79.3832, address: "Toronto Sound Lab" },
    hostUserId: "usr_cyrus",
    attendees: ["usr_alina", "usr_cyrus"],
    createdAt: now - 1000 * 60 * 60 * 24 * 3
  },
  {
    eventId: "evt_future_2",
    title: "Curators Roundtable",
    description: "Invite-only review of upcoming residencies.",
    startsAt: now + 1000 * 60 * 60 * 120,
    location: { lat: 48.8566, lng: 2.3522, address: "Paris Atelier 19" },
    hostUserId: "usr_bastien",
    attendees: ["usr_admin"],
    createdAt: now - 1000 * 60 * 60 * 24 * 4
  },
  {
    eventId: "evt_past_1",
    title: "Mixed-Media Demo Day",
    description: "Showcase for experimental textures and projection mapping.",
    startsAt: now - 1000 * 60 * 60 * 72,
    location: { lat: 45.5017, lng: -73.5673, address: "Montreal Creative Loft" },
    hostUserId: "usr_alina",
    attendees: ["usr_admin", "usr_elio"],
    createdAt: now - 1000 * 60 * 60 * 24 * 10
  }
];

export const sampleRewardLogs: RewardLog[] = [
  {
    id: "rew_1",
    userId: "usr_alina",
    action: "onboarding",
    points: 100,
    createdAt: now - 1000 * 60 * 60 * 24 * 120
  },
  {
    id: "rew_2",
    userId: "usr_alina",
    action: "sale",
    points: 300,
    createdAt: now - 1000 * 60 * 60 * 24 * 20
  },
  {
    id: "rew_3",
    userId: "usr_cyrus",
    action: "checkin",
    points: 50,
    createdAt: now - 1000 * 60 * 60 * 12
  }
];

export const sampleMatchActions: MatchAction[] = [
  {
    id: "mat_usr_alina_usr_bastien",
    userId: "usr_alina",
    targetId: "usr_bastien",
    action: "connected",
    createdAt: now - 1000 * 60 * 15
  },
  {
    id: "mat_usr_cyrus_usr_elio",
    userId: "usr_cyrus",
    targetId: "usr_elio",
    action: "skipped",
    createdAt: now - 1000 * 60 * 60
  }
];

export const verifiedAdminId = "usr_admin";



