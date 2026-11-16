import {Request, Response} from 'express';
import {enqueue, getSession} from '../services/jobStore';
import {createWorksheet,reviewWorksheet,worksheetContext} from '../services/worksheetService';
export function createWorksheetController(req:Request,res:Response) {
  let release:(()=>void)|undefined;
  try {
    const session=getSession(String(req.params.id));
    if(session.busy)throw new Error('Session is busy; wait for the current batch or worksheet.');
    if(!session.rubric)throw new Error('Approve the key first.');
    const evaluation=session.evaluations[String(req.body?.evaluationId)];
    if(!evaluation?.learningReport)throw new Error('Evaluation expired or not found for this session. Evaluate the sheet again.');
    const ids=req.body?.topicIds;
    if(!Array.isArray(ids)||!ids.length||ids.length>15||ids.some(id=>typeof id!=='string')||new Set(ids).size!==ids.length)throw new Error('Select 1–15 distinct mapped topics.');
    const topics=ids.map(id=>{
      const t=evaluation.learningReport!.topics.find(t=>t.id===id);
      if(!t)throw new Error('Unknown topic for this evaluation.');return t;
    });
    worksheetContext(session.rubric,topics);
    session.busy=true;release=()=>{session.busy=false;};
    const rubric=session.rubric;
    const jobId=enqueue('Preparing a 15-question worksheet',async update=>{
      try {
        const worksheet=await createWorksheet(rubric,topics,update);
        if(Object.keys(session.worksheets).length>=20)delete session.worksheets[Object.keys(session.worksheets)[0]];
        session.worksheets[worksheet.id]=worksheet;
        return {worksheet};
      } finally {session.busy=false;session.expires=Date.now()+2*60*60*1000;}
    });
    return res.status(202).json({success:true,jobId});
  } catch(error) {
    release?.();return res.status(400).json({success:false,message:error instanceof Error?error.message:'Could not create worksheet.'});
  }
}
export function approveWorksheetController(req:Request,res:Response) {
  try {
    const session=getSession(String(req.params.id));
    if(session.busy)throw new Error('Session is busy.');
    const original=session.worksheets[String(req.params.worksheetId)];
    if(!original)throw new Error('Worksheet expired or not found.');
    const worksheet=reviewWorksheet(original,req.body?.questions,req.body?.confirmed);
    session.worksheets[worksheet.id]=worksheet;
    return res.json({success:true,worksheet});
  } catch(error) {return res.status(400).json({success:false,message:error instanceof Error?error.message:'Invalid worksheet.'});}
}
