# Motivation
There is no shortage of libraries for manipulating rose trees in javascript. Because we seek to 
focus on general multi-way trees, we have excluded those libraries focusing on specialized trees 
(i.e. binary search trees, red-black trees, etc.). Also we did not consider the libraries who 
look at trees from a visualization perspective (for instance [jstree](https://www.jstree.com/)), as 
we focus here on handling the data structure, and providing a few basic operations on it.

Such libraries include, among the most interesting subjects :

- [tree-model](http://jnuno.com/tree-model-js/) : maintained and contributed to, imperative 
object-based API, basic operations (traversal, find) together with utility functions (`isRoot`, 
etc.) supporting the imperative portion of the API, nice [demo site](http://jnuno.com/tree-model-js/)!
- [arboreal](https://github.com/afiore/arboreal) : ancient, no longer maintained, imperative API, 
imposed tree format, only basic operations
= [t-js](https://github.com/aaronj1335/t-js) : ancient, no longer maintained, semi-functional 
API,, basic but key functional operations (bfs/dfs/post-order traversals, map, filter, find), an 
interesting addition (`stroll`) traversing two trees at the same time, imposed tree format
- [DataStructures.Tree](https://github.com/stephen-james/DataStructures.Tree) ; ancient, 
undocumented, umaintained

I developed this library due to my specifications which were unfulfilled by the aforementioned 
libraries :

- functional API : while nodes can be reused, trees cannot be modified in place, or mutate 
any subtrees.
- flexible tree data structure : API should allow to manipulate trees as an abstract 
data type (ADT), whose concrete data structure implementing that ADT is left to be specified by 
the API consumer. Those two possible data structures for a tree should be handled by the library 
just as easily : 
  - `[root, [left, [middle, [midright, midleft]], right]]`, or more commonly 
  - `{label : 'root', children : [{label:'left'}, {label: 'right'}]}`.
- basic operations : bfs/dfs/post-order traversal, map/reduce/prune(~filter)/find operations
- advance operations : find common ancestor, replace, build a zipper

At the current state of the library, only the basic operations are implemented.

# Concepts
In computing, a multi-way tree or rose tree is a tree data structure with a variable and 
unbounded number of branches per node[^1]. The name rose tree for this structure is prevalent in 
the functional programming community, so we use it here. For instance, a rose tree can be defined
 in Haskell as follows : `data RoseTree a = RoseTree a [RoseTree a]`.

There is a distinction between a tree as an abstract data type and as a concrete data structure, 
analogous to the distinction between a list and a linked list. As a data type, a tree has a value
 (`:: a`) and children (`:: [RoseTree a]`), and the children are themselves trees; the value and 
 children  of the  tree  are  interpreted as the value of the root node and the subtrees of the  
 children of the root node. A linked tree is an example of specific data structure, implementing 
 the abstract data type and is a group of nodes, where  each node has a value and a list of 
 references to other nodes (its children).  There is also the requirement that no two "downward" 
  references point to the same node.
  
As an ADT, the abstract tree type T with values of some type E is defined, using the abstract forest type F (list of trees), by the functions:

- value: T → E
- children: T → F
- nil: () → F
- node: E × F → T

with the axioms:

- value(node(e, f)) = e
- children(node(e, f)) = f

In our API, we will use a parameter `lenses` which will provide an implementation as necessary of
 the relevant functions :
 
 - `getLabel :: T -> E`
 - `getChildren :: T -> F`
 - `setTree :: E x F -> T` 
 - `nil` (the empty forest) will be taken by default to be the empty list (`[]`). A forest being 
 a list of trees, it is convenient that the empty forest be an empty list.

These functions are gathered into the `lenses` parameter, as, just like lenses, they allow to 
focus on a portion of a composite data structure. `setTree` can be viewed both as a constructor, 
and as the setter part of a lens on the tree.

For instance, the tree-like object `{label : 'root', children : [{label:'left'}, {label: 
'right'}]}` can be described by the following lenses :

- `getLabel = tree => tree.label`
- `getChildren = tree => tree.children || []`
- `setTree = (label, children) => ({label, children})`

[^1]: Bird, Richard (1998). Introduction to Functional Programming using Haskell. Hemel Hempstead, Hertfordshire, UK: Prentice Hall Europe. p. 195. ISBN 0-13-484346-0.

# Types
- `Traversal :: BFS | PRE_ORDER | POST_ORDER`
- `Lenses :: {{getLabel :: T -> E, getChildren :: T -> F, setTree :: ExF -> T}}`
- `Reducer<A, T, TraversalState> :: A -> TraversalState -> T -> A`
- `TraverseSpecs :: {{strategy :: Optional<Traversal>, seed : A, visit :: Reducer<A, T, TraversalState> }}`

# API
## breadthFirstTraverseTree :: Lenses -> TraverseSpecs -> Tree -> A
### Description
Traverse a tree breadth-first, applying a reducer while traversing the tree, and returning the 
final accumulated reduction.

### Types
- `Tree :: T`
- `Traversal :: BFS | PRE_ORDER | POST_ORDER`
- `State :: {{isAdded :: Boolean, isVisited :: Boolean, path :: Array<Number>, ...}}` (extensible
 record)
- `TraversalState :: Map<T, State>`
- `Lenses :: {{getLabel :: T -> E, getChildren :: T -> F, setTree :: ExF -> T}}`
- `Reducer<A, T, TraversalState> :: A -> TraversalState -> T -> A`
- `TraverseSpecs :: {{strategy :: Optional<Traversal>, seed : A, visit :: Reducer<A, T, TraversalState> }}`

### Examples
**NOTE** : for bfs/pre/post-order traversals, we only need the `getChildren` lens. It is a good 
habit however to define and pass the full`lenses` once and for all.
 
```ecmascript 6
const tree = {
  label: "root",
  children: [
    { label: "left" },
    {
      label: "middle",
      children: [{ label: "midleft" }, { label: "midright" }]
    },
    { label: "right" }
  ]
};

const lenses = {
  getChildren: tree => tree.children || []
};

const traverse = {
  seed: [],
  visit: (result, traversalState, tree) => {
    result.push(tree.label);
    return result;
  }
};

QUnit.test("main case - breadthFirstTraverseTree", function exec_test(assert) {
  const actual = breadthFirstTraverseTree(lenses, traverse, tree);
  const expected = [
    "root",
    "left",
    "middle",
    "right",
    "midleft",
    "midright"
  ];

  assert.deepEqual(actual, expected, `Fails!`);
});
```

## preorderTraverseTree :: Lenses -> TraverseSpecs -> Tree -> A
### Description
Traverse a tree pre=order depth-first, applying a reducer while traversing the tree, and returning 
the final accumulated reduction.

### Types
- `Tree :: T`
- `Traversal :: BFS | PRE_ORDER | POST_ORDER`
- `State :: {{isAdded :: Boolean, isVisited :: Boolean, path :: Array<Number>, ...}}` (extensible
 record)
- `TraversalState :: Map<T, State>`
- `Lenses :: {{getLabel :: T -> E, getChildren :: T -> F, setTree :: ExF -> T}}`
- `Reducer<A, T, TraversalState> :: A -> TraversalState -> T -> A`
- `TraverseSpecs :: {{strategy :: Optional<Traversal>, seed : A, visit :: Reducer<A, T, TraversalState> }}`

### Examples
```ecmascript 6
QUnit.test("main case - preorderTraverseTree", function exec_test(assert) {
  const actual = preorderTraverseTree(lenses, traverse, tree);
  const expected = [
    "root",
    "left",
    "middle",
    "midleft",
    "midright",
    "right"
  ];

  assert.deepEqual(actual, expected, `Fails!`);
});
```

## postOrderTraverseTree :: Lenses -> TraverseSpecs -> Tree -> A
### Description
Traverse a tree pre=order depth-first, applying a reducer while traversing the tree, and returning 
the final accumulated reduction.

### Types
- `Tree :: T`
- `Traversal :: BFS | PRE_ORDER | POST_ORDER`
- `State :: {{isAdded :: Boolean, isVisited :: Boolean, path :: Array<Number>, ...}}` (extensible
 record)
- `TraversalState :: Map<T, State>`
- `Lenses :: {{getLabel :: T -> E, getChildren :: T -> F, setTree :: ExF -> T}}`
- `Reducer<A, T, TraversalState> :: A -> TraversalState -> T -> A`
- `TraverseSpecs :: {{strategy :: Optional<Traversal>, seed : A, visit :: Reducer<A, T, TraversalState> }}`

### Examples
```ecmascript 6
QUnit.test("main case - postOrderTraverseTree", function exec_test(assert) {
  const actual = postOrderTraverseTree(lenses, traverse, tree);
  const expected = [
    "left",
    "midleft",
    "midright",
    "middle",
    "right",
    "root"
  ];

  assert.deepEqual(actual, expected, `Fails!`);
});
```

## reduceTree
## forEachInTree
## mapOverTree
## pruneWhen
