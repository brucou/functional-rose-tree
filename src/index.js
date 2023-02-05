const PATH_ROOT = [0];
export const POST_ORDER = "POST_ORDER";
export const PRE_ORDER = "PRE_ORDER";
export const BFS = "BFS";
export const SEP = ".";
export const emptyArray = [];

///// Utility functions
// Cheap cloning, which is enough for our needs : we only clone seeds and empty values, which are generally simple
// objects
function clone(a) {
  return a === undefined ? undefined : JSON.parse(JSON.stringify(a));
}

function merge(objA, objB) {
  return Object.assign({}, objA, objB);
}

function times(fn, n) {
  return Array.apply(null, { length: n }).map(Number.call, Number).map(fn);
}

const stringify = (path) => path.join(SEP);

/**
 *
 * @param {Map} traversalState
 * @param subTree
 * @param {Array} subTreeChildren
 * @modifies {traversalState}
 */
function updateTraversalState(traversalState, subTree, subTreeChildren) {
  const traversalStateParent = traversalState.get(subTree) || {} ;
  const parentPath = traversalStateParent.path;

  subTreeChildren.forEach((subTreeChild, index) => {
    const traversalStateChild = traversalState.get(subTreeChild);
    const currentChildPath = traversalStateChild && traversalStateChild.path || parentPath.concat(index);

    traversalState.set(
      subTree,
      merge(traversalStateParent, { isVisited: true })
    );
  
    traversalState.set(
      subTreeChild,
      // Because there is no guarantee of how many times and in which order trees will be visited,
      // we pay special care to idempotence (path and visit flag). Once initialized, those values 
      // cannot change on subsequent calls. 
      // Post-order traversals specifically depend on that (some trees may be processed twice).
      merge(traversalStateChild, {
        isVisited: Boolean(traversalStateChild && traversalStateChild.isVisited),
        path: currentChildPath 
      })
    );

    // TODO DOC: add indices to docs
    traversalState.set("indices", traversalState.get("indices").set(currentChildPath.join("."), subTreeChild));
  });
}

///// Core API
export function visitTree(traversalSpecs, tree) {
  debugger
  const { store, lenses, traverse } = traversalSpecs;
  const {
    // TODO: it is a function now, so review all tests! which leads to review all impl. 
    empty: storeEmpty,
    add,
    takeAndRemoveOne,
    isEmpty
  } = store;
  const { getChildren, getLabel } = lenses;
  // TODO DOC: finalize will run at the end of the traversal and can be used to rebuild a tree posttraversal (tree -> tree) or do nothing (fold)
  const { visit, accumulator, finalize } = traverse;
  const traversalState = new Map();
  // Accumulator is a monoid, with init = 0, accumulate = +
  const {empty, accumulate} = accumulator;

  let currentStore = storeEmpty();
  let visitAcc = empty();

  add([tree], currentStore);
  traversalState.set(tree, {
    isVisited: false,
    path: PATH_ROOT,
  });
  traversalState.set("indices", new Map().set(PATH_ROOT.toString(), tree));

  while (!isEmpty(currentStore)) {
    // Get a tree from the store
    const subTree = takeAndRemoveOne(currentStore);
    const subTreeChildren = getChildren(subTree);
    const subTreeLabel = getLabel(subTree);

    // TODO DOC: visit can alter the chlidren (generally remove) if necessary (like with pruneWhen)
    const { value, children } = visit(traversalState, subTreeLabel, subTreeChildren, subTree);
    updateTraversalState(traversalState, subTree, children);
    visitAcc = accumulate(visitAcc, value);

    // Add the children to the store for further iteration
    // TODO: update signature and doc for add function
    // TODO: then refactor to have the subTree as second argument?
    add(children, currentStore, traversalState, subTree);
  }

  // Compute the final result
  const result = finalize(visitAcc, traversalState);

  // Free the references to the tree/subtrees
  traversalState.clear();

  return result;
}

export function breadthFirstTraverseTree(lenses, traverse, tree) {
  const traversalSpecs = {
    store: {
      empty: () => [],
      takeAndRemoveOne: (store) => store.shift(),
      isEmpty: (store) => store.length === 0,
      add: (subTrees, store) => store.push.apply(store, subTrees)
    },
    lenses,
    traverse
  };

  return visitTree(traversalSpecs, tree);
}

export function preorderTraverseTree(lenses, traverse, tree) {
  const traversalSpecs = {
    store: {
      empty: () => [],
      takeAndRemoveOne: (store) => store.shift(),
      isEmpty: (store) => store.length === 0,
      // NOTE : vs. bfs, only `add` changes
      add: (subTrees, store) => store.unshift(...subTrees)
    },
    lenses,
    traverse
  };

  return visitTree(traversalSpecs, tree);
}

