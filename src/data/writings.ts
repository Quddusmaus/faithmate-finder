// Curated Bahá'í writings for Uniting Hearts.
// Source: Family Life compilation, bahai.org (March 2008).
// Curation principle: inspiring, not shaming — pull people toward beauty, not away from failure.

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
  description?: string;
  url: string;
}

export const stages: WritingStage[] = [
  {
    id: "know-yourself",
    title: "Know Yourself",
    subtitle: "Character, virtue & spiritual readiness",
    passages: [
      {
        id: "ky-1",
        quote:
          "Women and men have been and will always be equal in the sight of God. The Dawning-Place of the Light of God sheddeth its radiance upon all with the same effulgence. Verily God created women for men, and men for women.",
        author: "Bahá'u'lláh",
        source: "From a Tablet translated from the Arabic and Persian",
        link: "https://www.bahai.org/library/authoritative-texts/compilations/family-life/family-life.xhtml",
      },
      {
        id: "ky-2",
        quote:
          "Ye should consider the question of goodly character as of the first importance. It is incumbent upon every father and mother to counsel their children over a long period, and guide them unto those things which lead to everlasting honour.",
        author: "'Abdu'l-Bahá",
        source: "Selections from the Writings of 'Abdu'l-Bahá",
        link: "https://reference.bahai.org/en/t/ab/SAB/sab-87.html",
      },
      {
        id: "ky-3",
        quote:
          "The friends of God must be adorned with the ornament of justice, equity, kindness and love. As they do not allow themselves to be the object of cruelty and transgression, in like manner they should not allow such tyranny to visit the handmaidens of God.",
        author: "Bahá'u'lláh",
        source: "Family Life compilation",
        link: "https://www.bahai.org/library/authoritative-texts/compilations/family-life/family-life.xhtml",
      },
      {
        id: "ky-4",
        quote:
          "They must be ever mindful of their obligation to exemplify a new way of life distinguished by its respect for the dignity and rights of all people, by its exalted moral tone, and by its freedom from oppression and from all forms of abuse.",
        author: "Universal House of Justice",
        source: "Letter dated 24 January 1993",
        link: "https://www.bahai.org/library/authoritative-texts/compilations/family-life/family-life.xhtml",
      },
      {
        id: "ky-5",
        quote:
          "The world in the past has been ruled by force, and man has dominated over woman by reason of his more forceful and aggressive qualities both of body and mind. But the balance is already shifting; force is losing its dominance, and mental alertness, intuition, and the spiritual qualities of love and service, in which woman is strong, are gaining ascendancy.",
        author: "'Abdu'l-Bahá",
        source: "Family Life compilation",
        link: "https://www.bahai.org/library/authoritative-texts/compilations/family-life/family-life.xhtml",
      },
    ],
  },
  {
    id: "seek-well",
    title: "Seek Well",
    subtitle: "Courtship, choosing a partner & family",
    passages: [
      {
        id: "sw-1",
        quote:
          "Bahá'í marriage is the commitment of the two parties one to the other, and their mutual attachment of mind and heart. Each must, however, exercise the utmost care to become thoroughly acquainted with the character of the other, that the binding covenant between them may be a tie that will endure forever. Their purpose must be this: to become loving companions and comrades and at one with each other for time and eternity.",
        author: "'Abdu'l-Bahá",
        source: "Selections from the Writings of 'Abdu'l-Bahá, pp. 117–118",
        link: "https://reference.bahai.org/en/t/ab/SAB/sab-87.html",
      },
      {
        id: "sw-2",
        quote:
          "As you know, the initial choice of marriage partner is made by the two individuals directly involved, and the consent of all living parents is then sought. In this matter, as in all aspects of human relations, consultation is of great value in resolving misunderstandings and in clarifying what is the best course of behaviour.",
        author: "Universal House of Justice",
        source: "Letter dated 25 July 1988",
        link: "https://www.bahai.org/library/authoritative-texts/compilations/family-life/family-life.xhtml",
      },
      {
        id: "sw-3",
        quote:
          "Within the framework of mutual respect, parents are called upon to show wisdom and discretion when their offspring are developing friendships which might ultimately lead to marriage. For their part, the offspring should recognize that their parents are deeply interested in their welfare, and that the views of the parents warrant respect and careful consideration.",
        author: "Universal House of Justice",
        source: "Letter dated 25 July 1988",
        link: "https://www.bahai.org/library/authoritative-texts/compilations/family-life/family-life.xhtml",
      },
      {
        id: "sw-4",
        quote:
          "The principle of the oneness of mankind prevents any true Bahá'í from regarding race itself as a bar to union. For both Bahá'u'lláh and 'Abdu'l-Bahá never disapproved of the idea of interracial marriage, nor discouraged it.",
        author: "Letters Written on Behalf of Shoghi Effendi",
        source: "Letter dated 27 January 1935",
        link: "https://www.bahai.org/library/authoritative-texts/compilations/family-life/family-life.xhtml",
      },
      {
        id: "sw-5",
        quote:
          "Bahá'u'lláh has clearly stated the consent of all living parents is required for a Bahá'í marriage. This great law He has laid down to strengthen the social fabric, to knit closer the ties of the home, to place a certain gratitude and respect in the hearts of children for those who have given them life and sent their souls out on the eternal journey towards their Creator.",
        author: "Letters Written on Behalf of Shoghi Effendi",
        source: "Letter dated 25 October 1947",
        link: "https://www.bahai.org/library/authoritative-texts/compilations/family-life/family-life.xhtml",
      },
      {
        id: "sw-6",
        quote:
          "In marriage the more distant the blood-relationship the better, for such distance in family ties between husband and wife provideth the basis for the well-being of humanity and is conducive to fellowship among mankind.",
        author: "'Abdu'l-Bahá",
        source: "From a Tablet translated from the Arabic and Persian",
        link: "https://www.bahai.org/library/authoritative-texts/compilations/family-life/family-life.xhtml",
      },
    ],
  },
  {
    id: "unite",
    title: "Unite",
    subtitle: "Marriage, love & the union of souls",
    passages: [
      {
        id: "un-1",
        quote:
          "And when He desired to manifest grace and beneficence to men, and set the world in order, He revealed observances and created laws; among them He established the law of marriage, made it as a fortress for well-being and salvation, and enjoined it upon us in that which was sent down out of the heaven of sanctity in His Most Holy Book.",
        author: "Bahá'u'lláh",
        source: "Bahá'í Prayers, p. 118",
        link: "https://www.bahai.org/library/authoritative-texts/compilations/family-life/family-life.xhtml",
      },
      {
        id: "un-2",
        quote:
          "Among the people of Bahá, marriage must be a union of the body and of the spirit as well, for here both husband and wife are aglow with the same wine, both are enamoured of the same matchless Face, both live and move through the same spirit, both are illumined by the same glory. This connection between them is a spiritual one, hence it is a bond that will abide forever.",
        author: "'Abdu'l-Bahá",
        source: "Selections from the Writings of 'Abdu'l-Bahá",
        link: "https://reference.bahai.org/en/t/ab/SAB/sab-85.html",
      },
      {
        id: "un-3",
        quote:
          "O ye two believers in God! The Lord, peerless is He, hath made woman and man to abide with each other in the closest companionship, and to be even as a single soul. They are two helpmates, two intimate friends, who should be concerned about the welfare of each other.",
        author: "'Abdu'l-Bahá",
        source: "Selections from the Writings of 'Abdu'l-Bahá",
        link: "https://reference.bahai.org/en/t/ab/SAB/sab-87.html",
      },
      {
        id: "un-4",
        quote:
          "The life of a married couple should resemble the life of the angels in heaven — a life full of joy and spiritual delight, a life of unity and concord, a friendship both mental and physical. Even as two birds they should warble melodies upon the branches of the tree of fellowship and harmony.",
        author: "'Abdu'l-Bahá",
        source: "From the Utterances of 'Abdu'l-Bahá",
        link: "https://www.bahai.org/library/authoritative-texts/compilations/family-life/family-life.xhtml",
      },
      {
        id: "un-5",
        quote:
          "I hope that thou and thy dear husband may continue to serve in all spirit and fragrance and that in this world ye may remain two radiant candles and from the eternal horizon ye may glisten like unto two shining stars.",
        author: "'Abdu'l-Bahá",
        source: "From a Tablet translated from the Persian",
        link: "https://www.bahai.org/library/authoritative-texts/compilations/family-life/family-life.xhtml",
      },
      {
        id: "un-6",
        quote:
          "While it is true that the personal rights of each party to a marriage must be upheld by the other, the relationship of one to the other is not based solely on a legalistic premise. Love is its very foundation.",
        author: "Universal House of Justice",
        source: "Letter dated 2 January 1996",
        link: "https://www.bahai.org/library/authoritative-texts/compilations/family-life/family-life.xhtml",
      },
      {
        id: "un-7",
        quote:
          "A marriage between two souls, alive to the Message of God in this day, dedicated to the service of His Cause, working for the good of humanity, can be a potent force in the lives of others and an example and inspiration to other Bahá'ís, as well as to non-believers.",
        author: "Letters Written on Behalf of Shoghi Effendi",
        source: "Letter dated 4 August 1943",
        link: "https://www.bahai.org/library/authoritative-texts/compilations/family-life/family-life.xhtml",
      },
      {
        id: "un-8",
        quote:
          "Marriage can be a source of well-being, conveying a sense of security and spiritual happiness. However, it is not something that just happens. For marriage to become a haven of contentment it requires the cooperation of the marriage partners themselves.",
        author: "Universal House of Justice",
        source: "Letter dated 24 June 1979",
        link: "https://www.bahai.org/library/authoritative-texts/compilations/family-life/family-life.xhtml",
      },
    ],
  },
  {
    id: "build-together",
    title: "Build Together",
    subtitle: "Consultation, equality & growing as one",
    passages: [
      {
        id: "bt-1",
        quote:
          "Loving consultation should be the keynote of the marriage relationship. The success of such consultation will be influenced by the prayerful attitude with which it is approached, the mutual respect of the parties for each other, their earnest desire to preserve unity and harmony, and their willingness to make compromises and adjustments.",
        author: "Universal House of Justice",
        source: "Letter dated 26 June 1996",
        link: "https://www.bahai.org/library/authoritative-texts/compilations/family-life/family-life.xhtml",
      },
      {
        id: "bt-2",
        quote:
          "Family consultation employing full and frank discussion, and animated by awareness of the need for moderation and balance, can be the panacea for domestic conflict. Wives should not attempt to dominate their husbands, nor husbands their wives.",
        author: "Universal House of Justice",
        source: "Letter dated 1 August 1978",
        link: "https://www.bahai.org/library/authoritative-texts/compilations/family-life/family-life.xhtml",
      },
      {
        id: "bt-3",
        quote:
          "Ye must consult with each other, confer with the utmost love, agree upon a sound decision, and be fully united, for husband and wife must be even as one person, that they may succeed in every matter.",
        author: "'Abdu'l-Bahá",
        source: "From a Tablet translated from the Persian",
        link: "https://www.bahai.org/library/authoritative-texts/compilations/family-life/family-life.xhtml",
      },
      {
        id: "bt-4",
        quote:
          "Consultation has been ordained by Bahá'u'lláh as the means by which agreement is to be reached and a collective course of action defined. It requires all participants to express their opinions with absolute freedom and without apprehension that they will be censured or their views belittled.",
        author: "Universal House of Justice",
        source: "Letter dated 24 January 1993",
        link: "https://www.bahai.org/library/authoritative-texts/compilations/family-life/family-life.xhtml",
      },
      {
        id: "bt-5",
        quote:
          "There is absolutely equality between the two, and no distinction or preference is permitted. Until the reality of equality between man and woman is fully established and attained, the highest social development of mankind is not possible.",
        author: "'Abdu'l-Bahá",
        source: "Family Life compilation",
        link: "https://www.bahai.org/library/authoritative-texts/compilations/family-life/family-life.xhtml",
      },
      {
        id: "bt-6",
        quote:
          "Bahá'í men have the opportunity to demonstrate to the world around them a new approach to the relationship between the sexes, where aggression and the use of force are eliminated and replaced by cooperation and consultation. In a marriage relationship, neither husband nor wife should ever unjustly dominate the other.",
        author: "Universal House of Justice",
        source: "Letter dated 24 January 1993",
        link: "https://www.bahai.org/library/authoritative-texts/compilations/family-life/family-life.xhtml",
      },
      {
        id: "bt-7",
        quote:
          "In the Dispensation of Bahá'u'lláh, women are advancing side by side with men. There is no area or instance where they will lag behind: they have equal rights with men, and will enter, in the future, into all branches of the administration of society.",
        author: "'Abdu'l-Bahá",
        source: "Family Life compilation",
        link: "https://www.bahai.org/library/authoritative-texts/compilations/family-life/family-life.xhtml",
      },
      {
        id: "bt-8",
        quote:
          "Bahá'u'lláh came to bring unity to the world, and a fundamental unity is that of the family. Service to the Cause should not produce neglect of the family. It is important to arrange your time so that your family life is harmonious and your household receives the attention it requires.",
        author: "Universal House of Justice",
        source: "Letter dated 1 August 1978",
        link: "https://www.bahai.org/library/authoritative-texts/compilations/family-life/family-life.xhtml",
      },
      {
        id: "bt-9",
        quote:
          "Deep as are family ties, we must always remember that the spiritual ties are far deeper; they are everlasting and survive death, whereas physical ties, unless supported by spiritual bonds, are confined to this life.",
        author: "Letters Written on Behalf of Shoghi Effendi",
        source: "Letter dated 8 May 1942",
        link: "https://www.bahai.org/library/authoritative-texts/compilations/family-life/family-life.xhtml",
      },
    ],
  },
];

export const furtherReading: FurtherReading[] = [
  {
    title: "Spiritual Dating: Creating Connections That Go The Distance",
    description:
      "A couple shares how they built their relationship long-distance through character, consultation, and faith.",
    url: "https://bahaiteachings.org/how-to-make-long-distance-relationship-work-through-spiritual-dating/",
  },
  {
    title: "Turning a Spiritual Lens on How We Look for Love",
    description: "A modern Bahá'í perspective on approaching dating with spiritual intention.",
    url: "https://bahaiteachings.org/dating-during-pandemic/",
  },
  {
    title: "6 Things You Should Look for in a Lasting Spiritual Relationship",
    description: "Practical guidance on the qualities that make a relationship endure.",
    url: "https://bahaiteachings.org/what-you-should-look-for-lasting-spiritual-relationship/",
  },
  {
    title: "How to Get Thoroughly Acquainted: A Bahá'í Perspective on Dating",
    description: "What it really means to know someone's character before committing.",
    url: "https://www.bahaiblog.net/articles/bahai-life/get-thoroughly-acquainted-bahai-perspective-dating/",
  },
];
