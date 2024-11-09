interface BibleVerse {
  verse: number;
  text: string;
}

interface BibleChapter {
  [key: string]: BibleVerse[];
}

interface BibleBook {
  [key: string]: BibleChapter;
}

export const bibleDatabaseKJV: BibleBook = {
  "Genesis": {
    "1": [
      { verse: 1, text: "In the beginning God created the heaven and the earth." },
      { verse: 2, text: "And the earth was without form, and void; and darkness was upon the face of the deep..." },
      // ... more verses
    ],
    // ... more chapters
  },
  // ... more books
};

export const getChapter = (book: string, chapter: number) => {
  try {
    const chapterStr = chapter.toString();
    if (bibleDatabaseKJV[book] && bibleDatabaseKJV[book][chapterStr]) {
      return {
        verses: bibleDatabaseKJV[book][chapterStr],
        reference: `${book} ${chapter}`
      };
    }
    return null;
  } catch (error) {
    console.error(`Error getting chapter: ${book} ${chapter}`);
    return null;
  }
};

export const getMaxChapter = (book: string): number => {
  try {
    return Object.keys(bibleDatabaseKJV[book]).length;
  } catch (error) {
    return 0;
  }
};

export const searchBible = (query: string) => {
  const results = [];
  const queryLower = query.toLowerCase();

  for (const [book, chapters] of Object.entries(bibleDatabaseKJV)) {
    for (const [chapter, verses] of Object.entries(chapters)) {
      for (const verse of verses) {
        if (verse.text.toLowerCase().includes(queryLower)) {
          results.push({
            book,
            chapter: parseInt(chapter),
            verse: verse.verse,
            text: verse.text
          });
        }
      }
    }
  }
  return results;
}; 