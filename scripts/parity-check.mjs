import { spawn } from 'child_process';
const OFFICIAL = ['generate','generate_multi_page_gamma','generate_from_template','get_generation_status',
'generate_image','get_image_generation_status','export_gamma','get_export_status','get_gammas','read_gamma',
'get_gamma_comments','get_gamma_analytics','get_gamma_card_analytics','get_gamma_viewer_analytics',
'get_gamma_viewer_detail_analytics','get_themes','get_folders'];
const p = spawn('node', ['build/index.js'], { env: { ...process.env, GAMMA_API_KEY: 'x' } });
let buf='';
p.stdout.on('data', d => { buf+=d;
  for (const line of buf.split('\n').slice(0,-1)) { if(!line.trim())continue;
    const m=JSON.parse(line);
    if(m.id===2){
      const ours = m.result.tools.map(t=>t.name);
      const missing = OFFICIAL.filter(t=>!ours.includes(t));
      const extra = ours.filter(t=>!OFFICIAL.includes(t));
      console.log('official tools:', OFFICIAL.length);
      console.log('ours:', ours.length);
      console.log('MISSING vs official:', missing.length ? missing.join(', ') : 'none  ✓ full parity');
      console.log('beyond official:', extra.join(', '));
      p.kill(); process.exit(missing.length?1:0);
    }}
  buf=buf.slice(buf.lastIndexOf('\n')+1); });
p.stdin.write(JSON.stringify({jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2024-11-05',capabilities:{},clientInfo:{name:'p',version:'1'}}})+'\n');
setTimeout(()=>{p.stdin.write(JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})+'\n');p.stdin.write(JSON.stringify({jsonrpc:'2.0',id:2,method:'tools/list'})+'\n');},400);
setTimeout(()=>{console.log('TIMEOUT');process.exit(1);},8000);
