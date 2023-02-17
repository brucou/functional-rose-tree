// Test reduceTree, foreachInTree, and mapOverTree!!

import * as QUnit from "qunitjs";
import {
  arrayTreeLenses, BFS, breadthFirstTraverseTree, forEachInTree, getHashedTreeLenses, mapOverHashTree, mapOverObj,
  mapOverTree, objectTreeLenses, POST_ORDER, PRE_ORDER, postOrderTraverseTree, preorderTraverseTree, pruneWhen, reduceTree,
  switchTreeDataStructure, traverseObj
} from "../src";

function merge(objA, objB) {
  return Object.assign({}, objA, objB);
}

function addPrefix(prefix) {
  return function (str) {
    return prefix + str;
  };
}

QUnit.dump.maxDepth = 10;

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
  getLabel: tree => tree.label,
  getChildren: tree => tree.children || [],
  constructTree: (label, children) => ({ label, children })
};
const emptyArray = [];
const traverse = {
  accumulator: {
    empty: () => emptyArray, 
    accumulate: (a,b) => a.concat(b == emptyArray ? [] : [b])
  },
  visit: (traversalState, subTreeLabel, subTreeChildren) => {
    return {value: subTreeLabel, children: subTreeChildren}
  },
  finalize: x => x 
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
      "isVisited": false,
      "path": [
        0,
        0
      ]
    },
    "left",
    {
      "isVisited": false,
      "path": [
        0,
        1,
        0
      ]
    },
    "midleft",
    {
      "isVisited": false,
      "path": [
        0,
        1,
        1
      ]
    },
    "midright",
    {
      "isVisited": true,
      "path": [
        0,
        1
      ]
    },
    "middle",
    {
      "isVisited": false,
      "path": [
        0,
        2
      ]
    },
    "right",
    {
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
  const obj = {
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
    };

  const actual = mapOverObj({ key: key => 'K' + key, leafValue: value => 'K' + value }, obj);
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

QUnit.test("main case - object traversal - BFS traverse", function exec_test(assert) {
  const lenses = objectTreeLenses;
  const traverse = {
    strategy: BFS,
    accumulator: {
      empty: () => emptyArray, 
      accumulate: (a,b) => a.concat(b == emptyArray ? [] : [b])
    },
    visit: (traversalState, subTreeLabel, subTreeChildren) => {
      return {value: subTreeLabel, children: subTreeChildren}
    },
    finalize: x => x,
  };

  const obj = {
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
  const actual = traverseObj(traverse, obj);

  const expected = [
    {
      "combinatorName": undefined
    },
    {
      "componentName": "sinkUpdatingComponent"
    },
    {
      "emits": {
        "identifier": "a_circular_behavior_source",
        "notification": {
          "kind": "N",
          "value": {
            "key": "value"
          }
        },
        "type": 0
      }
    },
    {
      "id": 3
    },
    {
      "logType": "runtime"
    },
    {
      "path": [
        0,
        0,
        0,
        2
      ]
    },
    {
      "settings": {}
    },
    {
      "identifier": "a_circular_behavior_source"
    },
    {
      "notification": {
        "kind": "N",
        "value": {
          "key": "value"
        }
      }
    },
    {
      "type": 0
    },
    {
      "kind": "N"
    },
    {
      "value": {
        "key": "value"
      }
    },
    {
      "key": "value"
    }
  ];

  assert.deepEqual(actual, expected, `Works!`);
});

QUnit.test("main case - object traversal - preorder traverse", function exec_test(assert) {
  const lenses = objectTreeLenses;
  const traverse = {
    strategy: PRE_ORDER,
    accumulator: {
      empty: () => emptyArray, 
      accumulate: (a,b) => a.concat(b == emptyArray ? [] : [b])
    },
    visit: (traversalState, subTreeLabel, subTreeChildren) => {
      return {value: subTreeLabel, children: subTreeChildren}
    },
    finalize: x => x,
  };

  const obj = {
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
  const actual = traverseObj(traverse, obj);

  const expected = [
    {
      "combinatorName": undefined
    },
    {
      "componentName": "sinkUpdatingComponent"
    },
    {
      "emits": {
        "identifier": "a_circular_behavior_source",
        "notification": {
          "kind": "N",
          "value": {
            "key": "value"
          }
        },
        "type": 0
      }
    },
    {
      "identifier": "a_circular_behavior_source"
    },
    {
      "notification": {
        "kind": "N",
        "value": {
          "key": "value"
        }
      }
    },
    {
      "kind": "N"
    },
    {
      "value": {
        "key": "value"
      }
    },
    {
      "key": "value"
    },
    {
      "type": 0
    },
    {
      "id": 3
    },
    {
      "logType": "runtime"
    },
    {
      "path": [
        0,
        0,
        0,
        2
      ]
    },
    {
      "settings": {}
    }
  ];

  assert.deepEqual(actual, expected, `Works!`);
});

QUnit.test("main case - object traversal - post-order traverse", function exec_test(assert) {
  const lenses = objectTreeLenses;
  const traverse = {
    strategy: POST_ORDER,
    accumulator: {
      empty: () => emptyArray, 
      accumulate: (a,b) => a.concat(b == emptyArray ? [] : [b])
    },
    visit: (traversalState, subTreeLabel, subTreeChildren) => {
      return {value: subTreeLabel, children: subTreeChildren}
    },
    finalize: x => x,
  };

  const obj = {
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
  const actual = traverseObj(traverse, obj);

  const expected = [
    {
      "combinatorName": undefined
    },
    {
      "componentName": "sinkUpdatingComponent"
    },
    {
      "identifier": "a_circular_behavior_source"
    },
    {
      "kind": "N"
    },
    {
      "key": "value"
    },
    {
      "value": {
        "key": "value"
      }
    },
    {
      "notification": {
        "kind": "N",
        "value": {
          "key": "value"
        }
      }
    },
    {
      "type": 0
    },
    {
      "emits": {
        "identifier": "a_circular_behavior_source",
        "notification": {
          "kind": "N",
          "value": {
            "key": "value"
          }
        },
        "type": 0
      }
    },
    {
      "id": 3
    },
    {
      "logType": "runtime"
    },
    {
      "path": [
        0,
        0,
        0,
        2
      ]
    },
    {
      "settings": {}
    }
  ];

  assert.deepEqual(actual, expected, `Works!`);
});

QUnit.test("main case - hashed-tree traversal - traverse", function exec_test(assert) {
  const traces = [];
  const lenses = getHashedTreeLenses('.');

  const traverse = {
    accumulator: {
      empty: () => emptyArray, 
      accumulate: (a,b) => a.concat(b == emptyArray ? [] : [b])
    },
    visit: (traversalState, treeLabel, treeChildren, tree) => {
      return {
        value: Object.keys(treeLabel)[0] + `: ${Object.values(treeLabel)[0]}`,
         children: treeChildren
        }
    },
    finalize: x => x,
  }

  const indices = {
    "0": "root",
    "0.0": "combinatorName",
    "0.1": "componentName",
    "0.2": "emits",
    "0.3": "id",
    "0.4": "logType",
    "0.5": "path",
    "0.6": "settings",
    "0.2.0": "identifier",
    "0.2.1": "notification",
    "0.2.2": "type",
    "0.2.1.0": "kind",
    "0.2.1.1": "value",
    "0.2.1.1.0": "key"
  };
  const obj = {
      index: "0",
      indices
    }
  ;

  const actual = breadthFirstTraverseTree(lenses, traverse, obj);
  const expected = [
    "0: root",
    "0.0: combinatorName",
    "0.1: componentName",
    "0.2: emits",
    "0.3: id",
    "0.4: logType",
    "0.5: path",
    "0.6: settings",
    "0.2.0: identifier",
    "0.2.1: notification",
    "0.2.2: type",
    "0.2.1.0: kind",
    "0.2.1.1: value",
    "0.2.1.1.0: key"
  ];

  assert.deepEqual(actual, expected, `Works!`);
});

QUnit.test("main case - hashed-tree traversal - map over", function exec_test(assert) {
  const indices = {
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
  const indices_orig = {
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
  const obj = {
      index: "0",
      indices
    }
  ;

  const actual = mapOverHashTree('.', 
  (label) => 'M-' + label,
   obj);
  const expected = {
    "index": "0",
    "indices": {
      "0": "M-root",
      "0.0": "M-combinatorName",
      "0.1": "M-componentName",
      "0.2": "M-emits",
      "0.2.0": "M-identifier",
      "0.2.1": "M-notification",
      "0.2.1.0": "M-kind",
      "0.2.1.1": "M-value",
      "0.2.1.1.0": "M-key",
      "0.2.2": "M-type",
      "0.3": "M-id",
    }
  };

  assert.deepEqual(actual, expected, `Works!`);
  assert.deepEqual(indices, indices_orig, `Works!`);
});

QUnit.test("main case - array tree traversal - traverse", function exec_test(assert) {
  const lenses = arrayTreeLenses;

  const arrayTreeTraverse = {
    accumulator: {
      empty: () => emptyArray, 
      accumulate: (a,b) => a.concat(b == emptyArray ? [] : [b])
    },
    visit: (traversalState, treeLabel, treeChildren, tree) => {
      const path = traversalState.get(tree).path;
      const graphNodes = treeChildren.map(child => {
        return {
          data: {
            id: [lenses.getLabel(child), path.join('.')].join('.'),
            label: lenses.getLabel(child),
            parent: treeLabel
          }
        }
      });
  
      return {value: graphNodes, children: treeChildren}
    },
    // We are concatenating arrays (cf. accumulate, b is an array).
    // We flatten that for (slightly) easier test case writing
    finalize: x => x.flat() 
  }
  
  const arrayTree = ['root', [
    ['no_cd_loaded', [
      "cd_drawer_closed",
      "cd_drawer_open",
      "closing_cd_drawer"
    ]],
    ['cd_loaded', [
      ["cd_loaded_group", [
        ["cd_paused_group", [
          "time_and_track_fields_not_blank",
          "time_and_track_fields_blank"
        ]],
        "cd_playing",
        "cd_stopped"
      ]],
      "stepping_forwards",
      "stepping_backwards"
    ]]
  ]];

  const actual = breadthFirstTraverseTree(lenses, arrayTreeTraverse, arrayTree);
  const expected = [
    {
      "data": {
        "id": "no_cd_loaded.0",
        "label": "no_cd_loaded",
        "parent": "root"
      }
    },
    {
      "data": {
        "id": "cd_loaded.0",
        "label": "cd_loaded",
        "parent": "root"
      }
    },
    {
      "data": {
        "id": "cd_drawer_closed.0.0",
        "label": "cd_drawer_closed",
        "parent": "no_cd_loaded"
      }
    },
    {
      "data": {
        "id": "cd_drawer_open.0.0",
        "label": "cd_drawer_open",
        "parent": "no_cd_loaded"
      }
    },
    {
      "data": {
        "id": "closing_cd_drawer.0.0",
        "label": "closing_cd_drawer",
        "parent": "no_cd_loaded"
      }
    },
    {
      "data": {
        "id": "cd_loaded_group.0.1",
        "label": "cd_loaded_group",
        "parent": "cd_loaded"
      }
    },
    {
      "data": {
        "id": "stepping_forwards.0.1",
        "label": "stepping_forwards",
        "parent": "cd_loaded"
      }
    },
    {
      "data": {
        "id": "stepping_backwards.0.1",
        "label": "stepping_backwards",
        "parent": "cd_loaded"
      }
    },
    {
      "data": {
        "id": "cd_paused_group.0.1.0",
        "label": "cd_paused_group",
        "parent": "cd_loaded_group"
      }
    },
    {
      "data": {
        "id": "cd_playing.0.1.0",
        "label": "cd_playing",
        "parent": "cd_loaded_group"
      }
    },
    {
      "data": {
        "id": "cd_stopped.0.1.0",
        "label": "cd_stopped",
        "parent": "cd_loaded_group"
      }
    },
    {
      "data": {
        "id": "time_and_track_fields_not_blank.0.1.0.0",
        "label": "time_and_track_fields_not_blank",
        "parent": "cd_paused_group"
      }
    },
    {
      "data": {
        "id": "time_and_track_fields_blank.0.1.0.0",
        "label": "time_and_track_fields_blank",
        "parent": "cd_paused_group"
      }
    }
  ];

  assert.deepEqual(actual, expected, `Works!`);
});

QUnit.test("main case - switching tree data structure - from label tree to array tree", function exec_test(assert) {
  const actual = switchTreeDataStructure(lenses, arrayTreeLenses, tree);

  const expected = [
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
  ];

  assert.deepEqual(actual, expected, `Works!`);
});

QUnit.test("main case - array tree traversal - postorder traversal", function exec_test(assert) {
  const lenses = arrayTreeLenses;

  const traverse = {
    accumulator: {
      empty: () => emptyArray, 
      accumulate: (a,b) => a.concat(b == emptyArray ? [] : [b])
    },
    finalize: x => x,
    visit: (traversalState, treeLabel, treeChildren, tree) => {
      const path = traversalState.get(tree).path;
      const label = treeLabel;
      const children = treeChildren;

      return {value: { path, label, children }, children: treeChildren}
    }
  }

  const arrayTree = [
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
  ];

  const actual = postOrderTraverseTree(lenses, traverse, arrayTree);
  const expected =
    [
      {
        "children": [],
        "label": "left",
        "path": [
          0,
          0
        ]
      },
      {
        "children": [],
        "label": "midleft",
        "path": [
          0,
          1,
          0
        ]
      },
      {
        "children": [],
        "label": "midright",
        "path": [
          0,
          1,
          1
        ]
      },
      {
        "children": [
          "midleft",
          "midright"
        ],
        "label": "middle",
        "path": [
          0,
          1
        ]
      },
      {
        "children": [],
        "label": "right",
        "path": [
          0,
          2
        ]
      },
      {
        "children": [
          "left",
          [
            "middle",
            [
              "midleft",
              "midright"
            ]
          ],
          "right"
        ],
        "label": "root",
        "path": [
          0
        ]
      }
    ];

  assert.deepEqual(actual, expected, `Works!`);
});

QUnit.test("main case - switching tree data structure - from array tree to label tree", function exec_test(assert) {
  const tree = [
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
  ];
  const actual = switchTreeDataStructure(arrayTreeLenses, lenses, tree);

  const expected =
    {
      "children": [
        {
          "children": [],
          "label": "left"
        },
        {
          "children": [
            {
              "children": [],
              "label": "midleft"
            },
            {
              "children": [],
              "label": "midright"
            }
          ],
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

QUnit.module("Edge cases - identiical values", {});

QUnit.test("main case - preorderTraverseTree - label tree - identical labels", function exec_test(assert) {
  const tree = {
    label: "root",
    children: [
      { label: "same" },
      {
        label: "same",
        children: [{ label: "midleft" }, { label: "midright" }]
      },
      { label: "same" }
    ]
  };

  const actual = preorderTraverseTree(lenses, traverse, tree);
  const expected = [
    "root",
    "same",
    "same",
    "midleft",
    "midright",
    "same"
  ];

  assert.deepEqual(actual, expected, `Works!`);
});

QUnit.test("main case - postorderTraverseTree - label tree - identical labels", function exec_test(assert) {
  const tree = {
    label: "root",
    children: [
      { label: "same" },
      {
        label: "same",
        children: [{ label: "midleft" }, { label: "midright" }]
      },
      { label: "same" }
    ]
  };

  const actual = postOrderTraverseTree(lenses, traverse, tree);
  const expected = [
    "same",
    "midleft",
    "midright",
    "same",
    "same",
    "root"
  ];

  assert.deepEqual(actual, expected, `Works!`);
});

QUnit.test("main case - bfsOrderTraverseTree - label tree - identical labels", function exec_test(assert) {
  const tree = {
    label: "root",
    children: [
      { label: "same" },
      {
        label: "same",
        children: [{ label: "midleft" }, { label: "midright" }]
      },
      { label: "same" }
    ]
  };

  const actual = breadthFirstTraverseTree(lenses, traverse, tree);
  const expected = [
    "root",
    "same",
    "same",
    "same",
    "midleft",
    "midright"
  ];

  assert.deepEqual(actual, expected, `Works!`);
});

QUnit.test("main case - preorder array tree traversal - traverse - identical labels", function exec_test(assert) {
  const lenses = arrayTreeLenses;

  const arrayTreeTraverse = {
    accumulator: {
      empty: () => emptyArray, 
      accumulate: (a,b) => a.concat(b == emptyArray ? [] : [b])
    },
    visit: (traversalState, treeLabel, treeChildren, tree) => {
      const path = traversalState.get(tree).path;
      const graphNodes = treeChildren.map(child => {
        return {
          data: {
            id: [lenses.getLabel(child), path.join('.')].join('.'),
            label: lenses.getLabel(child),
            parent: treeLabel
          }
        }
      });
  
      return {value: graphNodes, children: treeChildren}
    },
    // We are concatenating arrays (cf. accumulate, b is an array).
    // We flatten that for (slightly) easier test case writing
    finalize: x => x.flat() 
  }
  
  const arrayTree = ['root', [
    ['no_cd_loaded', [
      "cd_drawer_closed",
      "cd_drawer_closed",
      "cd_drawer_closed"
    ]],
    ['cd_loaded', [
      ["cd_loaded_group", [
        ["cd_paused_group", [
          "time_and_track_fields_not_blank",
          "time_and_track_fields_blank"
        ]],
        "cd_playing",
        "cd_stopped"
      ]],
      "stepping_forwards",
      "stepping_backwards"
    ]]
  ]];

  const actual = breadthFirstTraverseTree(lenses, arrayTreeTraverse, arrayTree);
  const expected = [
    {
      "data": {
        "id": "no_cd_loaded.0",
        "label": "no_cd_loaded",
        "parent": "root"
      }
    },
    {
      "data": {
        "id": "cd_loaded.0",
        "label": "cd_loaded",
        "parent": "root"
      }
    },
    {
      "data": {
        "id": "cd_drawer_closed.0.0",
        "label": "cd_drawer_closed",
        "parent": "no_cd_loaded"
      }
    },
    {
      "data": {
        "id": "cd_drawer_closed.0.0",
        "label": "cd_drawer_closed",
        "parent": "no_cd_loaded"
      }
    },
    {
      "data": {
        "id": "cd_drawer_closed.0.0",
        "label": "cd_drawer_closed",
        "parent": "no_cd_loaded"
      }
    },
    {
      "data": {
        "id": "cd_loaded_group.0.1",
        "label": "cd_loaded_group",
        "parent": "cd_loaded"
      }
    },
    {
      "data": {
        "id": "stepping_forwards.0.1",
        "label": "stepping_forwards",
        "parent": "cd_loaded"
      }
    },
    {
      "data": {
        "id": "stepping_backwards.0.1",
        "label": "stepping_backwards",
        "parent": "cd_loaded"
      }
    },
    {
      "data": {
        "id": "cd_paused_group.0.1.0",
        "label": "cd_paused_group",
        "parent": "cd_loaded_group"
      }
    },
    {
      "data": {
        "id": "cd_playing.0.1.0",
        "label": "cd_playing",
        "parent": "cd_loaded_group"
      }
    },
    {
      "data": {
        "id": "cd_stopped.0.1.0",
        "label": "cd_stopped",
        "parent": "cd_loaded_group"
      }
    },
    {
      "data": {
        "id": "time_and_track_fields_not_blank.0.1.0.0",
        "label": "time_and_track_fields_not_blank",
        "parent": "cd_paused_group"
      }
    },
    {
      "data": {
        "id": "time_and_track_fields_blank.0.1.0.0",
        "label": "time_and_track_fields_blank",
        "parent": "cd_paused_group"
      }
    }
  ];

  assert.deepEqual(actual, expected, `Works!`);
});

QUnit.test("main case - postorder tree traversal - traverse - identical labels", function exec_test(assert) {
  const lenses = arrayTreeLenses;

  const arrayTreeTraverse = {
    accumulator: {
      empty: () => emptyArray, 
      accumulate: (a,b) => a.concat(b == emptyArray ? [] : [b])
    },
    visit: (traversalState, treeLabel, treeChildren, tree) => {
      const path = traversalState.get(tree).path;
      const graphNodes = treeChildren.map(child => {
        return {
          data: {
            id: [lenses.getLabel(child), path.join('.')].join('.'),
            label: lenses.getLabel(child),
            parent: treeLabel
          }
        }
      });
  
      return {value: graphNodes, children: treeChildren}
    },
    // We are concatenating arrays (cf. accumulate, b is an array).
    // We flatten that for (slightly) easier test case writing
    finalize: x => x.flat() 
  }
  
  const arrayTree = ['root', [
    ['no_cd_loaded', [
      "cd_drawer_closed",
      "cd_drawer_closed",
      "cd_drawer_closed"
    ]],
    ['cd_drawer_closed', [
      ["cd_loaded_group", [
        ["cd_paused_group", [
          "time_and_track_fields_not_blank",
          "time_and_track_fields_blank"
        ]],
        "cd_playing",
        "cd_stopped"
      ]],
      "stepping_forwards",
      "stepping_backwards"
    ]]
  ]];

  const actual = postOrderTraverseTree(lenses, arrayTreeTraverse, arrayTree);
  const expected = [
    {
      "data": {
        "id": "cd_drawer_closed.0.0",
        "label": "cd_drawer_closed",
        "parent": "no_cd_loaded"
      }
    },
    {
      "data": {
        "id": "cd_drawer_closed.0.0",
        "label": "cd_drawer_closed",
        "parent": "no_cd_loaded"
      }
    },
    {
      "data": {
        "id": "cd_drawer_closed.0.0",
        "label": "cd_drawer_closed",
        "parent": "no_cd_loaded"
      }
    },
    {
      "data": {
        "id": "time_and_track_fields_not_blank.0.1.0.0",
        "label": "time_and_track_fields_not_blank",
        "parent": "cd_paused_group"
      }
    },
    {
      "data": {
        "id": "time_and_track_fields_blank.0.1.0.0",
        "label": "time_and_track_fields_blank",
        "parent": "cd_paused_group"
      }
    },
    {
      "data": {
        "id": "cd_paused_group.0.1.0",
        "label": "cd_paused_group",
        "parent": "cd_loaded_group"
      }
    },
    {
      "data": {
        "id": "cd_playing.0.1.0",
        "label": "cd_playing",
        "parent": "cd_loaded_group"
      }
    },
    {
      "data": {
        "id": "cd_stopped.0.1.0",
        "label": "cd_stopped",
        "parent": "cd_loaded_group"
      }
    },
    {
      "data": {
        "id": "cd_loaded_group.0.1",
        "label": "cd_loaded_group",
        "parent": "cd_drawer_closed"
      }
    },
    {
      "data": {
        "id": "stepping_forwards.0.1",
        "label": "stepping_forwards",
        "parent": "cd_drawer_closed"
      }
    },
    {
      "data": {
        "id": "stepping_backwards.0.1",
        "label": "stepping_backwards",
        "parent": "cd_drawer_closed"
      }
    },
    {
      "data": {
        "id": "no_cd_loaded.0",
        "label": "no_cd_loaded",
        "parent": "root"
      }
    },
    {
      "data": {
        "id": "cd_drawer_closed.0",
        "label": "cd_drawer_closed",
        "parent": "root"
      }
    }
  ];

  assert.deepEqual(actual, expected, `Works!`);
});
