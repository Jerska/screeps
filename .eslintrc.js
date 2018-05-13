module.exports = {
  extends: ['algolia'],
  rules: {
    'import/no-commonjs': 'off',
    'import/no-unresolved': [2, { ignore: ['\\?'] }],
    'react/prop-types': 'off'
  },
};
