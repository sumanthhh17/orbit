import { database } from '@/db';
import { z } from 'zod';
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal(''));
const projectInput=z.object({name:z.string().trim().min(1).max(80),description:z.string().max(500),color:z.enum(['blue','violet','orange','green']),due:date});
const taskInput=z.object({project_id:z.string().min(1),title:z.string().trim().min(1).max(160),description:z.string().max(2000),status:z.enum(['Backlog','In progress','In review','Done']),priority:z.enum(['Low','Medium','High']),assignee:z.string().trim().max(60),due:date});
export async function GET(){try{const db=database();const [p,t,a]=await Promise.all([db.prepare('SELECT * FROM projects ORDER BY created').all(),db.prepare('SELECT * FROM tasks ORDER BY created DESC').all(),db.prepare('SELECT * FROM activity ORDER BY created DESC LIMIT 30').all()]);return Response.json({projects:p.results,tasks:t.results,activity:a.results});}catch(e){console.error(e);return Response.json({error:'Your workspace could not be loaded. Please try again.'},{status:503});}}
export async function POST(request:Request){try{
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return Response.json({error:'Invalid request origin'},{status:403});
 const body=z.object({action:z.enum(['create','update','delete','seed']),kind:z.enum(['project','task']).optional(),id:z.string().optional(),data:z.unknown()}).parse(await request.json());if(!['create','update','delete','seed'].includes(body.action))return Response.json({error:'Unknown action'},{status:400});if(['update','delete'].includes(body.action)&&typeof body.id!=='string')return Response.json({error:'Record ID required'},{status:400});
 const db=database();const now=new Date().toISOString();const id=crypto.randomUUID();let message='';
 if(body.action==='seed'){
 const present=await db.prepare("SELECT key FROM settings WHERE key='examples'").first();if(present)return Response.json({error:'Example workspace has already been added.'},{status:409});
 const ps=[['p-launch','Website relaunch','A sharper home for our next chapter.','blue','2026-10-02'],['p-mobile','Mobile experience','Make every interaction feel effortless.','violet','2026-10-16'],['p-brand','Brand system','One consistent voice, everywhere.','orange','2026-10-09']];
 const ts=[['Design the homepage','p-launch','In progress','High','Alex','2026-09-18'],['Map the customer journey','p-mobile','In review','Medium','Sam','2026-09-19'],['Build the component library','p-brand','In progress','High','Jordan','2026-09-22'],['Audit existing pages','p-launch','Done','Medium','Alex','2026-09-14'],['Explore navigation patterns','p-mobile','Backlog','Low','Sam','2026-09-24'],['Write the brand guidelines','p-brand','Backlog','Medium','Jordan','2026-09-25'],['Review accessibility','p-launch','In review','High','Sam','2026-09-21'],['Set up the design tokens','p-brand','Done','Medium','Alex','2026-09-15'],['Prototype the onboarding flow','p-mobile','In progress','High','Jordan','2026-09-23']];
 await db.batch([...ps.map(p=>db.prepare("INSERT INTO projects (id,name,description,color,due,created) SELECT ?,?,?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM settings WHERE key='examples')").bind(...p,now)),...ts.map((t,i)=>db.prepare("INSERT INTO tasks (id,title,project_id,status,priority,assignee,due,description,created) SELECT ?,?,?,?,?,?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM settings WHERE key='examples')").bind('example-'+i,...t,'Example task. Edit this to make it your own.',now)),db.prepare("INSERT OR IGNORE INTO settings (key,value) VALUES ('examples',1)"),db.prepare('INSERT INTO activity VALUES (?,?,?)').bind(id,'Added example workspace',now)]);return Response.json({ok:true});
 }
 if(body.kind==='project'){
 if(body.action==='delete'){await db.batch([db.prepare('DELETE FROM tasks WHERE project_id=?').bind(body.id),db.prepare('DELETE FROM projects WHERE id=?').bind(body.id)]);message='Deleted a project';}
 else{const v=projectInput.parse(body.data);if(body.action==='update'){await db.prepare('UPDATE projects SET name=?,description=?,color=?,due=? WHERE id=?').bind(v.name,v.description,v.color,v.due,body.id).run();message=`Updated ${v.name}`;}else{await db.prepare('INSERT INTO projects VALUES (?,?,?,?,?,?)').bind(id,v.name,v.description,v.color,v.due,now).run();message=`Created ${v.name}`;}}
 }else if(body.kind==='task'){
 if(body.action==='delete'){await db.prepare('DELETE FROM tasks WHERE id=?').bind(body.id).run();message='Deleted a task';}
 else{const v=taskInput.parse(body.data);if(!await db.prepare('SELECT id FROM projects WHERE id=?').bind(v.project_id).first())return Response.json({error:'Choose an existing project.'},{status:400});
 if(body.action==='update')await db.prepare('UPDATE tasks SET project_id=?,title=?,description=?,status=?,priority=?,assignee=?,due=? WHERE id=?').bind(v.project_id,v.title,v.description,v.status,v.priority,v.assignee,v.due,body.id).run();
 else await db.prepare('INSERT INTO tasks VALUES (?,?,?,?,?,?,?,?,?)').bind(id,v.project_id,v.title,v.description,v.status,v.priority,v.assignee,v.due,now).run();message=`${body.action==='update'?'Updated':'Created'} ${v.title}`;}
 }else return Response.json({error:'Unknown action'},{status:400});
 await db.prepare('INSERT INTO activity VALUES (?,?,?)').bind(crypto.randomUUID(),message,now).run();return Response.json({ok:true});
 }catch(e){if(e instanceof z.ZodError)return Response.json({error:'Check the required fields and try again.'},{status:400});console.error(e);return Response.json({error:'Changes could not be saved. Please try again.'},{status:500});}}


