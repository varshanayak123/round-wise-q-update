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
      q: "Java ☕ — Which keyword is used to inherit a class in Java?",
      options: ["implements", "extends", "inherits", "super"],
      answer: 1,
    },
    {
      q: 'Python 🐍 — What is the output? x = 10; if x % 2 == 0: print("Even") else: print("Odd")',
      options: ["Even", "Odd", "10", "Error"],
      answer: 0,
    },
    {
      q: "C++ ⚡ — Which OOP concept allows the same function name to behave differently?",
      options: ["Inheritance", "Encapsulation", "Polymorphism", "Abstraction"],
      answer: 2,
    },
    {
      q: "JavaScript 🟨 — What is the output? let nums = [1, 2, 3, 4]; console.log(nums.length);",
      options: ["3", "4", "5", "Error"],
      answer: 1,
    },
    {
      q: "Java ☕ — Which data structure follows FIFO?",
      options: ["Stack", "Queue", "Tree", "Graph"],
      answer: 1,
    },
    {
      q: "Python 🐍 — What is the output? nums = [1, 2, 3, 4]; result = [x * 2 for x in nums if x % 2 == 0]; print(result)",
      options: ["[2, 4, 6, 8]", "[4, 8]", "[2, 6]", "[1, 3]"],
      answer: 1,
    },
    {
      q: "Java ☕ — What is the main purpose of the finally block?",
      options: [
        "To handle errors only",
        "To execute code regardless of whether an exception occurs",
        "To create an object",
        "To stop the program",
      ],
      answer: 1,
    },
    {
      q: "C++ ⚡ — What is the output? int x = 5; for(int i = 1; i <= 3; i++) { x += i; } cout << x;",
      options: ["8", "9", "11", "14"],
      answer: 2,
    },
    {
      q: "JavaScript 🟨 — Which method creates a new array by transforming each element?",
      options: ["filter()", "find()", "map()", "some()"],
      answer: 2,
    },
    {
      q: "Python 🐍 — What is the time complexity of accessing an element by index in a Python list, on average?",
      options: ["O(n)", "O(log n)", "O(1)", "O(n²)"],
      answer: 2,
    },
    {
      q: "What will be the output? x = [1, 2, 3]; y = x; y += [4]; print(x)",
      options: ["[1, 2, 3]", "[4]", "[1, 2, 3, 4]", "Error"],
      answer: 2,
    },
    {
      q: "Java ☕ — Which statement about method overloading in Java is correct?",
      options: [
        "Methods must have different names",
        "Methods must have the same name but different parameter lists",
        "Methods must have the same name and same parameters",
        "Overloading can only happen between different classes",
      ],
      answer: 1,
    },
    {
      q: "C++ ⚡ — What will be the output? int x = 10; for(int i = 1; i <= 3; i++) { if(i % 2 == 1) x += i; else x -= i; } cout << x;",
      options: ["10", "11", "12", "13"],
      answer: 2,
    },
    {
      q: "JavaScript 🟨 — What is the main purpose of a Promise in JavaScript?",
      options: [
        "To create a loop",
        "To handle asynchronous operations",
        "To declare constants",
        "To create an array",
      ],
      answer: 1,
    },
    {
      q: "Python 🐍 — What will be the output? numbers = [1, 2, 3, 4, 5]; result = 0; for i in range(len(numbers)): if numbers[i] % 2 == 0: result += numbers[i] * i; print(result)",
      options: ["12", "14", "20", "24"],
      answer: 1,
    },
  ],
  2: [
    {
      q: "Java ☕ — What is the output? int[] a = {10, 20, 30}; System.out.println(a[1]);",
      options: ["10", "20", "30", "1"],
      answer: 1,
    },
    {
      q: "Python 🐍 — Which collection does not allow duplicate elements?",
      options: ["List", "Tuple", "Set", "String"],
      answer: 2,
    },
    {
      q: "JavaScript 🟨 — What is the output? let nums = [2, 4, 6]; let result = nums.map(x => x + 1); console.log(result);",
      options: ["[2, 4, 6]", "[3, 5, 7]", "[1, 3, 5]", "13"],
      answer: 1,
    },
    {
      q: "C++ ⚡ — What does a pointer primarily store?",
      options: ["A function", "An address", "A class", "A loop"],
      answer: 1,
    },
    {
      q: 'Java ☕ — What is the output? int x = 8; if(x % 2 == 0) System.out.println("Even"); else System.out.println("Odd");',
      options: ["Even", "Odd", "8", "Error"],
      answer: 0,
    },
    {
      q: "C++ ⚡ — Which OOP principle hides internal implementation details?",
      options: ["Inheritance", "Abstraction", "Polymorphism", "Compilation"],
      answer: 1,
    },
    {
      q: "Python 🐍 — What is the output? x = [1, 2, 3]; y = x; y.append(4); print(x)",
      options: ["[1, 2, 3]", "[4]", "[1, 2, 3, 4]", "Error"],
      answer: 2,
    },
    {
      q: "Java ☕ — Which exception occurs when an integer is divided by zero?",
      options: [
        "NullPointerException",
        "ArithmeticException",
        "IndexOutOfBoundsException",
        "IOException",
      ],
      answer: 1,
    },
    {
      q: 'JavaScript 🟨 — What is the output? console.log(5 == "5"); console.log(5 === "5");',
      options: ["true true", "false false", "true false", "false true"],
      answer: 2,
    },
    {
      q: "Python 🐍 — Which data structure is generally used to implement LIFO behavior?",
      options: ["Queue", "Stack", "Graph", "Tree"],
      answer: 1,
    },
    {
      q: "Java ☕ — What will be the output? int x = 5; for(int i = 1; i <= 3; i++) { x = x + i * 2; } System.out.println(x);",
      options: ["11", "15", "17", "21"],
      answer: 2,
    },
    {
      q: "C++ ⚡ — Which data structure is most appropriate for implementing Breadth-First Search (BFS)?",
      options: ["Stack", "Queue", "Heap", "Hash Table"],
      answer: 1,
    },
    {
      q: "JavaScript 🟨 — What will be the output? let a = [1, 2, 3, 4]; let result = a.filter(x => x % 2 === 0).map(x => x * x); console.log(result);",
      options: ["[2, 4]", "[4, 16]", "[1, 4, 9, 16]", "[2, 16]"],
      answer: 1,
    },
    {
      q: "Python 🐍 — What is the time complexity of binary search on a sorted array?",
      options: ["O(1)", "O(n)", "O(log n)", "O(n²)"],
      answer: 2,
    },
    {
      q: "C++ ⚡ — What will be the output? int x = 5; int y = 10; if(x < y) { x += 3; y -= 2; } if(x + y > 15) cout << x + y; else cout << x - y;",
      options: ["13", "15", "16", "-2"],
      answer: 2,
    },
  ],
  3: [
    {
      q: "Python 🐍 — What is the average time complexity of searching for a key in a Python dictionary?",
      options: ["O(n)", "O(log n)", "O(1)", "O(n²)"],
      answer: 2,
    },
    {
      q: "Java ☕ — What is the output? int x = 2; for(int i = 1; i <= 3; i++) { x *= i; } System.out.println(x);",
      options: ["6", "8", "12", "18"],
      answer: 2,
    },
    {
      q: "C++ ⚡ — Which concept allows a derived class to provide its own version of a method?",
      options: ["Encapsulation", "Method overriding", "Compilation", "Constructor"],
      answer: 1,
    },
    {
      q: "JavaScript 🟨 — What is the output? let nums = [2, 4, 6, 8]; let result = nums.filter(x => x > 4).map(x => x / 2); console.log(result);",
      options: ["[6, 8]", "[3, 4]", "[2, 3, 4]", "[1, 2, 3, 4]"],
      answer: 1,
    },
    {
      q: "Python 🐍 — What is the main difference between == and is in Python?",
      options: [
        "Both always do the same thing",
        "== compares values, while is checks object identity",
        "is compares values, while == checks identity",
        "Both compare memory addresses",
      ],
      answer: 1,
    },
    {
      q: 'JavaScript 🟨 — What is the output? console.log(10 + 5 + "5");',
      options: ["20", '"105"', '"155"', '"1055"'],
      answer: 2,
    },
    {
      q: "Java ☕ — Which statement about Java is correct?",
      options: [
        "Java supports multiple inheritance through classes",
        "Java is completely platform-dependent",
        "Java supports multiple inheritance through interfaces",
        "Java does not support OOP",
      ],
      answer: 2,
    },
    {
      q: 'C++ ⚡ — What is the output? int x = 5; cout << ++x << " "; cout << x++;',
      options: ["5 6", "6 6", "6 7", "5 5"],
      answer: 1,
    },
    {
      q: "Python 🐍 — What is the output? print(10 / 2); print(10 // 3)",
      options: ["5 and 3", "5.0 and 3", "5.0 and 3.33", "5 and 3.0"],
      answer: 1,
    },
    {
      q: "JavaScript 🟨 — Which method returns the first element that satisfies a condition?",
      options: ["filter()", "map()", "find()", "reduce()"],
      answer: 2,
    },
  ],
};
