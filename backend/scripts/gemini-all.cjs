// Optional full-sheet CLI diagnostic using the same Gemini engine as the web app.
const fs = require('node:fs/promises');
const path = require('node:path');
const {parseTextKey} = require('../dist/services/textKeyService');
const {inspectPdf} = require('../dist/services/pdfService');
const {evaluatePdf,validateResult}=require('../lib/gemini.cjs');
async function runTrial({keyText,...options}) {
  const {rubric,warnings}=parseTextKey(keyText);
  return {...await evaluatePdf({...options,rubric}),key_warnings:warnings};
}
async function main() {
  require('dotenv').config({path:path.resolve(__dirname,'../.env')});
  const [sheet,key]=process.argv.slice(2);
  if(!sheet||!key) throw new Error('Usage: node scripts/gemini-all.cjs "/path/Answer sheet.pdf" "/path/Answer key.txt"');
  for(const [file,max] of [[sheet,10*1024*1024],[key,1024*1024]]) if((await fs.stat(file)).size>max) throw new Error('Trial limits: PDF 10 MiB; TXT key 1 MiB.');
  const pages=await inspectPdf(sheet);
  const keyText=await fs.readFile(key,'utf8');
  const {rubric,warnings}=parseTextKey(keyText);
  console.error(`Key: ${rubric.questions.length} questions, ${rubric.totalMarks} marks. ${warnings.join(' ')}`);
  console.error('Sending one PDF + full TXT key request to Gemini. No automatic retries. Your project billing/quota applies. Allow up to 10 minutes.');
  const report=await runTrial({pdf:await fs.readFile(sheet),keyText,apiKey:process.env.GEMINI_API_KEY,pages});
  const directory=path.resolve(__dirname,'../trial-results');await fs.mkdir(directory,{recursive:true});
  const output=path.join(directory,`gemini-all-${Date.now()}.json`);
  await fs.writeFile(output,JSON.stringify(report,null,2),{mode:0o600});
  console.log(JSON.stringify(report,null,2));console.error(`Saved: ${output}`);
}
module.exports={runTrial,validateResult};
if(require.main===module) main().catch(e=>{console.error(e.name==='TimeoutError'?'Request timed out. No retry made; check usage before rerunning.':e.message);process.exitCode=1;});
