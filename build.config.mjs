export default {
  entry: { client: './src/client.ts' },
  outDir: './lib', format: 'cjs', platform: 'browser', clean: false,
  dts: false, sourcemap: true,
  outputOptions: {
    entryFileNames: 'client.js',
    banner: 'window.__ModuleLoader__.load({ id: "dsh-skin-galaxy", factory: (require) => {',
    intro: 'var module = { exports: {} }; var exports = module.exports;',
    footer: 'return module.exports; } });',
  },
};
