// Download original font files during deployment, never from the player's browser.
// SHA-256 pins prevent upstream changes or error pages becoming published fonts.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
export async function bundleVendorFonts(){
 const files=JSON.parse(await readFile('web/fonts/vendor-manifest.json','utf8'));
 await mkdir('dist/fonts/vendor',{recursive:true});
 const hash=b=>createHash('sha256').update(b).digest('hex');
 let cursor=0;
 async function worker(){
  while(cursor<files.length){
   const file=files[cursor++],path='dist/fonts/vendor/'+file.file;
   try{if(hash(await readFile(path))===file.sha256)continue;}catch{}
   let failure;
   for(let attempt=0;attempt<3;attempt++){
    try{
     const response=await fetch(file.url,{signal:AbortSignal.timeout(60000)});
     if(!response.ok)throw Error('HTTP '+response.status);
     const data=Buffer.from(await response.arrayBuffer());
     if(hash(data)!==file.sha256)throw Error('font checksum mismatch');
     await writeFile(path,data);failure=null;break;
    }catch(error){failure=error;}
   }
   if(failure)throw Error('Cannot bundle '+file.file+': '+failure.message);
  }
 }
 await Promise.all(Array.from({length:4},worker));
 console.log('Verified and bundled '+files.length+' original font files.');
}
