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
  // TODO DOC: monoid will have a 0 constructor and + function to accumulate results
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
    // TODO: refactor in one function
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
  // TODO remove traversalStaete from here, where do I need it?
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
  const { getChildren, constructTree, getLabel } = lenses;
  const getChildrenNumber = (tree, traversalState) =>
    getChildren(tree, traversalState).length;
  const stringify = (path) => path.join(SEP);
  const treeTraverse = {
    seed: () => Map,
    visit: (pathMap, traversalState, tree) => {
      const { path } = traversalState.get(tree);
      // Paths are *stringified* because Map with non-primitive objects uses referential equality
      const mappedLabel = mapFn(getLabel(tree));
      const mappedChildren = times(
        (index) => pathMap.get(stringify(path.concat(index))),
        getChildrenNumber(tree, traversalState)
      );
      const mappedTree = constructTree(mappedLabel, mappedChildren);

      pathMap.set(stringify(path), mappedTree);

      return pathMap;
    }
  };
  const pathMap = postOrderTraverseTree(lenses, treeTraverse, tree);
  const mappedTree = pathMap.get(stringify(PATH_ROOT));
  pathMap.clear();

  return mappedTree;
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
// TODO: refactor, the label should be only hash[cursor] and construct tree should overwrite the hash in the children, get the parent from the children's cursor 
// TODO: actually do not overwrite the hash, create a new one, and adjust all the children hash too to that new one, but then what of the children's children??
// TODO: this is probably not a well behaved lens...
// TODO mapOverTree is fine, rather than merging for non-destructive updates, I could just shallow clone the hash before hand, and do the destructive updates in the lens
export function getHashedTreeLenses(sep) {
  function makeChildCursor(parentCursor, childIndex, sep) {
    return [parentCursor, childIndex].join(sep);
  }

  return {
    getLabel: (tree) => {
      const { cursor, hash } = tree;
      return { label: hash[cursor], hash, cursor };
    },
    getChildren: (tree) => {
      const { cursor, hash } = tree;
      let childIndex = 0;
      let children = [];

      while (makeChildCursor(cursor, childIndex, sep) in hash) {
        children.push({
          cursor: makeChildCursor(cursor, childIndex, sep),
          hash
        });
        childIndex++;
      }

      return children;
    },
    constructTree: (label, children) => {
      const { label: value, hash, cursor } = label;

      return {
        cursor: cursor,
        hash: merge(
          children.reduce((acc, child) => merge(acc, child.hash), {}),
          { [cursor]: value }
        )
      };
    }
  };
}

export function mapOverHashTree(sep, mapFn, obj) {
  const lenses = getHashedTreeLenses(sep);

  return mapOverTree(
    lenses,
    ({ label, hash, cursor }) => ({
      label: mapFn(label),
      hash,
      cursor
    }),
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

// TODO: correct the test with postorder first!! then try to understand why it fails

// TODO:
// - get at (index) returns a maybe - define a symbol for Nothing
// - set at: update upwards the references, not on the side. Useful for diffing which parts of the tree changed
// - find (requires label equality function, returns the first one only, returns the index + tree, requires traversal strategy, be careful with postorder as some nodes are visied twice...)
// - findAll (returns all of them, meaning traverses the whole tree)
// - how to have findAll + set at in one single pass??
