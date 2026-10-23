import {mkdir,copyFile,readFile,writeFile} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
await mkdir('dist',{recursive:true});
for(const name of ['index.html','style.css','app.js','practice.js','feedback.js','motion.js','pinyin.json'])await copyFile(`web/${name}`,`dist/${name}`);
await copyFile('assets/resources/articles.json','dist/articles.json');
await writeFile('dist/session.js',stripTypeScriptTypes(await readFile('assets/scripts/TypingSession.ts','utf8')));
await writeFile('dist/.nojekyll','');
console.log('Built dist/ with shared TypingSession and articles.');
const {execFileSync}=await import('node:child_process');
execFileSync(process.execPath,['--check','dist/app.js'],{stdio:'inherit'});
execFileSync(process.execPath,['--check','dist/session.js'],{stdio:'inherit'});

execFileSync(process.execPath,['--check','dist/practice.js'],{stdio:'inherit'});

// Content-address every executable dependency and stylesheet, including imports.
// An updated HTML entry can never mix old cached game rules with new CSS.
const {createHash}=await import('node:crypto');
const fingerprint=async(name,content)=>{
 const hash=createHash('sha256').update(content).digest('hex').slice(0,12);
 const versioned=name.replace(/(\.[^.]+)$/,'-'+hash+'$1');
 await writeFile('dist/'+versioned,content);return versioned;
};
const sessionName=await fingerprint('session.js',await readFile('dist/session.js','utf8'));
const practiceName=await fingerprint('practice.js',await readFile('dist/practice.js','utf8'));
const feedbackName=await fingerprint('feedback.js',await readFile('dist/feedback.js','utf8'));
const motionName=await fingerprint('motion.js',await readFile('dist/motion.js','utf8'));
const appSource=(await readFile('dist/app.js','utf8')).replace('./session.js','./'+sessionName).replace('./practice.js','./'+practiceName).replace('./feedback.js','./'+feedbackName).replace('./motion.js','./'+motionName);
const appName=await fingerprint('app.js',appSource);
const styleName=await fingerprint('style.css',await readFile('dist/style.css','utf8'));
const html=(await readFile('dist/index.html','utf8')).replace('./app.js','./'+appName).replace('./style.css','./'+styleName);
await writeFile('dist/index.html',html);

execFileSync(process.execPath,['--check','dist/feedback.js'],{stdio:'inherit'});

execFileSync(process.execPath,['--check','dist/motion.js'],{stdio:'inherit'});
