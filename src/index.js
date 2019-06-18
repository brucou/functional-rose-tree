const PATH_ROOT = [0];
export const POST_ORDER = "POST_ORDER";
export const PRE_ORDER = "PRE_ORDER";
export const BFS = "BFS";
export const SEP = ".";

///// Utility functions
// Cheap cloning, which is enough for our needs : we only clone seeds and empty values, which are generally simple
// objects
function clone(a) {
  return a === undefined ? undefined : JSON.parse(JSON.stringify(a))
}

function merge(objA, objB) {
  return Object.assign({}, objA, objB);
}

function times(fn, n) {
  return Array.apply(null, { length: n }).map(Number.call, Number).map(fn)
}

const stringify = path => path.join(SEP);

/**
 *
 * @param {Map} traversalState
 * @param subTree
 * @param {Array} subTreeChildren
 * @modifies {traversalState}
 */
function updatePathInTraversalState(traversalState, subTree, subTreeChildren) {
  subTreeChildren.forEach((subTreeChild, index) => {
    const traversalStateParent = traversalState.get(subTree);
    // NOTE : if the path is already set we do not modify it. This allows for post-order traversal, which puts back
    // the parent node into the children nodes to keep the original path for the parent node. So at any time, the
    // `path` value can be trusted to be accurately describing the location of the node in the tree
    const traversalStateChild = traversalState.get(subTreeChild);
    const currentChildPath = traversalStateChild && traversalStateChild.path;

    traversalState.set(
      subTreeChild,
      merge(traversalStateChild, {
        isAdded: true,
        isVisited: false,
        path: currentChildPath || traversalStateParent.path.concat(index)
      })
    );
  });
}

/**
 *
 * @param {Map} traversalState
 * @param tree
 * @modifies {traversalState}
 */
function updateVisitInTraversalState(traversalState, tree) {
  traversalState.set(
    tree,
    merge(traversalState.get(tree), { isVisited: true })
  );
}

///// Core API
export function visitTree(traversalSpecs, tree) {
  const { store, lenses, traverse } = traversalSpecs;
  const { empty: emptyOrEmptyConstructor, add, takeAndRemoveOne, isEmpty } = store;
  const { getChildren } = lenses;
  const { visit, seed: seedOrSeedConstructor } = traverse;
  const traversalState = new Map();
  // NOTE : This allows to have seeds which are non-JSON objects, such as new Map(). We force a new here to make
  // sure we have an object that cannot be modified out of the scope of visitTree and collaborators
  const seed = (typeof seedOrSeedConstructor === 'function') ? new (seedOrSeedConstructor()) : clone(seedOrSeedConstructor);
  const empty = (typeof emptyOrEmptyConstructor === 'function') ? new (emptyOrEmptyConstructor()) : clone(emptyOrEmptyConstructor);

  let currentStore = empty;
  let visitAcc = seed;
  add([tree], currentStore);
  traversalState.set(tree, { isAdded: true, isVisited: false, path: PATH_ROOT });

  while ( !isEmpty(currentStore) ) {
    const subTree = takeAndRemoveOne(currentStore);
    const subTreeChildren = getChildren(traversalState, subTree);

    add(subTreeChildren, currentStore);
    updatePathInTraversalState(traversalState, subTree, subTreeChildren);
    visitAcc = visit(visitAcc, traversalState, subTree);
    updateVisitInTraversalState(traversalState, subTree);
  }

  // Free the references to the tree/subtrees
  traversalState.clear();

  return visitAcc;
}

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

export function preorderTraverseTree(lenses, traverse, tree) {
  const { getChildren } = lenses;
  const traversalSpecs = {
    store: {
      empty: [],
      takeAndRemoveOne: store => store.shift(),
      isEmpty: store => store.length === 0,
      // NOTE : vs. bfs, only `add` changes
      add: (subTrees, store) => store.unshift(...subTrees)
    },
    lenses: { getChildren: (traversalState, subTree) => getChildren(subTree) },
    traverse
  };

  return visitTree(traversalSpecs, tree);
}

