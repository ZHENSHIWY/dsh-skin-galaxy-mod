import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
const root = import.meta.dirname;
const dsh = process.env.DSH_SOURCE || resolve(homedir(),'code/deepseek-harness');
const require = createRequire(resolve(dsh,'package.json'));
const ts = require('typescript');
const configPath = resolve(root,'tsconfig.json');
const parsed = ts.getParsedCommandLineOfConfigFile(configPath,{}, { ...ts.sys, onUnRecoverableConfigFileDiagnostic: diagnostic => { throw new Error(ts.flattenDiagnosticMessageText(diagnostic.messageText,'\n')); } });
parsed.options.paths = {
  '@deepseek-ai/cordis': [resolve(dsh,'vendor/cordis/lib/types/index.d.ts')],
  '@deepseek-ai/dsh-client-ui-theme/client': [resolve(dsh,'packages/client/ui-theme/lib/types/client/index.d.ts')],
};
const program = ts.createProgram(parsed.fileNames,parsed.options);
const diagnostics = ts.getPreEmitDiagnostics(program);
if (diagnostics.length) {
  console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics,{getCanonicalFileName:p=>p,getCurrentDirectory:()=>root,getNewLine:()=> '\n'}));
  process.exit(1);
}
const binary = resolve(dirname(require.resolve('tsdown/package.json')),'dist/run.mjs');
const result = spawnSync(process.execPath,[binary,'--config',resolve(root,'build.config.mjs')],{ cwd: root, stdio: 'inherit' });
if (result.status !== 0) process.exit(result.status || 1);
writeFileSync(resolve(root,'lib/index.js'),ts.transpileModule(readFileSync(resolve(root,'src/index.ts'),'utf8'),{ compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText);
console.log('星河 plugin built.');
