function json(res, status, body){
  res.status(status).setHeader("Content-Type","application/json");
  res.setHeader("Cache-Control","public, max-age=20, s-maxage=20, stale-while-revalidate=60");
  return res.end(JSON.stringify(body));
}
module.exports = async (req,res)=>{
  if(req.method!=="GET") return json(res,405,{error:"Method not allowed"});
  try{
    const url=process.env.SUPABASE_URL;
    const key=process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if(!url||!key) return json(res,500,{error:"Server database environment variables are missing"});
    const mode=req.query?.mode==="move"?"move":"normal";
    const rest=`${url.replace(/\/$/,"")}/rest/v1/player_level_scores?select=player_id,player_name,level_id,hints,time,moves,stars&order=player_id`;
    const r=await fetch(rest,{headers:{"apikey":key,"Authorization":`Bearer ${key}`}});
    const rows=await r.json();
    if(!r.ok) return json(res,502,{error:"Database read failed",detail:rows});

    const players=new Map();
    for(const row of rows){
      let p=players.get(row.player_id);
      if(!p){p={playerId:row.player_id,playerName:row.player_name,levels:0,hints:0,time:0,moves:0,stars:0};players.set(row.player_id,p);}
      p.playerName=row.player_name||p.playerName;
      p.levels++;
      p.hints+=Number(row.hints)||0;
      p.time+=Number(row.time)||0;
      p.moves+=Number(row.moves)||0;
      p.stars+=Number(row.stars)||0;
    }

    const list=[...players.values()];
    if(mode==="move"){
      list.sort((a,b)=>a.hints-b.hints||a.moves-b.moves||a.time-b.time||b.levels-a.levels||b.stars-a.stars);
    }else{
      list.sort((a,b)=>a.hints-b.hints||a.time-b.time||a.moves-b.moves||b.levels-a.levels||b.stars-a.stars);
    }
    return json(res,200,{mode,players:list.slice(0,100)});
  }catch(err){
    return json(res,500,{error:"Unexpected server error"});
  }
};
