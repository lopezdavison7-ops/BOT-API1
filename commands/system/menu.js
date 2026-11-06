import fs from 'fs';
import path from 'path';
import moment from 'moment-timezone';

const VERSION = '2.0.0';
const CREADOR = 'Luis González';
const ZONA = 'America/Managua';
const FOTO_MENU = path.join(process.cwd(), 'media', 'menu', 'menu.jpg');
const CANAL_URL = 'https://whatsapp.com/channel/0029Vb8eeKGG3R3kwBcZdp2Q';
const HOSTING_URL = 'https://SUBBOTAPI.swallox.com';

const ORDEN = ['Sistema','Owner','Grupos','Moderación','Economía','Diversión','Interacción','Descargas','Multimedia','Utilidades','IA','Otros'];
const ICONOS = { Owner:'👑', Economía:'💸', Diversión:'🎉', Sistema:'⚙️', Otros:'📦', Descargas:'📥', Utilidades:'🛠️', IA:'🧠', Multimedia:'🎨', Grupos:'👥', Interacción:'🎭', Moderación:'🛡️' };

function formatUptime(s){
  const d=Math.floor(s/86400), h=Math.floor((s%86400)/3600), m=Math.floor((s%3600)/60), s2=Math.floor(s%60);
  return d>0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m ${s2}s`;
}
function normalizarLista(lista){
  if(!lista) return [];
  let arr = Array.isArray(lista) ? lista : Object.values(lista);
  return arr.map(cmd=>{
    if(typeof cmd==='string') return {nombre:cmd,categoria:'Otros',descripcion:''};
    if(!cmd||typeof cmd!=='object') return null;
    return { nombre: cmd.nombre||cmd.name||cmd.command||cmd.comando||'', categoria: cmd.categoria||cmd.category||cmd.type||'Otros', descripcion: cmd.descripcion||cmd.description||cmd.desc||'Sin descripción', alias: cmd.alias||cmd.aliases||[] };
  }).filter(c=>c&&c.nombre);
}
function organizar(lista){
  const cats={};
  for(const cmd of normalizarLista(lista)){
    const cat=String(cmd.categoria||'Otros').trim().replace(/^\w/,c=>c.toUpperCase());
    if(!cats[cat]) cats[cat]=[];
    cats[cat].push(cmd);
  }
  return cats;
}

function generar(categorias, prefijo, mencion, botName){
  const total=Object.values(categorias).flat().length;
  const totalCats=Object.keys(categorias).length;
  const now=moment.tz(ZONA);
  let t='';

  // ============ ENCABEZADO NUEVO - BLACK ROSE 🥀 ============
  t+=`🥀  ───────────────  🥀\n`;
  t+=`       *𝐁𝐎𝐓-𝐀𝐏𝐈 𝟐.𝟎*\n`;
  t+=`    𝑩𝒍𝒂𝒄𝒌 𝑹𝒐𝒔𝒆 𝑬𝒅𝒊𝒕𝒊𝒐𝒏\n`;
  t+=`🥀  ───────────────  🥀\n\n`;
  t+=`👋 ¡Hola ${mencion}! ✨\n`;
  t+=`🥀 _Donde florece el poder._\n\n`;
  t+=`🤖━━━━ *𝐁𝐎𝐓-𝐀𝐏𝐈 𝟐.𝟎*\n\n`;

  t+=`╭─────〔🥀 𝐈 𝐍 𝐅 𝐎 〕──────\n`;
  t+=`┃◈ 👨‍💻 𝐂𝐫𝐞𝐚𝐝𝐨𝐫    ▸ 𝐋𝐮𝐢𝐬 𝐆𝐨𝐧𝐳𝐚́𝐥𝐞𝐳\n`;
  t+=`┃◈ 📦 𝐕𝐞𝐫𝐬𝐢𝐨́𝐧    ▸ ${VERSION}\n`;
  t+=`┃◈ 🌐 𝐇𝐨𝐬𝐭𝐢𝐧𝐠    ▸ ${HOSTING_URL}\n`;
  t+=`┃◈ 🖥 𝐂𝐡𝐚𝐧𝐧𝐞𝐥    ▸ ${CANAL_URL}\n`;
  t+=`┃◈ 📚 𝐂𝐨𝐦𝐚𝐧𝐝𝐨𝐬   ▸ ${total}\n`;
  t+=`┃◈ 🗂️ 𝐂𝐚𝐭𝐞𝐠𝐨𝐫𝐢́𝐚𝐬 ▸ ${totalCats}\n`;
  t+=`┃◈ 🔧 𝐏𝐫𝐞𝐟𝐢𝐣𝐨    ▸ "${prefijo}"\n`;
  t+=`┃◈ ⏱️ 𝐔𝐩𝐭𝐢𝐦𝐞     ▸ ${formatUptime(process.uptime())}\n`;
  t+=`┃◈ 📅 𝐅𝐞𝐜𝐡𝐚      ▸ ${now.format('DD/MM/YYYY')}\n`;
  t+=`┃◈ 🕐 𝐇𝐨𝐫𝐚       ▸ ${now.format('HH:mm:ss')}\n`;
  t+=`╰─────────────────────╯\n`;

  const keys=Object.keys(categorias).sort((a,b)=>{
    const ia=ORDEN.indexOf(a), ib=ORDEN.indexOf(b);
    if(ia===-1&&ib===-1) return a.localeCompare(b);
    if(ia===-1) return 1; if(ib===-1) return -1;
    return ia-ib;
  });

  for(const cat of keys){
    t+=`\n╭━━━━━【 ${ICONOS[cat]||'📦'} *𝐊𝐍𝐎𝐖*】━━━━━╮\n\n`;
    for(const cmd of categorias[cat]){
      const alias = cmd.alias?.length ? ` (${cmd.alias.join(', ')})` : '';
      const desc = String(cmd.descripcion||'Sin descripción').slice(0,60);
      t+=`◈ *${prefijo}${cmd.nombre}${alias}*\n`;
      t+=`> ${desc}\n\n`;
    }
    t+=`╰━━━━━━━━━━━━━━━━━━━━━╯\n`;
  }

  t+=`\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  t+=`📢 *CANAL OFICIAL*\n${CANAL_URL}\n`;
  t+=`━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  t+=`\n💡 Usa *${prefijo}menu <comando>* para más info.\n`;
  t+=`🥀 _${botName} • Black Rose_`;

  return t;
}

export default {
  nombre:'menu', categoria:'Sistema', alias:['ayuda','help','comandos','cmds'],
  async ejecutar({ sock, msg, listaComandos, prefijo }){
    try{
      const jid=msg?.key?.remoteJid;
      if(!jid) return;
      const sender=msg.key.participant||msg.key.remoteJid;
      const num=String(sender).split('@')[0].split(':')[0].replace(/\D/g,'');
      const botName=global.botname||'BOT-API 2.0';
      let lista=listaComandos;
      if(!lista||(Array.isArray(lista)&&lista.length===0)) lista=global.comandos||global.commands||global.listaComandos||[];
      const categorias=organizar(lista);
      const texto=generar(categorias, prefijo||'.', `@${num}`, botName);
      if(fs.existsSync(FOTO_MENU)){
        await sock.sendMessage(jid,{image:{url:FOTO_MENU},caption:texto,mentions:[sender]},{quoted:msg});
      }else{
        await sock.sendMessage(jid,{text:texto,mentions:[sender]},{quoted:msg});
      }
    }catch(e){
      await sock.sendMessage(msg.key.remoteJid,{text:`❌ Error: ${e.message}`},{quoted:msg});
    }
  }
};