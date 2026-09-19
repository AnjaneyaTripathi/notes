---
layout: post
title: "DSA Design Patterns — Interview Reference"
date: 2026-09-19
order: 23
categories: [reading, algorithms]
tags: [interview-prep, dsa, design-patterns]
---

A comprehensive map of the recurring problem-solving patterns behind most LeetCode medium/hard interview questions. Each pattern includes the core intuition, when to reach for it, and one easy + one hard worked example.

---

## Two Pointers

**Intuition:** When data is sorted (or can be sorted) and you're looking for a pair/triplet/window satisfying a condition, move two indices toward or away from each other instead of checking all O(n²) pairs. One pointer expands the search, the other contracts it based on a comparison.

**Use when:** sorted array, pair-sum problems, in-place partitioning, palindrome checks, merging.

- **Easy — Two Sum II (sorted array):** left=0, right=n-1. If `sum < target`, move left right (need bigger); if `sum > target`, move right left. Each move eliminates a whole row/column of the O(n²) search space, giving O(n).
- **Hard — Trapping Rain Water:** track `leftMax`/`rightMax` while moving whichever pointer has the smaller max inward. The water trapped at any index is bounded by the *smaller* of the two maxes seen so far — moving the smaller-max pointer guarantees correctness without ever computing both maxes for every index.

---

## Sliding Window

**Intuition:** For contiguous subarray/substring problems, don't recompute the window from scratch as it moves — incrementally add the entering element and remove the leaving one. Fixed-size windows slide by one; variable-size windows expand until invalid, then shrink until valid again.

**Use when:** "contiguous subarray/substring", max/min/longest/shortest with a constraint.

- **Easy — Max Sum Subarray of Size K:** maintain a running sum; subtract the element leaving the window, add the one entering. O(n) instead of O(n·k).
- **Hard — Minimum Window Substring:** expand `right` until the window contains all of `t` (track counts in a hash map + a "satisfied" counter), then greedily shrink `left` while still valid, recording the minimum. The key insight: once valid, shrinking never hurts — it can only find a tighter valid window.

---

## Fast & Slow Pointers (Floyd's Cycle Detection)

**Intuition:** Two pointers moving at different speeds through a sequence (usually a linked list) will meet if and only if there's a cycle — because the fast pointer gains one step on the slow pointer per iteration, so it "laps" it inside any cycle.

**Use when:** cycle detection, finding the middle of a list, detecting duplicates via implicit linked-list structure.

- **Easy — Middle of Linked List:** slow moves 1 step, fast moves 2. When fast hits the end, slow is at the middle.
- **Hard — Find the Duplicate Number (array as implicit linked list):** treat `nums[i]` as a pointer to index `nums[i]`. A duplicate creates a cycle. Run Floyd's to find the meeting point, then reset one pointer to start and advance both by 1 — they meet at the cycle's entrance, which is the duplicate.

---

## Merge Intervals

**Intuition:** Sort by start time first — this makes overlap detection local (only need to compare each interval to the last one kept), collapsing what looks like an O(n²) comparison problem into a single linear sweep.

**Use when:** overlapping ranges, scheduling, calendar problems.

- **Easy — Merge Intervals:** sort by start; if `current.start <= lastMerged.end`, extend `lastMerged.end`; else push a new interval.
- **Hard — Minimum Meeting Rooms (II):** separate start times and end times into two sorted arrays. Sweep through starts; each time a start occurs before the earliest unfinished end, you need a new room. This is really "max number of intervals overlapping at any point," solved via a two-pointer sweep or a min-heap of end times.

---

## Cyclic Sort

**Intuition:** When you're given an array of `n` numbers from a known range (typically `1..n` or `0..n-1`), each value has a "correct" home index. Repeatedly swap each element to its correct index in one pass — this exploits the range constraint to sort in O(n) without comparisons, and any index that ends up wrong reveals a missing/duplicate number.

**Use when:** array contains numbers in range `[1,n]`, find missing/duplicate numbers.

- **Easy — Find the Missing Number (0 to n):** cyclic-sort into place, then scan for the index that doesn't hold its own value.
- **Hard — Find All Duplicates in an Array:** for each `num`, negate the value at index `|num|-1`. If it's already negative when you visit it, `|num|` is a duplicate. Uses the array itself as a hash set via sign-marking — O(n) time, O(1) extra space.

---

## In-place Reversal of Linked List

**Intuition:** Reversing means walking the list once while re-pointing each node's `next` to the previous node instead of the next one — you just need three rolling pointers (`prev`, `curr`, `next`) so you never lose the rest of the list.

**Use when:** reverse a list/sublist, reorder list, k-group reversal.

