// modules are defined as an array
// [ module function, map of requires ]
//
// map of requires is short require name -> numeric require
//
// anything defined in a previous bundle is accessed via the
// orig method which is the require for previous bundles

// eslint-disable-next-line no-global-assign
parcelRequire = (function (modules, cache, entry) {
  // Save the require from previous bundle to this closure if any
  var previousRequire = typeof parcelRequire === 'function' && parcelRequire;
  var nodeRequire = typeof require === 'function' && require;

  function newRequire(name, jumped) {
    if (!cache[name]) {
      if (!modules[name]) {
        // if we cannot find the module within our internal map or
        // cache jump to the current global require ie. the last bundle
        // that was added to the page.
        var currentRequire = typeof parcelRequire === 'function' && parcelRequire;
        if (!jumped && currentRequire) {
          return currentRequire(name, true);
        }

        // If there are other bundles on this page the require from the
        // previous one is saved to 'previousRequire'. Repeat this as
        // many times as there are bundles until the module is found or
        // we exhaust the require chain.
        if (previousRequire) {
          return previousRequire(name, true);
        }

        // Try the node require function if it exists.
        if (nodeRequire && typeof name === 'string') {
          return nodeRequire(name);
        }

        var err = new Error('Cannot find module \'' + name + '\'');
        err.code = 'MODULE_NOT_FOUND';
        throw err;
      }

      localRequire.resolve = resolve;

      var module = cache[name] = new newRequire.Module(name);

      modules[name][0].call(module.exports, localRequire, module, module.exports);
    }

    return cache[name].exports;

    function localRequire(x){
      return newRequire(localRequire.resolve(x));
    }

    function resolve(x){
      return modules[name][1][x] || x;
    }
  }

  function Module(moduleName) {
    this.id = moduleName;
    this.bundle = newRequire;
    this.exports = {};
  }

  newRequire.isParcelRequire = true;
  newRequire.Module = Module;
  newRequire.modules = modules;
  newRequire.cache = cache;
  newRequire.parent = previousRequire;

  for (var i = 0; i < entry.length; i++) {
    newRequire(entry[i]);
  }

  // Override the current require with this new one
  return newRequire;
})({1:[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.visitTree = visitTree;
exports.breadthFirstTraverseTree = breadthFirstTraverseTree;
exports.preorderTraverseTree = preorderTraverseTree;
exports.postOrderTraverseTree = postOrderTraverseTree;
exports.reduceTree = reduceTree;
exports.forEachInTree = forEachInTree;
exports.mapOverTree = mapOverTree;
exports.pruneWhen = pruneWhen;

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var PATH_ROOT = [0];
var POST_ORDER = exports.POST_ORDER = "POST_ORDER";
var PRE_ORDER = exports.PRE_ORDER = "PRE_ORDER";
var BFS = exports.BFS = "BFS";

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

/**
 *
 * @param {Map} traversalState
 * @param subTree
 * @param {Array} subTreeChildren
 * @modifies {traversalState}
 */
function updatePathInTraversalState(traversalState, subTree, subTreeChildren) {
  subTreeChildren.forEach(function (subTreeChild, index) {
    var traversalStateParent = traversalState.get(subTree);
    // NOTE : if the path is already set we do not modify it. This allows for post-order traversal, which puts back
    // the parent node into the children nodes to keep the original path for the parent node. So at any time, the
    // `path` value can be trusted to be accurately describing the location of the node in the tree
    var traversalStateChild = traversalState.get(subTreeChild);
    var currentChildPath = traversalStateChild && traversalStateChild.path;

    traversalState.set(subTreeChild, merge(traversalStateChild, {
      isAdded: true,
      isVisited: false,
      path: currentChildPath || traversalStateParent.path.concat(index)
    }));
  });
}

/**
 *
 * @param {Map} traversalState
 * @param tree
 * @modifies {traversalState}
 */
function updateVisitInTraversalState(traversalState, tree) {
  traversalState.set(tree, merge(traversalState.get(tree), { isVisited: true }));
}

///// Core API
function visitTree(traversalSpecs, tree) {
  var store = traversalSpecs.store,
      lenses = traversalSpecs.lenses,
      traverse = traversalSpecs.traverse;
  var emptyOrEmptyConstructor = store.empty,
      add = store.add,
      takeAndRemoveOne = store.takeAndRemoveOne,
      isEmpty = store.isEmpty;
  var getChildren = lenses.getChildren,
      getLabel = lenses.getLabel,
      setTree = lenses.setTree;
  var visit = traverse.visit,
      seedOrSeedConstructor = traverse.seed;

  var traversalState = new Map();
  // NOTE : This allows to have seeds which are non-JSON objects, such as new Map(). We force a new here to make
  // sure we have an object that cannot be modified out of the scope of visitTree and collaborators
  var seed = typeof seedOrSeedConstructor === 'function' ? new (seedOrSeedConstructor())() : clone(seedOrSeedConstructor);
  var empty = typeof emptyOrEmptyConstructor === 'function' ? new (emptyOrEmptyConstructor())() : clone(emptyOrEmptyConstructor);

  // necessary to avoid destructive updates on input parameters
  var currentStore = empty;
  var visitAcc = seed;
  add([tree], currentStore);
  traversalState.set(tree, { isAdded: true, isVisited: false, path: PATH_ROOT });

  while (!isEmpty(currentStore)) {
    var subTree = takeAndRemoveOne(currentStore);
    var subTreeChildren = getChildren(traversalState, subTree);

    add(subTreeChildren, currentStore);
    updatePathInTraversalState(traversalState, subTree, subTreeChildren);
    visitAcc = visit(visitAcc, traversalState, subTree);
    updateVisitInTraversalState(traversalState, subTree);
  }

  // Free the references to the tree/subtrees
  traversalState.clear();

  return visitAcc;
}

function breadthFirstTraverseTree(lenses, traverse, tree) {
  var _getChildren = lenses.getChildren;

  var traversalSpecs = {
    store: {
      empty: [],
      takeAndRemoveOne: function takeAndRemoveOne(store) {
        return store.shift();
      },
      isEmpty: function isEmpty(store) {
        return store.length === 0;
      },
      add: function add(subTrees, store) {
        return store.push.apply(store, subTrees);
      }
    },
    lenses: { getChildren: function getChildren(traversalState, subTree) {
        return _getChildren(subTree);
      } },
    traverse: traverse
  };

  return visitTree(traversalSpecs, tree);
}

function preorderTraverseTree(lenses, traverse, tree) {
  var _getChildren2 = lenses.getChildren;

  var traversalSpecs = {
    store: {
      empty: [],
      takeAndRemoveOne: function takeAndRemoveOne(store) {
        return store.shift();
      },
      isEmpty: function isEmpty(store) {
        return store.length === 0;
      },
      // NOTE : vs. bfs, only `add` changes
      add: function add(subTrees, store) {
        return store.unshift.apply(store, _toConsumableArray(subTrees));
      }
    },
    lenses: { getChildren: function getChildren(traversalState, subTree) {
        return _getChildren2(subTree);
      } },
    traverse: traverse
  };

  return visitTree(traversalSpecs, tree);
}

function postOrderTraverseTree(lenses, traverse, tree) {
  var _getChildren3 = lenses.getChildren;

  var isLeaf = function isLeaf(tree, traversalState) {
    return _getChildren3(tree, traversalState).length === 0;
  };
  var seed = traverse.seed,
      _visit = traverse.visit;

  var predicate = function predicate(tree, traversalState) {
    return traversalState.get(tree).isVisited || isLeaf(tree, traversalState);
  };
  var decoratedLenses = {
    // For post-order, add the parent at the end of the children, that simulates the stack for the recursive function
    // call in the recursive post-order traversal algorithm
    // DOC : getChildren(tree, traversalState) also admit traversalState as argumnets but in second place
    getChildren: function getChildren(traversalState, tree) {
      return predicate(tree, traversalState) ? [] : _getChildren3(tree, traversalState).concat(tree);
    }
  };
  var traversalSpecs = {
    store: {
      empty: [],
      takeAndRemoveOne: function takeAndRemoveOne(store) {
        return store.shift();
      },
      isEmpty: function isEmpty(store) {
        return store.length === 0;
      },
      add: function add(subTrees, store) {
        return store.unshift.apply(store, _toConsumableArray(subTrees));
      }
    },
    lenses: decoratedLenses,
    traverse: {
      seed: seed,
      visit: function visit(result, traversalState, tree) {
        // Cases :
        // 1. label has been visited already : visit
        // 2. label has not been visited, and there are no children : visit
        // 3. label has not been visited, and there are children : don't visit, will do it later
        if (predicate(tree, traversalState)) {
          _visit(result, traversalState, tree);
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
function reduceTree(lenses, traverse, tree) {
  var strategy = traverse.strategy;
  var strategies = {
    BFS: breadthFirstTraverseTree,
    PRE_ORDER: preorderTraverseTree,
    POST_ORDER: postOrderTraverseTree
  };

  if (!(strategy in strategies)) throw "Unknown tree traversal strategy!";

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
function forEachInTree(lenses, traverse, tree) {
  var _strategies;

  var strategy = traverse.strategy,
      action = traverse.action;


  var strategies = (_strategies = {}, _defineProperty(_strategies, BFS, breadthFirstTraverseTree), _defineProperty(_strategies, PRE_ORDER, preorderTraverseTree), _defineProperty(_strategies, POST_ORDER, postOrderTraverseTree), _strategies);

  if (!(strategy in strategies)) throw "Unknown tree traversal strategy!";

  var treeTraveerse = {
    seed: void 0,
    visit: function visit(accumulator, traversalState, tree) {
      return action(tree, traversalState);
    }
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
function mapOverTree(lenses, mapFn, tree) {
  var getChildren = lenses.getChildren,
      constructTree = lenses.constructTree,
      getLabel = lenses.getLabel;

  var getChildrenNumber = function getChildrenNumber(tree, traversalState) {
    return getChildren(tree, traversalState).length;
  };
  var stringify = function stringify(path) {
    return path.join(".");
  };
  var treeTraveerse = {
    seed: function seed() {
      return Map;
    },
    visit: function visit(pathMap, traversalState, tree) {
      var _traversalState$get = traversalState.get(tree),
          path = _traversalState$get.path;
      // Paths are *stringified* because Map with non-primitive objects uses referential equality


      var mappedLabel = mapFn(getLabel(tree));
      var mappedChildren = times(function (index) {
        return pathMap.get(stringify(path.concat(index)));
      }, getChildrenNumber(tree, traversalState));
      var mappedTree = constructTree(mappedLabel, mappedChildren);
      debugger;
      pathMap.set(stringify(path), mappedTree);

      return pathMap;
    }
  };
  var pathMap = postOrderTraverseTree(lenses, treeTraveerse, tree);
  var mappedTree = pathMap.get(stringify(PATH_ROOT));
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
function pruneWhen(lenses, predicate, tree) {
  // As we need to return a tree, it will be convenient to use mapOverTree
  var _getChildren4 = lenses.getChildren;

  var pruneLenses = merge(lenses, {
    getChildren: function getChildren(tree, traversalState) {
      if (predicate(tree, traversalState)) {
        // prune that branch
        return [];
      } else {
        return _getChildren4(tree, traversalState);
      }
    }
  });
  var prunedTree = mapOverTree(pruneLenses, function (x) {
    return x;
  }, tree);

  return prunedTree;
}
},{}]},{},[1])
//# sourceMappingURL=/functional_rose_tree.map