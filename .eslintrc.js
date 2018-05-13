module.exports = {
  extends: ['algolia'],
  rules: {
    'import/no-commonjs': 'off',
    'import/no-unresolved': [2, { ignore: ['\\?'] }],
    'react/prop-types': 'off'
  },
  globals: {
    BODYPART_COST: false,

    OK: false,
    CARRY: false,
    MOVE: false,
    WORK: false,

    FIND_SOURCES: false,
    FIND_STRUCTURES: false,

    STRUCTURE_EXTENSION: false,
    STRUCTURE_SPAWN: false,
    STRUCTURE_TOWER: false,

    RESOURCE_ENERGY: false,

    ERR_NOT_IN_RANGE: false,

    Game: false,
    Memory: false
  }
};