- **Easy — Reverse Linked List:** standard three-pointer walk, O(n) time O(1) space.
- **Hard — Reverse Nodes in k-Group:** recursively (or iteratively) reverse each block of k nodes, then stitch the reversed block's tail to the recursively-processed remainder's head. Requires a look-ahead count to confirm k nodes exist before committing to reverse (a partial final group is left untouched).

---

## Tree BFS

**Intuition:** Level-order traversal via a queue naturally groups nodes by depth — process one full queue-length ("level") at a time so you always know which level you're on without storing depth explicitly.

**Use when:** level-order output, shortest path in unweighted graph/tree, level-dependent aggregation.

- **Easy — Binary Tree Level Order Traversal:** queue starts with root; for each level, pop exactly `len(queue)` nodes, push their children.
- **Hard — Word Ladder:** BFS over the *implicit graph* where words are nodes and an edge exists if two words differ by one letter. BFS guarantees the first time you reach the target word, it's via the shortest transformation sequence.

---

## Tree DFS

**Intuition:** Recursion (or an explicit stack) naturally mirrors a tree's structure — solve a node's answer in terms of its children's answers, going all the way down before combining on the way back up (post-order), or carry state down before recursing (pre-order).

**Use when:** path sum problems, tree validation, subtree properties, backtracking on trees.

- **Easy — Path Sum:** recurse down, subtracting node value from target; at a leaf, check if target hit exactly 0.
- **Hard — Binary Tree Maximum Path Sum:** post-order DFS returning "best downward path from this node" to the parent, while separately tracking a global max that considers the node as a *bridge* (left path + node + right path) — the two values (returned vs. tracked globally) must be kept distinct because a path can't fork at more than one node.

---

## Two Heaps

**Intuition:** Split data into a max-heap holding the smaller half and a min-heap holding the larger half, kept balanced in size. The two heap tops are always adjacent to the true median, turning an O(n log n) sort into O(log n) per insertion.

**Use when:** running median, scheduling problems needing "smallest of the larger" and "largest of the smaller" simultaneously.

- **Easy — Kth Largest Element in a Stream:** maintain a min-heap of size k; the root is always the kth largest.
- **Hard — Find Median from Data Stream:** two heaps as described above; rebalance after each insert so sizes differ by at most 1. Median is the top of the larger heap, or the average of both tops if equal size.

---

## Subsets / Backtracking

**Intuition:** Many "generate all X" problems form a decision tree — at each step, choose to include/exclude (or pick from k choices), recurse, then undo the choice ("backtrack") before trying the next option. The recursion tree *is* the search space; pruning branches early avoids wasted work.

**Use when:** permutations, combinations, subsets, constraint satisfaction (N-Queens, Sudoku), partitioning.

- **Easy — Subsets:** at each element, branch into "include" and "exclude"; base case appends the current subset. 2ⁿ leaves.
- **Hard — N-Queens:** place queens row by row; before placing, check column/diagonal conflicts against already-placed queens (using sets for O(1) conflict checks). Backtrack (remove the queen) when a row has no valid placement, pruning entire subtrees of the search space.

---

## Modified Binary Search

**Intuition:** Binary search doesn't require a fully sorted array — only a way to decide, from `mid`, which half *must* contain the answer. In rotated/bitonic arrays, one half is always properly sorted; use that half's bounds to decide which way to go.

**Use when:** search in rotated/sorted array, find peak, search in answer space ("binary search on the answer").

- **Easy — Search in Rotated Sorted Array:** at `mid`, determine which half (left or right of mid) is normally sorted by comparing `nums[left]` to `nums[mid]`; check if target lies in that sorted half's range, else search the other half.
- **Hard — Median of Two Sorted Arrays:** binary search on the *partition point* of the smaller array (not on values). For a candidate partition, compute the matching partition in the other array such that left-side count = right-side count, then check the boundary elements satisfy `maxLeft ≤ minRight` on both sides. O(log(min(m,n))).

---

## Top K Elements

**Intuition:** You don't need to fully sort n elements to find the top k — maintain a heap of size k and discard anything that can't make the cut, giving O(n log k) instead of O(n log n).

**Use when:** "kth largest/smallest", "top k frequent", closest points.

- **Easy — Kth Largest Element in an Array:** min-heap of size k; push each element, pop if size exceeds k; root is the answer.
- **Hard — K Closest Points to Origin (with a twist: streaming / huge n):** max-heap of size k keyed by distance; push a point, pop the farthest if size > k. Alternative: Quickselect (partition-based, average O(n)) when you need in-place, one-shot selection rather than a maintained structure.

---

## K-way Merge

**Intuition:** Merging k sorted lists is just "repeatedly pick the smallest available head" — a min-heap holding one element per list (the current head) gives you that smallest element in O(log k) instead of scanning all k heads each time.

**Use when:** merge k sorted lists/arrays, smallest range covering elements from k lists.

