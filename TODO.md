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
 * understand what makes convert fails (difference between what is label between data structures?)
 */
