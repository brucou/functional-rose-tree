// Test reduceTree, foreachInTree, and mapOverTree!!

import * as QUnit from "qunitjs";
import {
  BFS, breadthFirstTraverseTree, forEachInTree, mapOverTree, POST_ORDER, postOrderTraverseTree, preorderTraverseTree,
  pruneWhen, reduceTree
} from "../";
import { assoc } from 'ramda'

function addPrefix(prefix) {
  return function (str) {
    return prefix + str;
  };
}

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

QUnit.module("Testing tree traversal", {});

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

  assert.deepEqual(actual, expected, `Fails!`);
});

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

  assert.deepEqual(actual, expected, `Fails!`);
});

QUnit.test("main case - mapOverTree", function exec_test(assert) {
  const getChildren = tree => tree.children || [];
  const getLabel = tree => tree.label || '';
  const constructTree = (label, trees) => ({ label, children: trees });
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

  assert.deepEqual(actual, expected, `Fails!`);
});

QUnit.test("main case - pruneWhen", function exec_test(assert) {
  const getChildren = tree => tree.children || [];
  const getLabel = tree => tree.label || '';
  const constructTree = (label, trees) => ({ label, children: trees });
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

  assert.deepEqual(actual, expected, `Fails!`);
});

// TODO : Write a test which show how to interrupt going down a tree when doing tree traversal
