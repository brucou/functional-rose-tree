import uglify from 'rollup-plugin-uglify';

export default {
  entry: 'index.js',
  plugins: [
    uglify()
  ]
};
