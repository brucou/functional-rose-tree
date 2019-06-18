import uglify from 'rollup-plugin-uglify';

export default {
  entry: 'src/index.js',
  plugins: [
    uglify()
  ]
};