// TODO DOC: cannot short circuit node traversal when using postOrder, as it goes bottom up, it is too late to remove children, or even add children
export function postOrderTraverseTree(lenses, traverse, tree) {
  const { getChildren } = lenses;
  const isLeaf = tree => getChildren(tree).length === 0;
  const predicate = (tree, traversalState) => traversalState.get(tree).isVisited || isLeaf(tree);
  const { accumulator, visit, finalize } = traverse;

  const traversalSpecs = {
    store: {
      empty: () => [],
      takeAndRemoveOne: store => store.shift(),
      isEmpty: store => store.length === 0,
      add: (items, store) => store.unshift(...items)
    },
    lenses,
    traverse: {
      accumulator,
      finalize,
      visit: (traversalState, treeLabel, treeChildren, tree) => {
        // Cases :
        // 1. tree has been visited already by library: run user-provided visit
        // 2. tree is a leaf: visit
        // 3. tree has children and has not been visited yet by library: don't run user-provided visit
        //    Because that tree will be added after its children, it will appear a second time
        if (predicate(tree, traversalState)) {
          return {
            value: visit(traversalState, treeLabel, treeChildren, tree).value,
            children: []
          }
        }
        else {
          return {
            value: accumulator.empty(),
            children: treeChildren.concat([tree])
          }
        }
      }
    }
  };

  return visitTree(traversalSpecs, tree);
}

/**
 *
 * @param {{getChildren : function}} lenses
 * @param {{strategy : *, seed : *, visit : function}} traverse
 * @param tree
 * @returns {*}
 */
export function reduceTree(lenses, traverse, tree) {
  const strategy = traverse.strategy;
  const strategies = {
    BFS: breadthFirstTraverseTree,
    PRE_ORDER: preorderTraverseTree,
    POST_ORDER: postOrderTraverseTree
  };

  if (!(strategy in strategies)) throw `Unknown tree traversal strategy!`;

  return strategies[strategy](lenses, traverse, tree);
}

/**
 * Applies a function to every node of a tree. Note that the traversal strategy does matter, as the function to
 * apply might perform effects.
 * @param {{getChildren : function}} lenses
 * @param {{strategy : *, action : function}} traverse
 * @param tree
 * @returns {*}
 */
export function forEachInTree(lenses, traverse, tree) {
  const { strategy, action } = traverse;

  const strategies = {
    [BFS]: breadthFirstTraverseTree,
    [PRE_ORDER]: preorderTraverseTree,
    [POST_ORDER]: postOrderTraverseTree
  };

  if (!(strategy in strategies)) throw `Unknown tree traversal strategy!`;

  const treeTraverse = {
    empty: () => void 0,
    accumulator: {
      empty: () => emptyArray, 
      accumulate: (a,b) => a.concat(b == emptyArray ? [] : [b])
    },
      finalize: x => x,
    visit: (traversalState, treeLabel, treeChildren, tree) => {
      action(tree, traversalState);
      return {value: emptyArray, children:treeChildren}
    }
  };
  return strategies[strategy](lenses, treeTraverse, tree);
}

/**
 * Applies a function to every node of a tree, while keeping the tree structure. Note that the traversal strategy in
 * that case does not matter, as all nodes will be traversed anyway, and the function to apply is assumed to be a
 * pure function.
 * @param {{getChildren : function, getLabel : function, constructTree: function}} lenses
 * @param {function} mapFn Function to apply to each node.
 * @param tree
 * @returns {*}
 */
export function mapOverTree(lenses, mapFn, tree) {
  const { constructTree } = lenses;
  const stringify = (path) => path.join(SEP);
  const zeroMap = {}; // !!! this map object serves also as zero for the accumulator
  const treeTraverse = {
    accumulator: {
      empty: () => zeroMap,
      accumulate: (map, b) => {
        debugger
        if (b == zeroMap) return map
        const {index: parentIndex, mappedLabel, childrenNumber: n} = b;
        const mappedChildren = times(
          childIndex => map[stringify([parentIndex, childIndex])],
          n
        );
        const mappedTree = constructTree(mappedLabel, mappedChildren);
        map[parentIndex] = mappedTree;
        return map
      }
    },
    visit: (traversalState, treeLabel, treeChildren, tree) => {
      const { path } = traversalState.get(tree);
      // Paths are *stringified* because Map with non-primitive objects uses referential equality
      const mappedLabel = mapFn(treeLabel);

      return { 
        value: { 
          index: stringify(path), 
          mappedLabel, 
          childrenNumber: treeChildren.length 
        }, 
        children: treeChildren 
      };
    },
    // At the end of the accumulation, the root contains the whole reconstructed tree
    finalize: map => map[PATH_ROOT]
  };
  
  // We reconstruct the tree bottom up so we need a post order traversal
  return postOrderTraverseTree(lenses, treeTraverse, tree);
}

