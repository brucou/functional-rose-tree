import { clone, merge, times } from "ramda";

const PATH_ROOT = [0];
export const POST_ORDER = "POST_ORDER";
export const PRE_ORDER = "PRE_ORDER";
export const BFS = "BFS";

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

export function visitTree(traversalSpecs, tree) {
  const { store, lenses, traverse } = traversalSpecs;
  const { empty, add, takeAndRemoveOne, isEmpty } = store;
  const { getChildren, getLabel, setChildren, setLabel } = lenses;
  const { visit, seed } = traverse;
  const traversalState = new Map();

  // necessary to avoid destructive updates on input parameters
  let currentStore = clone(empty);
  let visitAcc = clone(seed);
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
        const localTraversalState = traversalState.get(tree);
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
 * @param {{getChildren : function, setChildren : function, setLabel : function}} lenses
 * @param {function} mapFn Function to apply to each node.
 * @param tree
 * @returns {*}
 */
export function mapOverTree(lenses, mapFn, tree) {
  const { getChildren, constructTree, getLabel } = lenses;
  const getChildrenNumber = (tree, traversalState) => getChildren(tree, traversalState).length;
  const stringify = path => path.join(".");
  const treeTraveerse = {
    seed: new Map(),
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
  const pathMap = postOrderTraverseTree(lenses, treeTraveerse, tree);
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

/** TODO
 * Future versions
 * find(lenses, predicate, nTimesOrAll, tree) : [Tree], returns an array of N trees which satisfy the predicate
 * findCommonAncestor(lenses, treeA, treeB, rootTree) : tree (whose root is common ancestor node )
 * replaceWhen (lenses, predicate, treeReplacing, treeReplaced) : tree
 * makeZipper (lenses, tree) :
 * checkTreeContracts (tree) : Boolean ; checks the tree contracts :
 * - All trees encountered when travrsing are different entities (referential equality prohibited).
 * - empty tree prohibited i.e. getLabel(tree) cannot throw, getChildren(tree) cannot throw; tree can never be null
 * in traversal
 * - getChildren(setTree(label, children)) = children
 * - getLabel(setTree(label, children)) = label
 */
// DOC:  because this uses Map, every node MUST be a different object. It is easy to be the case for nodes, but less
// obvious for leaves. Leaves MUST all be different object!!!

// TODO : traverseTree, adding concat monoidal function, and monoidal empty
// then store: { empty, add, take, isEmpty}
// then take :: store -> Maybe Tree (maybe, because the store could be empty...)
//      add :: [Tree] -> store -> store, automatically derived from below
//      add :: Tree -> store -> store // NO: use the array form
//      add :: [] -> store -> store (the store is left unchanged)
// T must have getChildrenFn :: Tree -> [] | [Tree], i.e. it is a prism!!
// Tree T :: Leaf T | [Tree T]
// visitFn should be a reducer :: acc -> Tree -> acc'
