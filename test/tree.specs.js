// Test reduceTree, foreachInTree, and mapOverTree!!

import * as QUnit from "qunitjs";
import {
  BFS, breadthFirstTraverseTree, forEachInTree, mapOverTree, POST_ORDER, postOrderTraverseTree, preorderTraverseTree,
  pruneWhen, reduceTree
} from "../";

function merge(objA, objB) {
  return Object.assign({}, objA, objB);
}

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

  assert.deepEqual(actual, expected, `Works!`);
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

  assert.deepEqual(actual, expected, `Works!`);
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

  assert.deepEqual(actual, expected, `Works!`);
});

QUnit.test("main case - reduceTree", function exec_test(assert) {
  const reduceTraverse = merge(traverse, { "strategy": BFS });
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

  assert.deepEqual(actual, expected, `Works!`);
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

  assert.deepEqual(actual, expected, `Works!`);
});

QUnit.module("Testing tree traversal with objects", {});

QUnit.test("main case - object traversal - map over", function exec_test(assert) {
  const lenses = {
    getLabel: tree => {
      if (typeof tree === 'object' && !Array.isArray(tree) && Object.keys(tree).length === 1) {
        return { key: Object.keys(tree)[0], value: Object.values(tree)[0] };
      }
      else {
        throw `getLabel > unexpected tree value`
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
      const childrenAcc = children.reduce((acc, child) => {
        let key = Object.keys(child)[0];
        acc[key] = child[key];
        return acc
      }, {});
      return {
        [label.key]: children.length === 0 ? label.value : childrenAcc
      }
    },
    isLeafLabel : label => lenses.getChildren({[label.key]:label.value}).length === 0
  };

  function isEmptyObject(obj){
    return obj && Object.keys(obj).length === 0 && obj.constructor === Object
  }

  function mapOverObj(lenses, {key : mapKeyfn, leafValue:mapValuefn}, obj){
    const rootKey = 'root';
    const rootKeyMap = mapKeyfn(rootKey);

    return mapOverTree(lenses, ({key, value}) => ({
      key: mapKeyfn(key),
      value: lenses.isLeafLabel({key, value}) && !isEmptyObject(value)
        ? mapValuefn(value)
        : value
    }), { root: obj })[rootKeyMap];
  }

  const obj =     {
      "combinatorName": undefined,
      "componentName": "sinkUpdatingComponent",
      "emits": {
        "identifier": "a_circular_behavior_source",
        "notification": {
          "kind": "N",
          "value": {
            "key": "value"
          }
        },
        "type": 0
      },
      "id": 3,
      "logType": "runtime",
      "path": [
        0,
        0,
        0,
        2
      ],
      "settings": {}
    }
  ;

  const actual = mapOverObj(lenses, {key : key => 'K' + key, leafValue : value => 'K' + value}, obj );
  const expected = {
      "KcombinatorName": "Kundefined",
      "KcomponentName": "KsinkUpdatingComponent",
      "Kemits": {
        "Kidentifier": "Ka_circular_behavior_source",
        "Knotification": {
          "Kkind": "KN",
          "Kvalue": {
            "Kkey": "Kvalue"
          }
        },
        "Ktype": "K0"
      },
      "Kid": "K3",
      "KlogType": "Kruntime",
      "Kpath": "K0,0,0,2",
      "Ksettings": {}
  };

  assert.deepEqual(actual, expected, `Works!`);
});

QUnit.test("main case - object traversal - traverse", function exec_test(assert) {
  const traces = [];
  const lenses = {
    getLabel: tree => {
      if (typeof tree === 'object' && !Array.isArray(tree) && Object.keys(tree).length === 1) {
        return { key: Object.keys(tree)[0], value: Object.values(tree)[0] };
      }
      else {
        throw `getLabel > unexpected tree value`
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
        throw `unexpected value`
      }
    },
    constructTree: (label, children) => {
      const childrenAcc = children.reduce((acc, child) => {
        let key = Object.keys(child)[0];
        acc[key] = child[key];
        return acc
      }, {});
      return {
        [label.key]: children.length === 0 ? label.value : childrenAcc
      }
    },
    isLeafLabel : label => lenses.getChildren({[label.key]:label.value}).length === 0
  };

  const traverse = {
    seed: {},
    visit: (visitAcc, traversalState, obj) => {
      return traces.push(traversalState.get(obj).path + `: ${Object.keys(obj)[0]}`)
    }
  }

  function traverseObj(lenses, traverse, obj) {
    breadthFirstTraverseTree(lenses, traverse, { root: obj })
  }

  const obj =     {
      "combinatorName": undefined,
      "componentName": "sinkUpdatingComponent",
      "emits": {
        "identifier": "a_circular_behavior_source",
        "notification": {
          "kind": "N",
          "value": {
            "key": "value"
          }
        },
        "type": 0
      },
      "id": 3,
      "logType": "runtime",
      "path": [
        0,
        0,
        0,
        2
      ],
      "settings": {}
    }
  ;

  traverseObj(lenses, traverse, obj );
  const expected = [
    "0: root",
    "0,0: combinatorName",
    "0,1: componentName",
    "0,2: emits",
    "0,3: id",
    "0,4: logType",
    "0,5: path",
    "0,6: settings",
    "0,2,0: identifier",
    "0,2,1: notification",
    "0,2,2: type",
    "0,2,1,0: kind",
    "0,2,1,1: value",
    "0,2,1,1,0: key"
  ];

  assert.deepEqual(traces, expected, `Works!`);
});
