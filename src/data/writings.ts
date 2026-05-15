export type WritingStageId = "know-yourself" | "seek-well" | "unite" | "build-together";

export interface Passage {
  id: string;
  quote: string;
  author: string;
  source: string;
  link: string;
}

export interface WritingStage {
  id: WritingStageId;
  title: string;
  subtitle: string;
  passages: Passage[];
}

export interface FurtherReading {
  title: string;
  url: string;
}

export const stages: WritingStage[] = [
  {
    id: "know-yourself",
    title: "Know Yourself",
    subtitle: "Character & virtue",
    passages: [
      {
        id: "ky-placeholder-1",
        quote: "Passage coming soon.",
        author: "—",
        source: "—",
        link: "https://www.bahai.org/library/",
      },
    ],
  },
  {
    id: "seek-well",
    title: "Seek Well",
    subtitle: "Courtship & choosing a partner",
    passages: [
      {
        id: "sw-placeholder-1",
        quote: "Passage coming soon.",
        author: "—",
        source: "—",
        link: "https://www.bahai.org/library/",
      },
    ],
  },
  {
    id: "unite",
    title: "Unite",
    subtitle: "Marriage & love",
    passages: [
      {
        id: "un-placeholder-1",
        quote: "Passage coming soon.",
        author: "—",
        source: "—",
        link: "https://www.bahai.org/library/",
      },
    ],
  },
  {
    id: "build-together",
    title: "Build Together",
    subtitle: "Family & growing spiritually",
    passages: [
      {
        id: "bt-placeholder-1",
        quote: "Passage coming soon.",
        author: "—",
        source: "—",
        link: "https://www.bahai.org/library/",
      },
    ],
  },
];

export const furtherReading: FurtherReading[] = [
  {
    title: "Further reading link (placeholder)",
    url: "https://bahaiteachings.org/",
  },
];