export function postOrderTraverseTree(lenses, traverse, tree) {
  const { getChildren } = lenses;
  const isLeaf = (tree, traversalState) => getChildren(tree, traversalState).length === 0;
  const { seed, visit } = traverse;
  const predicate = (tree, traversalState) => traversalState.get(tree).isVisited || isLeaf(tree, traversalState)
  const decoratedLenses = {
    // For post-order, add the parent at the end of the children, that simulates the stack for the recursive function
    // call in the recursive post-order traversal algorithm
    // DOC : getChildren(tree, traversalState) also admit traversalState as argumnets but in second place
    getChildren: (traversalState, tree) =>
      predicate(tree, traversalState)
        ? []
        : getChildren(tree, traversalState).concat([tree])
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
        return predicate(tree, traversalState)
        ? visit(result, traversalState, tree)
          : result
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

  const treeTraveerse = {
    seed: void 0,
    visit: (accumulator, traversalState, tree) => action(tree, traversalState)
  };
  return strategies[strategy](lenses, treeTraveerse, tree);
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
  const getChildrenNumber = (tree, traversalState) => getChildren(tree, traversalState).length;
  const stringify = path => path.join(SEP);
  const treeTraverse = {
    seed: () => Map,
    visit: (pathMap, traversalState, tree) => {
      const { path } = traversalState.get(tree);
      // Paths are *stringified* because Map with non-primitive objects uses referential equality
      const mappedLabel = mapFn(getLabel(tree));
      const mappedChildren = times(
        index => pathMap.get(stringify(path.concat(index))), getChildrenNumber(tree, traversalState));
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
        return []
      }
      else {
        return getChildren(tree, traversalState)
      }
    }
  });
  const prunedTree = mapOverTree(pruneLenses, x => x, tree);

  return prunedTree
}

// Examples of lenses

// HashedTreeLenses
export function getHashedTreeLenses(sep) {
  function makeChildCursor(parentCursor, childIndex, sep) {
    return [parentCursor, childIndex].join(sep)
  }

  return {
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
}

export function mapOverHashTree(sep, mapFn, obj) {
  const lenses = getHashedTreeLenses(sep);

  return mapOverTree(lenses, ({ label, hash, cursor }) => ({
    label: mapFn(label), hash, cursor
  }), obj);
}

// Object as a tree
function isLeafLabel(label) {
  return objectTreeLenses.getChildren(label).length === 0
}

export const objectTreeLenses = {
  isLeafLabel,
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
      if (value && typeof value === 'object' && !Array.isArray(value)) {
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
    const labelKey = label && Object.keys(label) && Object.keys(label)[0];

    return children.length === 0
      ? label
      : {
      [labelKey]: Object.assign.apply(null, children)
    }
  },
};

export function mapOverObj({ key: mapKeyfn, leafValue: mapValuefn }, obj) {
  const rootKey = 'root';
  const rootKeyMap = mapKeyfn(rootKey);

  const mapped =  mapOverTree(objectTreeLenses, (tree) => {
    const key = Object.keys(tree)[0];
    const value = tree[key];

    return {
      [mapKeyfn(key)]: isLeafLabel(objectTreeLenses.getLabel(tree)) && !isEmptyObject(value)
        ? mapValuefn(value)
        : value
    }
  }, { root: obj });

  return mapped[rootKeyMap];
}

export function traverseObj(traverse, obj){
  const treeObj = {root : obj};
  const {strategy, seed, visit} = traverse;
  const traverseFn = {
    BFS : breadthFirstTraverseTree,
    PRE_ORDER : preorderTraverseTree,
    POST_ORDER: postOrderTraverseTree
  }[strategy] || preorderTraverseTree;
  const decoratedTraverse = {
    seed,
    visit : function visitAllButRoot(visitAcc, traversalState, tree){
      const {path} = traversalState.get(tree);

      return JSON.stringify(path)=== JSON.stringify(PATH_ROOT)
      ? visitAcc
        : visit(visitAcc, traversalState, tree)
    }
  };

  const traversedTreeObj = traverseFn(objectTreeLenses, decoratedTraverse, treeObj);

  return traversedTreeObj
}

function isEmptyObject(obj) {
  return obj && Object.keys(obj).length === 0 && obj.constructor === Object
}

// Arrays as trees
export const arrayTreeLenses = {
  getLabel: tree => {
    return Array.isArray(tree) ? tree[0] : tree
  },
  getChildren: tree => {
    return Array.isArray(tree)  ? tree[1] : []
  },
  constructTree: (label, children) => {
    return children && Array.isArray(children) && children.length > 0 ? [label, children] : label
  },
}

// Conversion
export function switchTreeDataStructure(originLenses, targetLenses, tree) {
  const { getLabel, getChildren } = originLenses;
  const { constructTree } = targetLenses;
  const getChildrenNumber = (tree, traversalState) => getChildren(tree, traversalState).length;

  const traverse = {
    seed: () => Map,
    visit: (pathMap, traversalState, tree) => {
      const { path } = traversalState.get(tree);
      const label = getLabel(tree);
      const children = times(
        index => pathMap.get(stringify(path.concat(index))),
        getChildrenNumber(tree, traversalState)
      );
      pathMap.set(stringify(path), constructTree(label, children));

      return pathMap;
    }
  };

  const newTreeStruct = postOrderTraverseTree(originLenses, traverse, tree);
  return newTreeStruct.get(stringify(PATH_ROOT));
}
