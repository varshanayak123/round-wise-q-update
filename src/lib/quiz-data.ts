export type Question = {
  q: string;
  options: string[];
  answer: number;
};

export const ROUND_TITLES: Record<number, string> = {
  1: "Round 1 — Warm Up",
  2: "Round 2 — Core Concepts",
  3: "Round 3 — Grand Finale",
};

export const ROUND_TAGLINES: Record<number, string> = {
  1: "All groups play. Basics of programming and logic.",
  2: "All groups play. Tougher data structures and code output.",
  3: "Only the top 2 groups from Rounds 1 & 2 qualify.",
};

export const QUESTION_TIME = 30;
export const POINTS_CORRECT = 5;
export const POINTS_WRONG = -3;

export const QUESTIONS: Record<number, Question[]> = {
  1: [
    {
      q: "Which of these is NOT a programming language?",
      options: ["Python", "HTML", "Java", "C++"],
      answer: 1,
    },
    {
      q: "What does 'CPU' stand for?",
      options: [
        "Central Process Unit",
        "Computer Personal Unit",
        "Central Processing Unit",
        "Control Panel Unit",
      ],
      answer: 2,
    },
    {
      q: "Which symbol starts a single-line comment in JavaScript?",
      options: ["#", "//", "<!--", "%%"],
      answer: 1,
    },
    {
      q: "What is the output of 7 % 3?",
      options: ["2", "1", "3", "0"],
      answer: 1,
    },
    {
      q: "Which data type stores true or false?",
      options: ["Integer", "String", "Boolean", "Float"],
      answer: 2,
    },
    {
      q: "HTML is used mainly for...",
      options: ["Styling", "Structure", "Databases", "Networking"],
      answer: 1,
    },
  ],
  2: [
    {
      q: "Which data structure works on FIFO?",
      options: ["Stack", "Queue", "Tree", "Graph"],
      answer: 1,
    },
    {
      q: "Time complexity of binary search on a sorted array?",
      options: ["O(n)", "O(n log n)", "O(log n)", "O(1)"],
      answer: 2,
    },
    {
      q: "In Python, what does len('quiz') return?",
      options: ["3", "4", "5", "Error"],
      answer: 1,
    },
    {
      q: "Which keyword creates a block-scoped variable in JS?",
      options: ["var", "let", "def", "static"],
      answer: 1,
    },
    {
      q: "SQL command used to fetch data?",
      options: ["GET", "FETCH", "SELECT", "OPEN"],
      answer: 2,
    },
    {
      q: "A stack follows which principle?",
      options: ["LIFO", "FIFO", "Round Robin", "Random"],
      answer: 0,
    },
  ],
  3: [
    {
      q: "Worst case time complexity of QuickSort?",
      options: ["O(n log n)", "O(n^2)", "O(log n)", "O(n)"],
      answer: 1,
    },
    {
      q: "Which algorithm finds shortest paths with non-negative weights?",
      options: ["Kruskal", "Dijkstra", "Bellman-Ford", "Prim"],
      answer: 1,
    },
    {
      q: "What does 'deadlock' require to occur?",
      options: [
        "Circular wait",
        "Fast CPU",
        "Large memory",
        "Single thread",
      ],
      answer: 0,
    },
    {
      q: "Output of typeof null in JavaScript?",
      options: ["'null'", "'object'", "'undefined'", "'boolean'"],
      answer: 1,
    },
    {
      q: "Which traversal of a BST gives sorted order?",
      options: ["Pre-order", "In-order", "Post-order", "Level-order"],
      answer: 1,
    },
    {
      q: "HTTP status code for 'Too Many Requests'?",
      options: ["409", "418", "429", "503"],
      answer: 2,
    },
  ],
};