- **Easy — Merge Two Sorted Lists:** two-pointer merge (degenerate k=2 case), O(n+m).
- **Hard — Merge k Sorted Lists:** min-heap holding `(value, list_index, node)` for each list's current head; pop the min, append it, push that list's next node. O(N log k) where N is total nodes.

---

## Dynamic Programming — 1D

**Intuition:** When the answer for size `n` can be expressed in terms of answers for smaller sizes (optimal substructure), and those subproblems repeat (overlapping subproblems), cache results instead of recomputing — bottom-up table or top-down memoization.

**Use when:** counting ways, min/max cost to reach a state, decisions with "take or skip."

- **Easy — Climbing Stairs:** `dp[i] = dp[i-1] + dp[i-2]` — Fibonacci in disguise; ways to reach step i = ways from i-1 (one step) + ways from i-2 (two steps).
- **Hard — House Robber II (circular):** because houses form a circle, the first and last are adjacent — so run the linear House Robber DP twice: once excluding the last house, once excluding the first, and take the max. Reduces a circular constraint to two linear subproblems.

---

## Dynamic Programming — 2D (Grid / Two Sequences)

**Intuition:** When state depends on two indices (position in a grid, or position in *each* of two strings), the DP table is 2D: `dp[i][j]` represents the best answer using the first i elements of one sequence and first j of another (or reaching cell (i,j)).

**Use when:** edit distance, longest common subsequence, grid path counting, string matching.

- **Easy — Unique Paths:** `dp[i][j] = dp[i-1][j] + dp[i][j-1]` — number of ways to reach a cell is the sum of ways to reach the cell above and the cell to the left.
- **Hard — Edit Distance:** `dp[i][j]` = min edits to convert `word1[:i]` to `word2[:j]`. If chars match, `dp[i][j] = dp[i-1][j-1]`; else `1 + min(insert, delete, replace)` = `1 + min(dp[i][j-1], dp[i-1][j], dp[i-1][j-1])`. Each of the three operations corresponds exactly to one neighboring cell.

---

## Knapsack (0/1 and Unbounded)

**Intuition:** A specialization of 2D DP where the two dimensions are "items considered so far" and "capacity used so far." 0/1 means each item is used at most once (dimension collapses to 1D if iterated capacity-descending); unbounded allows reuse (iterate capacity-ascending).

**Use when:** subset-sum, partition, coin change, budget-constrained selection.

- **Easy — Coin Change (min coins, unbounded):** `dp[amount] = min(dp[amount - coin] + 1)` over all coins; iterate amounts ascending since coins can repeat.
- **Hard — Partition Equal Subset Sum (0/1):** reduces to "can a subset sum to `total/2`?" — a boolean 0/1 knapsack. `dp[j] |= dp[j - num]`, iterating `j` *descending* per number so each number is only used once per pass.

---

## Greedy

**Intuition:** At each step, make the locally optimal choice and never revisit it — valid only when the problem has the "greedy choice property" (a local optimum leads to a global optimum), usually provable via an exchange argument.

**Use when:** interval scheduling, "minimum number of X", problems where sorting by one criterion makes the choice obvious.

- **Easy — Assign Cookies:** sort both children's greed factors and cookie sizes; greedily give the smallest sufficient cookie to the least-greedy unsatisfied child.
- **Hard — Jump Game II (min jumps to reach end):** greedily track the farthest reachable index within the *current* jump's range; when you exhaust the current range, you're forced to take a jump — increment count and extend the range to the farthest reachable seen so far. This avoids exploring all jump choices explicitly.

---

## Graphs — Union-Find (Disjoint Set)

**Intuition:** To repeatedly answer "are these two nodes connected?" and merge components efficiently, maintain a forest where each set has a representative ("root"). Path compression (flatten pointers to root during find) + union by rank/size keep operations near O(1) amortized.

**Use when:** connectivity queries, cycle detection in undirected graphs, Kruskal's MST, "number of provinces/islands via merging."

- **Easy — Number of Provinces:** union every pair of directly connected cities; count distinct roots at the end.
- **Hard — Redundant Connection:** process edges in order, union-find each; the first edge that tries to union two nodes *already* in the same set is the redundant one (it would create a cycle).

---

## Graphs — Topological Sort

**Intuition:** For a DAG with dependency constraints ("A must come before B"), repeatedly peel off nodes with no remaining incoming edges (in-degree 0) — this is only possible if the graph is acyclic, so the algorithm doubles as cycle detection.

**Use when:** task scheduling with prerequisites, build order, course scheduling.

- **Easy — Course Schedule (can finish?):** Kahn's algorithm — queue all in-degree-0 nodes, repeatedly pop and decrement neighbors' in-degrees, pushing any that hit 0. If you process all n nodes, no cycle exists.
- **Hard — Alien Dictionary:** derive edges by comparing adjacent words letter-by-letter (first differing letter gives an ordering constraint), build the graph, then topologically sort. Must also detect the invalid case where a shorter word appears *after* a longer word that shares its prefix.