/**
 * Returns a tree where all children of nodes which fails a predicate are pruned. Note that the node failing the
 * predicate will remain in the tree : only the children will be pruned. If it is wanted to prune also the failing
 * node in addition to its children, the `getChildren` function can make use of the second parameter
 * `traversalState` to do so
 * @param lenses
 * @param {function} predicate
 * @param tree
 * @returns tree
 */
export function pruneWhen(lenses, predicate, tree) {
  // As we need to return a tree, it will be convenient to use mapOverTree
  const { getChildren } = lenses;
  const pruneLenses = merge(lenses, {
    getChildren: (tree, traversalState) => {
      if (predicate(tree, traversalState)) {
        // prune that branch
        return [];
      } else {
        // TODO remove traversalState from here but change the pruneWhen test too
        // we should prune on label not on tree structure
        // TODO: change the doc too
        return getChildren(tree, traversalState);
      }
    }
  });
  const prunedTree = mapOverTree(pruneLenses, (x) => x, tree);

  return prunedTree;
}

// Examples of lenses

// HashedTreeLenses
// Concrete shape:
// const index = "0";
// const indices = {
//   "0": "root",
//   "0.0": "combinatorName",
//   "0.1": "componentName",
//   "0.2": "emits",
//   "0.3": "id",
//   "0.2.0": "identifier",
//   "0.2.1": "notification",
// };
// {index, indices}:: {indices:: Object String *, index:: String}
export function getHashedTreeLenses(sep) {
  function destructureHashTreeLabel(label){
    return {
      index: Object.keys(label)[0],
      value: Object.values(label)[0]
    }
  }

  function makeChildIndex(parentCursor, childIndex, sep) {
    return [parentCursor, childIndex].join(sep);
  }

  function makeParentIndex(childIndex, sep){
    const indexSequence = childIndex.split(sep); 
    return indexSequence.length <= 1
    ? void 0 // no parent - either the cursor is already at the root (length = 1) or malformed input
    : indexSequence.slice(0, -1).join(sep);
  }

  return {
// Label: {[index]: value} where value is indices.at(index)
// Both values are necessary to build a parent tree from its children.
// When looking at a leaf, we need to know the index/path that corresponds to the leaf in the tree
// We then know the index/path for the parent
getLabel: (tree) => {
      const { index, indices } = tree;
      return {[index]: indices[index]};
    },
    getChildren: (tree) => {
      const { index: parentIndex, indices } = tree;
      let childIndex = 0;
      let children = [];

      while (makeChildIndex(parentIndex, childIndex, sep) in indices) {
        children.push({
          index: makeChildIndex(parentIndex, childIndex, sep),
          indices
        });
        childIndex++;
      }

      return children;
    },
constructTree: (label, children) => {
      const { index, value } = destructureHashTreeLabel(label);

      if (children.length === 0) {
        return {
          index,
          indices: {[index]: value}
        }
      }

      const parentIndexFirstChild = makeParentIndex(children[0].index, sep);
      if (children.some(child => makeParentIndex(child.index, sep)!== parentIndexFirstChild)){
        throw `Invariant not fulfilled: all children must have an index derived from the same parent index!/n Children indices: ${children.reduce((acc, c) => [acc, c.index].join("; "),"")}`
      }

// Property:
// - For any tree, `indices` from parent include `indices` from children for every child
// Hence, when applying post order traversal to reconstruct the tree, taking the reconstructed root
// will have the totality of the information stored in the children
const indices = children.reduce((indices, child) => {
        const { indices: childIndices } = child;
        Object.assign(indices, childIndices);
        return indices
      }, {});

      indices[parentIndexFirstChild] = value;

      return {
        index,
        indices
      }
    }
  };
}

export function mapOverHashTree(sep, mapFn, obj) {
  const lenses = getHashedTreeLenses(sep);

  // I need to change the visit to store the mapped tree in traversal state not in visitAcc to which I don't access to in `visit`
  // So I need my own visit here, not the visit of mapOverTree?

  return mapOverTree(
    lenses,
    (obj) => ({[Object.keys(obj)[0]]: mapFn(Object.values(obj)[0])}),
    obj
  );
}

// Object as a tree
function isLeafLabel(label) {
  return objectTreeLenses.getChildren(label).length === 0;
}

export const objectTreeLenses = {
  isLeafLabel,
  getLabel: (tree) => {
    if (
      typeof tree === "object" &&
      !Array.isArray(tree) &&
      Object.keys(tree).length === 1
    ) {
      return tree;
    } else {
      throw `getLabel > unexpected object tree value`;
    }
  },
  getChildren: (tree) => {
    if (
      typeof tree === "object" &&
      !Array.isArray(tree) &&
      Object.keys(tree).length === 1
    ) {
      let value = Object.values(tree)[0];
      if (value && typeof value === "object" && !Array.isArray(value)) {
        return Object.keys(value).map((prop) => ({ [prop]: value[prop] }));
      } else {
        return [];
      }
    } else {
      throw `getChildren > unexpected value`;
    }
  },
  constructTree: (label, children) => {
    const labelKey = label && Object.keys(label) && Object.keys(label)[0];

    return children.length === 0
      ? label
      : {
        [labelKey]: Object.assign.apply(null, children)
      };
  }
};

