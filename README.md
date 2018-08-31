- [Motivation](#motivation)
- [Concepts](#concepts)
- [Key contracts](#key-contracts)
- [API](#api)
  * [breadthFirstTraverseTree :: Lenses -> TraverseSpecs -> Tree -> A](#breadthfirsttraversetree--lenses---traversespecs---tree---a)
  * [preorderTraverseTree :: Lenses -> TraverseSpecs -> Tree -> A](#preordertraversetree--lenses---traversespecs---tree---a)
  * [postOrderTraverseTree :: Lenses -> TraverseSpecs -> Tree -> A](#postordertraversetree--lenses---traversespecs---tree---a)
  * [reduceTree :: Lenses -> TraverseSpecs -> Tree -> A](#reducetree--lenses---traversespecs---tree---a)
  * [forEachInTree :: Lenses -> TraverseSpecs -> Tree -> A](#foreachintree--lenses---traversespecs---tree---a)
  * [mapOverTree :: Lenses -> MapFn -> Tree -> Tree'](#mapovertree--lenses---mapfn---tree---tree)
  * [pruneWhen :: Lenses -> Predicate -> Tree -> Tree](#prunewhen--lenses---predicate---tree---tree)
  * [visitTree :: ExtendedTraversalSpecs -> Tree -> A](#visittree--extendedtraversalspecs---tree---a)
  * [switchTreeDataStructure :: Lenses -> Lenses -> Tree](#switchtreedatastructure--lenses---lenses---tree)
  * [traverseObj :: ExtendedTraversalSpecs -> Tree -> A](#traverseobj--extendedtraversalspecs---tree---a)
- [Tests](#tests)
- [Build](#build)
- [Install](#install)
- [Examples of lenses](#examples-of-lenses)

# Motivation
There is no shortage of libraries for manipulating trees in javascript. Because we seek to 
focus on general multi-way trees, we have excluded those libraries focusing on specialized trees 
(i.e. binary search trees, red-black trees, etc.). Also we did not consider the libraries which 
look at trees from a visualization perspective (for instance [jstree](https://www.jstree.com/)), as 
we focus here on handling the data structure, and providing a few basic operations on it.

Such libraries include, among the most interesting subjects, in order of interest :

- [tree-morph](https://github.com/ngryman/tree-morph) : maintained, API features traversal only, 
free tree format, tree is immutable, allows partial traversal (node skipping), iterative 
algorithms, incomplete documentation
- [tree-crawl](https://github.com/ngryman/tree-crawl) : maintained, API features traversal only, 
free tree format, tree is mutable, claims to be optimized for performance!, nice API for skipping
 nodes or canceling a traversal, iterative algorithms, incomplete documentation
- [tree-model](http://jnuno.com/tree-model-js/) : maintained and contributed to, imperative 
object-based API, basic operations (traversal, find) together with utility functions (`isRoot`, 
etc.) supporting the imperative portion of the API, recursive algorithms, nice [demo site](http://jnuno.com/tree-model-js/)!
- [arboreal](https://github.com/afiore/arboreal) : ancient, no longer maintained, imperative API, 
imposed tree format, only basic operations
- [t-js](https://github.com/aaronj1335/t-js) : ancient, no longer maintained, semi-functional 
API,, basic but key functional operations (bfs/dfs/post-order traversals, map, filter, find), an 
interesting addition (`stroll`) traversing two trees at the same time, imposed tree format
- [DataStructures.Tree](https://github.com/stephen-james/DataStructures.Tree) ; ancient, 
undocumented, unmaintained

In practice, it seems that few people use a dedicated tree library for manipulating tree-like 
data structure. Rather, what I saw in the wild is ad-hoc implementations of traversals, which are 
adjusted to the particular shape of the data at hand. This is understandable as tree traversal 
algorithms, specially the recursive ones, are trivial to implement (5-10 lines of code). 

However :

- iterative algorithms are almost mandatory to process large trees (to avoid exhausting the stack)
- a generic traversal library fosters reuse (in my particular case, I have various 
tree formats to handle, and it would not be DRY to write the traversal at hand each time for each 
format)
- a functional library is also nice to guarantee that there is no destructive update of tree 
nodes, and at the same time allows natural composition and chaining of tree operations
- a well-designed, tested library enhances readability and maintainability 

As a conclusion, these are the design choices made for this library :
- manipulation of tree data structure is based on ADT, i.e. not on a specific or concrete data 
structure as the aforementioned libraries. Those three possible concrete data structures for a tree 
should be handled by the library just as easily : 
  - `[root, [left, [middle, [midright, midleft]], right]]`, or more commonly 
  - `{label : 'root', children : [{label:'left'}, {label: 'right'}]}`.
  - `{key0 : {key0.0 : {}, key0.1 : 'something'}, key1 : 2018}`
- immutability of tree nodes
- iterative traversal algorithms
- basic operations available : bfs/dfs/post-order traversals, map/reduce/prune(~filter)/find 
operations
- advanced operations in a future version : find common ancestor(would involve building a zipper), 
replace, optional : tree diff(hard), some, every (not so useful), transducers (would be amazing)

At the current state of the library, only the basic operations are implemented.

As a bonus, lenses for object traversal are included and allow traversing and mapping over a 
javascript object (POJO).

# Concepts
In computing, a multi-way tree or rose tree is a tree data structure with a variable and 
unbounded number of branches per node[^1]. The name rose tree for this structure is prevalent in 
the functional programming community, so we use it here. For instance, a rose tree can be defined
 in Haskell as follows : `data RoseTree a = RoseTree a [RoseTree a]`.

There is a distinction between a tree as an abstract data type and as a concrete data structure, 
analogous to the distinction between a list and a linked list. As a data type, a tree has a value
 (`:: a`) and children (`:: [RoseTree a]`), and the children are themselves trees. 
 A linked tree is an example of specific data structure, implementing 
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
 - `constructTree :: E x F -> T` 
 - `nil` (the empty forest) will be taken by default to be the empty list (`[]`). A forest being 
 a list of trees, it is convenient that the empty forest be an empty list.

These functions are gathered into the `lenses` parameter, as, just like lenses, they allow to 
focus on a portion of a composite data structure. `constructTree` can be viewed both as a constructor, 
and as the setter part of a lens on the tree.

For instance, the tree-like object `{label : 'root', children : [{label:'left'}, {label: 
'right'}]}` can be described by the following lenses :

- `getLabel = tree => tree.label`
- `getChildren = tree => tree.children || []`
- `constructTree = (label, children) => ({label, children})`

[^1]: Bird, Richard (1998). Introduction to Functional Programming using Haskell. Hemel Hempstead, Hertfordshire, UK: Prentice Hall Europe. p. 195. ISBN 0-13-484346-0.

The flexibility offered by the abstract data type comes in handy when interpreting abstract 
syntax trees, whose format is imposed by the parser, and which may vary widely according to the 
target language and specific parser. The ADT technique also allows for higher reusability.

**NOTE** : All functions are provided without currying. We paid attention to the order of parameters to 
facilitate currying for those who will find it convenient. The `ramda` functional library can be 
used easily to curry any relevant provided function. 
**NOTE** : This API style could also be called [interface-passing style](https://common-lisp.net/~frideau/lil-ilc2012/lil-ilc2012.html) 

# Key contracts
## Key types
- `Traversal :: BFS | PRE_ORDER | POST_ORDER`
- `Lenses :: {{getLabel :: T -> E, getChildren :: T -> F, constructTree :: ExF -> T}}`
- `State :: {{isAdded :: Boolean, isVisited :: Boolean, path :: Array<Number>, ...}}` (extensible
 record)
- `TraversalState :: HashMap<T, State>` (the hashmap exposes `get` and `set` methods to read and 
update itself)
- `Reducer<A, T, TraversalState> :: A -> TraversalState -> T -> A` (reducer may additionally 
update the traversal state if necessary to implement a given traversal logic)
- `TraverseSpecs :: {{strategy :: Optional<Traversal>, seed : A, visit :: Reducer<A, T, TraversalState> }}`

Those types can be slightly modified depending on the specific function executed. The meaning of 
those types is pretty straight-forward. Let's just notice that `TraversalState` is a map which 
associates to each node being traversed the state of the traversal, and possibly any extra state 
that the API consumer might want to add, while traversing. As a matter of fact, the `visit` 
function could mutate `TraversalState` if that would make sense for the situation at end. That 
mutation would be invisible from outside of the API, as long as none of the mutated state is 
exported ("If a tree falls in a forest and no one is around to hear it, does it make a sound?").

## No node repetition
It is important to note that **no tree can repeat the same nodes** with sameness defined by 
referential equality. It is easy to inadvertently repeat the same node :

```javascript
const tree1  ...;
const tree2 = {label : ..., children : [tree1, tree1]}
```

While `tree2` is a well-formed tree, our library will bug in that case, for reasons due to our 
specific implementation (nodes are used as keys to keep the traversal state, and keys must be 
unique). It gets really tricky if your tree somehow can be a javascript primitive, in which case,
 this contract would mean that all such primitives should have a different value! Tests so far 
 seems to show that 'normal' tree structures do not have this primitive-value-duplication problem.

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
- `Lenses :: {{getLabel :: T -> E, getChildren :: T -> F, constructTree :: ExF -> T}}`
- `Reducer<A, T, TraversalState> :: A -> TraversalState -> T -> A`
- `TraverseSpecs :: {{strategy :: Optional<Traversal>, seed : A, visit :: Reducer<A, T, TraversalState> }}`

### Other contracts
- a seed **must** be a JSON object or a function returning a constructor (e.g `() => Map`) which 
executed will produce a seed value

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

  assert.deepEqual(actual, expected, `Works!`);
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
- `Lenses :: {{getLabel :: T -> E, getChildren :: T -> F, constructTree :: ExF -> T}}`
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

  assert.deepEqual(actual, expected, `Works!`);
});
```

## postOrderTraverseTree :: Lenses -> TraverseSpecs -> Tree -> A
### Description
Traverse a tree post=order depth-first, applying a reducer while traversing the tree, and returning 
the final accumulated reduction.

### Types
- `Tree :: T`
- `Traversal :: BFS | PRE_ORDER | POST_ORDER`
- `State :: {{isAdded :: Boolean, isVisited :: Boolean, path :: Array<Number>, ...}}` (extensible
 record)
- `TraversalState :: Map<T, State>`
- `Lenses :: {{getLabel :: T -> E, getChildren :: T -> F, constructTree :: ExF -> T}}`
- `Reducer<A, T, TraversalState> :: A -> TraversalState -> T -> A`
- `TraverseSpecs :: {{strategy :: Optional<Traversal>, seed : A, visit :: Reducer<A, T, TraversalState> }}`

### Other contracts
- a seed **must** be a JSON object or a function returning a constructor (e.g `() => Map`) which 
executed will produce a seed value

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

  assert.deepEqual(actual, expected, `Works!`);
});
```

## reduceTree :: Lenses -> TraverseSpecs -> Tree -> A
**NOTE** : the  `strategy` property is this time mandatory as part of the traversal specs.

### Description
Traverse a tree according to the parameterized traversal stratgy, applying a reducer while 
traversing the tree, and returning the final accumulated reduction.

### Types
- `Tree :: T`
- `Traversal :: BFS | PRE_ORDER | POST_ORDER`
- `State :: {{isAdded :: Boolean, isVisited :: Boolean, path :: Array<Number>, ...}}` (extensible
 record)
- `TraversalState :: Map<T, State>`
- `Lenses :: {{getLabel :: T -> E, getChildren :: T -> F, constructTree :: ExF -> T}}`
- `Reducer<A, T, TraversalState> :: A -> TraversalState -> T -> A`
- `TraverseSpecs :: {{strategy :: Traversal, seed : A, visit :: Reducer<A, T, TraversalState> }}`

### Other contracts
- a seed **must** be a JSON object or a function returning a constructor (e.g `() => Map`) which 
executed will produce a seed value

### Examples
```ecmascript 6
QUnit.test("main case - reduceTree", function exec_test(assert) {
  const reduceTraverse = assoc("strategy", BFS, traverse);
  const actual = reduceTree(lenses, reduceTraverse, tree);
  const expected = [
    "root",
    "left",
    "middle",
    "right",
    "midleft",
    "midright"
  ];

  assert.deepEqual(actual, expected, `Works!`);
});
```

## forEachInTree :: Lenses -> TraverseSpecs -> Tree -> A
### Description
Traverse a tree according to the parameterized traversal strategy, applying a reducer while 
traversing the tree, and returning the final accumulated reduction. Note that, as the action may 
perform effects, the order of the traversal is particularly relevant.

**NOTE** : the traversal specs require this time an `action` property defining the action to 
execute on each traversed portion of the tree. The same stands for the `strategy` property.

### Types
- `Tree :: T`
- `Traversal :: BFS | PRE_ORDER | POST_ORDER`
- `State :: {{isAdded :: Boolean, isVisited :: Boolean, path :: Array<Number>, ...}}` (extensible
 record)
- `TraversalState :: Map<T, State>`
- `Lenses :: {{getLabel :: T -> E, getChildren :: T -> F, constructTree :: ExF -> T}}`
- `Action :: T -> traversalState -> ()`
- `TraverseSpecs :: {{strategy :: Traversal, action :: Action }}`

### Examples
```ecmascript 6
QUnit.test("main case - forEachInTree", function exec_test(assert) {
  const traces = [];
  const traverse = {
    strategy: POST_ORDER,
    action: (tree, traversalState) => {
      traces.push(traversalState.get(tree))
      traces.push(tree.label)
    }
  }

  forEachInTree(lenses, traverse, tree);
  const actual = traces;
  const expected = [
    {
      "isAdded": true,
      "isVisited": false,
      "path": [
        0,
        0
      ]
    },
    "left",
    {
      "isAdded": true,
      "isVisited": false,
      "path": [
        0,
        1,
        0
      ]
    },
    "midleft",
    {
      "isAdded": true,
      "isVisited": false,
      "path": [
        0,
        1,
        1
      ]
    },
    "midright",
    {
      "isAdded": true,
      "isVisited": true,
      "path": [
        0,
        1
      ]
    },
    "middle",
    {
      "isAdded": true,
      "isVisited": false,
      "path": [
        0,
        2
      ]
    },
    "right",
    {
      "isAdded": true,
      "isVisited": true,
      "path": [
        0
      ]
    },
    "root"
  ];

  assert.deepEqual(actual, expected, `Works!`);
});
```

## mapOverTree :: Lenses -> MapFn -> Tree -> Tree'
### Description 
Traverse a tree, applying a mapping function, while, and returning a tree with the same 
structure, containing the mapped nodes. Order of traversal is irrelevant here, as all nodes of 
the tree are to be traversed, and the mapping function is assumed to be a pure function. Note 
that the `constructTree` lens is mandatory here to rebuild the tree from its nodes.

### Types
- `Tree :: T`
- `Tree' :: T'`
- `Traversal :: BFS | PRE_ORDER | POST_ORDER`
- `State :: {{isAdded :: Boolean, isVisited :: Boolean, path :: Array<Number>, ...}}` (extensible record)
- `TraversalState :: Map<T, State>`
- `Lenses :: {{getLabel :: T -> E, getChildren :: T -> F, constructTree :: ExF -> T}}`
- `MapFn :: E -> E'`

### Examples
```ecmascript 6
QUnit.test("main case - mapOverTree", function exec_test(assert) {
  const getChildren = tree => tree.children || [];
  const getLabel = tree => tree.label || '';
  const constructTree = (label, trees) => ({label, children : trees});
  const mapFn = label => addPrefix('Map:')(label)
  const lenses = { getChildren, constructTree, getLabel };

  const actual = mapOverTree(lenses, mapFn, tree);
  const expected = {
    "children": [
      {
        "children": [],
        "label": "Map:left"
      },
      {
        "children": [
          {
            "children": [],
            "label": "Map:midleft"
          },
          {
            "children": [],
            "label": "Map:midright"
          }
        ],
        "label": "Map:middle"
      },
      {
        "children": [],
        "label": "Map:right"
      }
    ],
    "label": "Map:root"
  };

  assert.deepEqual(actual, expected, `Works!`);
});

```

### Contracts
- `mapFn` must be a pure function. In particular, `mapFn` receives the label (i.e. the structure 
returned by `lenses.getLabel`), and canoot modify in-place this label. This ensures the 
`mapOverTree` function is also pure.

## pruneWhen :: Lenses -> Predicate -> Tree -> Tree
### Description 
Traverse a tree, applying a predicate, which when failed leads to discarding any descendant 
nodes of the node failing that predicate. The failing node itself remains in the result tree. 
 Note that the `constructTree` lens is mandatory here to rebuild the tree from its nodes. Note also 
 that the predicate is passed the traversal state, together with the node. This allows to 
 implement stop conditions by modifying directly the traversal state (adding for instance a 
 `isTraversalStopped` flag).

### Types
- `Tree :: T`
- `State :: {{isAdded :: Boolean, isVisited :: Boolean, path :: Array<Number>, ...}}` (extensible record)
- `TraversalState :: Map<T, State>`
- `Lenses :: {{getLabel :: T -> E, getChildren :: T -> F, constructTree :: ExF -> T}}`
- `Predicate :: T -> TraversalState -> Boolean`

### Examples
```javascript
QUnit.test("main case - pruneWhen", function exec_test(assert) {
  const getChildren = tree => tree.children || [];
  const getLabel = tree => tree.label || '';
  const constructTree = (label, trees) => ({label, children : trees});
  const predicate = (tree, traversalState) => traversalState.get(tree).path.length > 1;
  const lenses = { getChildren, constructTree, getLabel };

  const actual = pruneWhen(lenses, predicate, tree);
  const expected = {
    "children": [
      {
        "children": [],
        "label": "left"
      },
      {
        "children": [],
        "label": "middle"
      },
      {
        "children": [],
        "label": "right"
      }
    ],
    "label": "root"
  };

  assert.deepEqual(actual, expected, `Works!`);
});
```
## visitTree :: ExtendedTraversalSpecs -> Tree -> A
### Description 
This is the generic tree traversal algorithm that all traversals use as their core. 

- The tree is traversed starting from the root, 
- for each traversed node its children are generating traversal tasks, 
- a store is used to keep track of the pending traversal tasks to execute, 
- each task involves the application of a visiting function which builds iteratively the result of
 the traversal, taking inputs from the traversal state, and the traversed node 
- the traversal state includes flags (`isAdded`, `isVisited`) and relevant information (`path`) 
to the traversal
- the traversal state is passed to the `getChildren` lens, and the visitor function, for those 
cases where the traversal tasks to generate, or visits to undertake, depend on the traversal state 
  - that is for instance the case for iterative post-order traversal, where we traverse a parent 
  node twice, but only visit it once, after its children have been visited)
  - that is also the case for incomplete traversals (`pruneWhen`), where we discard traversing 
  and visiting some nodes, based on some predicate 

### Types
- `Tree :: T`
- `Traversal :: BFS | PRE_ORDER | POST_ORDER`
- `EmptyStore :: *`
- `Store :: {{empty :: EmptyStore, add :: [T] -> Store -> (), takeAndRemoveOne :: Store -> 
Maybe<T>, isEmpty :: Store -> Boolean}}`
- `State :: {{isAdded :: Boolean, isVisited :: Boolean, path :: Array<Number>, ...}}` (extensible
 record)
- `TraversalState :: Map<T, State>`
- `Lenses :: {{getLabel :: T -> E, getChildren :: T -> F, constructTree :: ExF -> T}}`
- `Reducer<A, T, TraversalState> :: A -> TraversalState -> T -> A`
- `TraverseSpecs :: {{seed : A, visit :: Reducer<A, T, TraversalState> }}`
- `ExtendedTraversalSpecs :: {{store :: Store, lenses :: Lenses, traverse :: TraverseSpecs}}`

### Other contracts
- an empty store **must** be a JSON object or a function returning a constructor (e.g `() => 
Array`) which executed will produce the `empty` value
- a seed **must** be a JSON object or a function returning a constructor (e.g `() => Map`) which 
executed will produce a seed value

### Examples
Breadth-first traversal requires a stack store...
 
```ecmascript 6
export function breadthFirstTraverseTree(lenses, traverse, tree) {
  const { getChildren } = lenses;
  const traversalSpecs = {
    store: {
      empty: [],
      takeAndRemoveOne: store => store.shift(),
      isEmpty: store => store.length === 0,
      add: (subTrees, store) => store.push.apply(store, subTrees)
    },
    lenses: { getChildren: (traversalState, subTree) => getChildren(subTree) },
    traverse
  };

  return visitTree(traversalSpecs, tree);
}
```

while a depth-first traversal requires a queue store. Additionally, a custom lens adds children 
 nodes for visit only under some conditions corresponding to post-order traversal (i.e. parent 
  must be visited only after children).
  
```ecmascript 6
export function postOrderTraverseTree(lenses, traverse, tree) {
  const { getChildren } = lenses;
  const isLeaf = (tree, traversalState) => getChildren(tree, traversalState).length === 0;
  const { seed, visit } = traverse;
  const predicate = (tree, traversalState) => traversalState.get(tree).isVisited || isLeaf(tree, traversalState)
  const decoratedLenses = {
    // For post-order, add the parent at the end of the children, that simulates the stack for the recursive function
    // call in the recursive post-order traversal algorithm
    getChildren: (traversalState, tree) =>
      predicate(tree, traversalState)
        ? []
        : getChildren(tree, traversalState).concat(tree)
  };
  const traversalSpecs = {
    store: {
      empty: [],
      takeAndRemoveOne: store => store.shift(),
      isEmpty: store => store.length === 0,
      add: (subTrees, store) => store.unshift(...subTrees)
    },
    lenses: decoratedLenses,
    traverse: {
      seed: seed,
      visit: (result, traversalState, tree) => {
        // Cases :
        // 1. label has been visited already : visit
        // 2. label has not been visited, and there are no children : visit
        // 3. label has not been visited, and there are children : don't visit, will do it later
        if (predicate(tree, traversalState)) {
          visit(result, traversalState, tree);
        }

        return result;
      }
    }
  };

  return visitTree(traversalSpecs, tree);
}
```

## switchTreeDataStructure :: Lenses -> Lenses -> Tree
### Description
Allows to convert between concrete tree data structures. Note that for the conversion to be 
possible, the lenses must be very well behaved. It is for instance not always possible to convert
 to an object tree data structure.

### Types
The types have been introduced previously. 

### Other contracts
Good behaviour of the lenses. If you are unsure of your lenses behaviour, try out a few conversions.
If it works for a non-trivial tree, then it will always work.   

### Examples
Cf. tests. 

For instance, this tree :

```javascript
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
```

becomes this equivalent tree :

```javascript
[
    "root",
    [
      "left",
      [
        "middle",
        [
          "midleft",
          "midright"
        ]
      ],
      "right"
    ]
  ]
``` 

It is however impossible to convert any of those tree data structure towards an object tree.

## traverseObj :: ExtendedTraversalSpecs -> Tree -> A
### Description
Allows to traverse an object (POJO), applying a visiting function to every property. Traversal 
strategy can be specified (pre-order, post-order, or breadth-first).
  
### Types
Types are as introduced previously. 

### Other contracts
Old same old.

### Examples
Cf. tests

# Tests
- `npm run test`

# Build
- `npm run build`
- `npm run dist` 

# Install
- `npm fp-rosetree`

# Examples of lenses
## Object traversal
An object can be traversed and mapped over with the following lenses : 

```javascript
export const objectTreeLenses = {
  getLabel: tree => {
    if (typeof tree === 'object' && !Array.isArray(tree) && Object.keys(tree).length === 1) {
      return tree;
    }
    else {
      throw `getLabel > unexpected object tree value`
    }
  },
  getChildren: tree => {
    if (typeof tree === 'object' && !Array.isArray(tree) && Object.keys(tree).length === 1) {
      let value = Object.values(tree)[0];
      if (typeof value === 'object' && !Array.isArray(value)) {
        return Object.keys(value).map(prop => ({ [prop]: value[prop] }))
      }
      else {
        return []
      }
    }
    else {
      throw `getChildren > unexpected value`
    }
  },
  constructTree: (label, children) => {
    const labelKey = Object.keys(label)[0];
    return children.length === 0
      ? label
      : {
      [labelKey]: Object.assign.apply(null, children)
    }
  },
};
```

Cf. tests for examples with mapping over object keys and properties and traversing objects. 

## Hash-stored tree
We mean by hash-stored tree (by lack of a better name) a tree whose content is mapped to its 
location path through a hash map. That is the data structure is : `Record {cursor :: Cursor, hash 
:: HashMap<Cursor, Tree>}`. The cursor is usually a string which allows to point at a specific 
subtree. 

An example of such concrete data structure is as follows :

```javascript
  const hash = {
    "0": "root",
    "0.0": "combinatorName",
    "0.1": "componentName",
    "0.2": "emits",
    "0.3": "id",
    "0.2.0": "identifier",
    "0.2.1": "notification",
    "0.2.2": "type",
    "0.2.1.0": "kind",
    "0.2.1.1": "value",
    "0.2.1.1.0": "key"
  };
  const obj  { cursor : "0", hash};
```

The corresponding lenses would be as follows :

```javascript
  const sep = '.';

  function makeChildCursor(parentCursor, childIndex, sep) {
    return [parentCursor, childIndex].join(sep)
  }

  const lenses = {
    getLabel: tree => {
      const { cursor, hash } = tree;
      return { label: hash[cursor], hash, cursor }
    },
    getChildren: tree => {
      const { cursor, hash } = tree;
      let childIndex = 0;
      let children = [];

      while ( makeChildCursor(cursor, childIndex, sep) in hash ) {
        children.push({ cursor: makeChildCursor(cursor, childIndex, sep), hash })
        childIndex++;
      }

      return children
    },
    constructTree: (label, children) => {
      const { label: value, hash, cursor } = label;

      return {
        cursor: cursor,
        hash: merge(
          children.reduce((acc, child) => merge(acc, child.hash), {}),
          { [cursor]: value }
        )
      }
    },
  };
```

Cf. tests for concrete examples. 

## Array-stored trees
Self-evident from the lenses definitions, a tree is `label || [label, children]` :

```javascript
export const arrayTreeLenses = {
  getLabel: tree => {
    return Array.isArray(tree) ? tree[0] : tree
  },
  getChildren: tree => {
    return Array.isArray(tree) ? tree[1] : []
  },
  constructTree: (label, children) => {
    return children && Array.isArray(children) ? [label, children] : label
  },
}
```

# Conversion
**TODO**
