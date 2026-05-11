import type { PrismaClient } from '@prisma/client';

const questions = [
  ['EASY', 1, 'Which data structure uses FIFO order?', ['Stack', 'Queue', 'Tree', 'Graph'], 1, 'tech'],
  ['EASY', 1, 'What does CPU stand for?', ['Central Process Unit', 'Central Processing Unit', 'Code Processing Unit', 'Core Program Unit'], 1, 'tech'],
  ['EASY', 1, 'Which planet is known as the Red Planet?', ['Venus', 'Mars', 'Jupiter', 'Mercury'], 1, 'general'],
  ['EASY', 2, 'HTML is mainly used to define what?', ['Database indexes', 'Page structure', 'Server memory', 'Image compression'], 1, 'web'],
  ['EASY', 2, 'Which IITM BS branch studies data pipelines and models?', ['Data Science', 'Civil', 'Mechanical', 'Aerospace'], 0, 'iitm'],
  ['EASY', 2, 'What is 2 to the power of 5?', ['16', '24', '32', '64'], 2, 'math'],
  ['EASY', 3, 'Which protocol commonly serves web pages?', ['SMTP', 'HTTP', 'FTP', 'SSH'], 1, 'web'],
  ['EASY', 3, 'Which keyword declares a constant in JavaScript?', ['var', 'let', 'const', 'static'], 2, 'tech'],
  ['MEDIUM', 4, 'What is the time complexity of binary search?', ['O(n)', 'O(log n)', 'O(n log n)', 'O(1)'], 1, 'algorithms'],
  ['MEDIUM', 4, 'Which SQL clause groups rows?', ['ORDER BY', 'GROUP BY', 'HAVING ONLY', 'MERGE'], 1, 'database'],
  ['MEDIUM', 4, 'In Git, which command creates a new branch and switches to it?', ['git branch -d', 'git checkout -b', 'git merge', 'git stash'], 1, 'tools'],
  ['MEDIUM', 5, 'What does ACID describe?', ['CSS style rules', 'Database transaction guarantees', 'HTTP methods', 'Encryption ciphers'], 1, 'database'],
  ['MEDIUM', 5, 'Which algorithm finds shortest paths with non-negative weights?', ['Dijkstra', 'Quicksort', 'KMP', 'Prim only'], 0, 'algorithms'],
  ['MEDIUM', 5, 'What is the default port for HTTPS?', ['80', '443', '5432', '3000'], 1, 'web'],
  ['MEDIUM', 6, 'Which React hook memoizes a computed value?', ['useMemo', 'useEffect', 'useRef', 'useReducer'], 0, 'frontend'],
  ['MEDIUM', 6, 'Which normal form removes transitive dependencies?', ['1NF', '2NF', '3NF', 'BCNF only'], 2, 'database'],
  ['HARD', 7, 'What does CAP theorem trade off during network partitions?', ['CPU and memory', 'Consistency and availability', 'Syntax and semantics', 'Rows and columns'], 1, 'systems'],
  ['HARD', 7, 'Which sorting algorithm is stable in common library implementations like TimSort?', ['Selection sort', 'TimSort', 'Heap sort', 'Quickselect'], 1, 'algorithms'],
  ['HARD', 7, 'What is a nonce used for in security protocols?', ['Repeated password', 'Number used once', 'Plaintext archive', 'Slow hash table'], 1, 'security'],
  ['HARD', 8, 'Which isolation anomaly allows a row to appear on a repeated range read?', ['Dirty read', 'Phantom read', 'Syntax read', 'Cold read'], 1, 'database'],
  ['HARD', 8, 'Which HTTP status means too many requests?', ['401', '403', '404', '429'], 3, 'web'],
  ['HARD', 8, 'In distributed systems, what does idempotency protect against?', ['Duplicate retries', 'Syntax errors', 'Compiler warnings', 'Low contrast'], 0, 'systems'],
  ['HARD', 9, 'What is the asymptotic size of a complete binary tree with height h?', ['h', '2h', '2^(h+1)-1', 'h^2'], 2, 'math'],
  ['HARD', 9, 'Which index type is typically best for equality lookups in Postgres primary keys?', ['B-tree', 'Bitmap only', 'Heap only', 'No index'], 0, 'database'],
  ['EXPERT', 10, 'Which consensus protocol popularized leader election with replicated logs?', ['Raft', 'Bubble sort', 'OAuth', 'Sass'], 0, 'systems'],
  ['EXPERT', 10, 'What does linearizability guarantee?', ['Operations appear instantaneous in a real-time order', 'Every query uses an index', 'All code is synchronous', 'Memory never grows'], 0, 'systems'],
  ['EXPERT', 10, 'Which problem is reduced by parameterized SQL queries?', ['SQL injection', 'Packet loss', 'Cache stampede only', 'Layout shift'], 0, 'security'],
  ['EXPERT', 11, 'In type theory, what is a discriminated union often used to model?', ['Mutually exclusive states', 'Database locks', 'CSS cascade', 'TCP windows'], 0, 'programming'],
  ['EXPERT', 11, 'What is backpressure in stream processing?', ['Signaling producers to slow down', 'Adding more colors', 'Deleting logs', 'Opening sockets'], 0, 'systems'],
  ['EXPERT', 12, 'Which property says a hash collision should be computationally hard to find?', ['Collision resistance', 'Referential transparency', 'Serializability', 'Responsive design'], 0, 'security'],
  ['EASY', 3, 'What is the capital of India?', ['Mumbai', 'New Delhi', 'Chennai', 'Kolkata'], 1, 'general'],
  ['MEDIUM', 6, 'Which number base does binary use?', ['2', '8', '10', '16'], 0, 'math'],
  ['HARD', 9, 'Which graph traversal uses a queue?', ['DFS', 'BFS', 'Topological sort only', 'Bellman-Ford'], 1, 'algorithms'],
  ['EXPERT', 12, 'Which database concept prevents orphaned child rows?', ['Foreign key', 'View', 'Cursor', 'Sequence'], 0, 'database'],
  ['EASY', 2, 'Which language runs directly in most browsers?', ['Python', 'JavaScript', 'Go', 'Rust'], 1, 'web'],
  ['MEDIUM', 5, 'What does JSON stand for?', ['JavaScript Object Notation', 'Java Source Open Network', 'Joined Syntax Object Name', 'JavaScript Ordered Nodes'], 0, 'web'],
  ['HARD', 8, 'Which cache problem occurs when many clients recompute the same expired value?', ['Cache stampede', 'Cache embossing', 'Cache pinning', 'Cache splice'], 0, 'systems'],
  ['EXPERT', 10, 'What does MVCC stand for?', ['Multi-Version Concurrency Control', 'Managed Virtual Code Cache', 'Memory Value Control Channel', 'Multi-View Class Compiler'], 0, 'database'],
  ['MEDIUM', 4, 'Which CSS layout tool is one-dimensional?', ['Flexbox', 'Grid', 'Canvas', 'SVG'], 0, 'frontend'],
  ['EASY', 1, 'Which file commonly stores npm scripts?', ['package.json', 'index.html', 'schema.sql', 'README.png'], 0, 'tools'],
] as const;

export async function seedTriviaTowerContent(prisma: PrismaClient): Promise<void> {
  for (const [difficulty, floor, prompt, options, correctIndex, category] of questions) {
    const existing = await prisma.triviaQuestion.findFirst({
      where: { prompt },
      select: { id: true },
    });
    const data = { difficulty, floor, prompt, options, correctIndex, category, active: true };
    if (existing) {
      await prisma.triviaQuestion.update({ where: { id: existing.id }, data });
    } else {
      await prisma.triviaQuestion.create({ data });
    }
  }
}