---

## Trie (Prefix Tree)

**Intuition:** Store strings letter-by-letter in a tree where shared prefixes share nodes — this makes prefix queries (autocomplete, "does any word start with X") O(length) instead of scanning every string.

**Use when:** autocomplete, word search in a grid, prefix matching, "longest common prefix" among many strings.

- **Easy — Implement Trie:** each node has a children map + `isEndOfWord` flag; insert/search walk one character at a time.
- **Hard — Word Search II (find all words from a list present in a grid):** build a trie of all target words, then DFS/backtrack from every grid cell, walking the trie in lockstep with the DFS path — this prunes DFS branches early (stop as soon as the current path isn't a prefix of *any* word) instead of running a separate search per word.

---

## Monotonic Stack

**Intuition:** For "next greater/smaller element" style problems, a stack that only ever holds increasing (or decreasing) values lets you resolve each element's answer in amortized O(1): when a new element breaks the monotonic property, everything it pops *just found its answer*.

**Use when:** next greater/smaller element, histogram problems, stock span, daily temperatures.

- **Easy — Daily Temperatures:** decreasing stack of indices; when the current temp exceeds the stack top's temp, pop it and record `current_index - popped_index` as its answer.
- **Hard — Largest Rectangle in Histogram:** increasing stack of indices; when a bar shorter than the stack top appears, pop and compute the rectangle with the popped bar as the height, width spanning from the new stack top+1 to the current index. Each bar is pushed/popped exactly once → O(n).

---

## Bitwise XOR Tricks

**Intuition:** XOR cancels identical values (`a ^ a = 0`) and is order-independent — useful whenever a problem's brute force is "find the odd one out" or "toggle a state."

**Use when:** find single/missing number, swap without temp, subsets via bitmask.

- **Easy — Single Number (every element appears twice except one):** XOR all elements; pairs cancel to 0, leaving the singleton.
- **Hard — Single Number III (two elements appear once, rest twice):** XOR everything to get `x ^ y` (the two singles). Find any set bit in that result (a bit where x and y differ), and use it to partition all numbers into two groups; XOR-ing within each group isolates x and y separately.

---

## Prefix Sum / Difference Array

**Intuition:** Precompute cumulative sums so any range-sum query becomes an O(1) subtraction (`prefix[j] - prefix[i-1]`) instead of O(n) per query. The difference-array variant does the reverse: turn O(n) range *updates* into O(1) by marking only the boundaries.

**Use when:** range sum queries, subarray sum equals K, many range-update operations.

- **Easy — Range Sum Query (Immutable):** precompute `prefix[i] = prefix[i-1] + nums[i]`; answer any `[l,r]` query in O(1) via `prefix[r] - prefix[l-1]`.
- **Hard — Subarray Sum Equals K:** running prefix sum + hash map counting how many times each prefix value has occurred. At each index, `count += map[currentPrefix - k]` — because if an earlier prefix equals `currentPrefix - k`, the subarray between them sums to exactly k. O(n) instead of O(n²) brute force.

---

#### Quick Recognition Cheat-Sheet

| Signal in the problem | Likely pattern |
|---|---|
| Sorted array, pair/triplet | Two Pointers |
| Contiguous subarray/substring, "longest/shortest/max" | Sliding Window |
| Linked list cycle / middle | Fast & Slow Pointers |
| Overlapping ranges/scheduling | Merge Intervals |
| Numbers in range [1,n] | Cyclic Sort |
| "Reverse" a list/sublist | In-place LL Reversal |
| Level-by-level tree/graph output, shortest path (unweighted) | Tree/Graph BFS |
| Root-to-leaf, subtree property | Tree DFS |
| Running median / balance two extremes | Two Heaps |
| "Generate all…" | Backtracking |
| Sorted/rotated array search, "minimize the maximum" | Modified Binary Search |
| "Top/kth k elements" | Heap (Top K) |
| Merge k sorted structures | K-way Merge (heap) |
| "Number of ways", "min/max cost", take-or-skip | 1D/2D DP |
| Subset sums to a target / budget constraint | Knapsack |
| Sort-then-decide, exchange-argument provable | Greedy |
| Connectivity / merge groups | Union-Find |
| Dependency ordering ("before/after") | Topological Sort |
| Prefix/autocomplete over many strings | Trie |
| Next greater/smaller, histogram | Monotonic Stack |
| "Every element twice except one" | XOR |
| Range sum queries, "subarray sums to K" | Prefix Sum |

---

*Given your existing 19-pattern deep-dive set, these 23 entries fill in a few you may not have covered explicitly: Merge Intervals, Prefix Sum/Difference Array, and the Knapsack/DP split into 1D vs. 2D — worth checking against your notes for gaps.*
