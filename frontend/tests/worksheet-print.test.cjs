const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const Module=require('node:module');const ts=require('typescript');
const filename=path.resolve(__dirname,'../src/utils/worksheetPrint.ts');
const compiled=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
const mod=new Module(filename,module);mod.filename=filename;mod.paths=Module._nodeModulePaths(path.dirname(filename));mod._compile(compiled,filename);
const {worksheetDocument,mathHtml}=mod.exports;
test('student print view excludes teacher solutions and escapes all source content',()=>{
 const w={title:'Test <script>bad</script>',questions:[{id:'1',lesson:'Maths',subtopic:'Roots',question:'Solve $x^2=4$. <img onerror="alert(1)">',marks:2,answer:'SECRET_ANSWER',markingGuidance:'SECRET_GUIDANCE',difficulty:'practice',origin:'generated',answerOrigin:'generated'}]};
 const student=worksheetDocument(w,false);assert.ok(!student.includes('SECRET_'));assert.ok(!student.includes('<script>'));assert.ok(!student.includes('<img onerror'));assert.ok(student.includes('katex'));
 const teacher=worksheetDocument(w,true);assert.ok(teacher.includes('SECRET_ANSWER'));assert.ok(teacher.includes('SECRET_GUIDANCE'));
});
test('untrusted LaTeX cannot create active links',()=>{assert.ok(!mathHtml('$\\href{javascript:alert(1)}{click}$').includes('href="javascript:'));});
