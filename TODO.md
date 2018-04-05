- remove dependency on ramda
- build with rollup

# Roadmap
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