export function mapOverObj({ key: mapKeyfn, leafValue: mapValuefn }, obj) {
  const rootKey = "root";
  const rootKeyMap = mapKeyfn(rootKey);

  const mapped = mapOverTree(
    objectTreeLenses,
    (tree) => {
      const key = Object.keys(tree)[0];
      const value = tree[key];

      return {
        [mapKeyfn(key)]:
          isLeafLabel(objectTreeLenses.getLabel(tree)) && !isEmptyObject(value)
            ? mapValuefn(value)
            : value
      };
    },
    { root: obj }
  );

  return mapped[rootKeyMap];
}

export function traverseObj(traverse, obj) {
  const treeObj = { root: obj };
  const { strategy, visit, accumulator, finalize } = traverse;
  const traverseFn =
    {
      BFS: breadthFirstTraverseTree,
      PRE_ORDER: preorderTraverseTree,
      POST_ORDER: postOrderTraverseTree
    }[strategy] || preorderTraverseTree;
  const decoratedTraverse = {
    accumulator,
    finalize,
    visit: function visitAllButRoot(traversalState, treeLabel, treeChildren, tree) {
      const { path } = traversalState.get(tree);

      return JSON.stringify(path) === JSON.stringify(PATH_ROOT)
        ? {value: accumulator.empty(), children: treeChildren}
        : visit(traversalState, treeLabel, treeChildren, tree);
    }
  };

  const traversedTreeObj = traverseFn(
    objectTreeLenses,
    decoratedTraverse,
    treeObj
  );

  return traversedTreeObj;
}

function isEmptyObject(obj) {
  return obj && Object.keys(obj).length === 0 && obj.constructor === Object;
}

// Arrays as trees
export const arrayTreeLenses = {
  getLabel: (tree) => {
    return Array.isArray(tree) ? tree[0] : tree;
  },
  getChildren: (tree) => {
    return Array.isArray(tree) ? tree[1] : [];
  },
  constructTree: (label, children) => {
    return children && Array.isArray(children) && children.length > 0
      ? [label, children]
      : label;
  }
};

// Conversion
export function switchTreeDataStructure(originLenses, targetLenses, tree) {
  const { getLabel, getChildren } = originLenses;
  const { constructTree } = targetLenses;
  const getChildrenNumber = (tree, traversalState) =>
    getChildren(tree, traversalState).length;

  const traverse = {
    seed: () => Map,
    visit: (pathMap, traversalState, tree) => {
      const { path } = traversalState.get(tree);
      const label = getLabel(tree);
      const children = times(
        (index) => pathMap.get(stringify(path.concat(index))),
        getChildrenNumber(tree, traversalState)
      );
      pathMap.set(stringify(path), constructTree(label, children));

      return pathMap;
    }
  };

  const newTreeStruct = postOrderTraverseTree(originLenses, traverse, tree);
  return newTreeStruct.get(stringify(PATH_ROOT));
}

// const tree = {
//   label: 40,
//   children: [
//     {
//       label: 30,
//       children: [
//         { label: 25, children: [{ label: 15 }, { label: 28 }] },
//         { label: 35 }
//       ]
//     },
//     {
//       label: 50,
//       children: [
//         { label: 45 },
//         { label: 60, children: [{ label: 55 }, { label: 70 }] }
//       ]
//     }
//   ]
// };
// const lenses = {
//   getLabel: (tree) => tree.label,
//   getChildren: (tree) => tree.children || [],
//   constructTree: (label, children) => ({ label, children })
// };
// const traverse = {
//   accumulator: {
//     empty: () => [], 
//     accumulate: (a, b) => a ? a.concat([b]) : [b]
//   },
//   visit: (traversalState, subTreeLabel, subTreeChildren) => {
//     return {
//       value: subTreeLabel,
//       children: subTreeChildren
//       }
//   },
//   finalize: x => x
// };

// const actual = postOrderTraverseTree(lenses, traverse, tree);
// console.log(actual);

// TODO:
// - get at (index) returns a maybe - define a symbol for Nothing
// - set at: update upwards the references, not on the side. Useful for diffing which parts of the tree changed
// - find (requires label equality function, returns the first one only, returns the index + tree, requires traversal strategy, be careful with postorder as some nodes are visied twice...)
// - findAll (returns all of them, meaning traverses the whole tree)
// - how to have findAll + set at in one single pass??
