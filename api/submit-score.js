const crypto = require("crypto");

function json(res, status, body){
  res.status(status).setHeader("Content-Type","application/json");
  res.setHeader("Cache-Control","no-store");
  return res.end(JSON.stringify(body));
}

module.exports = async (req, res) => {
  if(req.method !== "POST") return json(res,405,{error:"Method not allowed"});
  try{
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if(!url || !key) return json(res,500,{error:"Server database environment variables are missing"});

    const b=req.body||{};
    const playerId=String(b.playerId||"").trim();
    const playerName=String(b.playerName||"").trim().replace(/\s+/g," ");
    const levelId=Number(b.levelId), hints=Number(b.hints), time=Number(b.time), moves=Number(b.moves), stars=Number(b.stars);

    if(!/^[0-9a-fA-F-]{20,64}$/.test(playerId)) return json(res,400,{error:"Invalid player id"});
    if(playerName.length<2 || playerName.length>24) return json(res,400,{error:"Invalid player name"});
    if(!Number.isInteger(levelId)||levelId<1||levelId>10) return json(res,400,{error:"Invalid level"});
    if(!Number.isInteger(hints)||hints<0||hints>3) return json(res,400,{error:"Invalid hints"});
    if(!Number.isFinite(time)||time<0||time>36000) return json(res,400,{error:"Invalid time"});
    if(!Number.isInteger(moves)||moves<0||moves>10000) return json(res,400,{error:"Invalid moves"});
    if(!Number.isInteger(stars)||stars<1||stars>3) return json(res,400,{error:"Invalid stars"});

    // One best row per player + level. Do not let a worse score overwrite a better run.
    const rest=`${url.replace(/\/$/,"")}/rest/v1/player_level_scores`;
    const headers={
      "apikey":key,
      "Authorization":`Bearer ${key}`,
      "Content-Type":"application/json",
      "Prefer":"return=representation"
    };

    const getUrl=`${rest}?select=id,hints,time,moves,stars,player_name&player_id=eq.${encodeURIComponent(playerId)}&level_id=eq.${levelId}&limit=1`;
    const existingResp=await fetch(getUrl,{headers});
    const existing=await existingResp.json();
    if(!existingResp.ok) return json(res,502,{error:"Database lookup failed",detail:existing});

    const better=(a,b)=>(
      a.hints<b.hints ||
      (a.hints===b.hints && a.time<b.time) ||
      (a.hints===b.hints && a.time===b.time && a.moves<b.moves) ||
      (a.hints===b.hints && a.time===b.time && a.moves===b.moves && a.stars>b.stars)
    );

    if(existing.length){
      const old=existing[0];
      if(!better({hints,time,moves,stars},old)){
        return json(res,200,{saved:false,message:"Your existing result is already better or equal",result:old});
      }
      const putResp=await fetch(`${rest}?id=eq.${encodeURIComponent(old.id)}`,{
        method:"PATCH",headers,body:JSON.stringify({player_name:playerName,hints,time,moves,stars,updated_at:new Date().toISOString()})
      });
      const putData=await putResp.json();
      if(!putResp.ok) return json(res,502,{error:"Database update failed",detail:putData});
      return json(res,200,{saved:true,result:putData[0]});
    }

    const postResp=await fetch(rest,{
      method:"POST",headers,
      body:JSON.stringify({player_id:playerId,player_name:playerName,level_id:levelId,hints,time,moves,stars})
    });
    const postData=await postResp.json();
    if(!postResp.ok) return json(res,502,{error:"Database insert failed",detail:postData});
    return json(res,200,{saved:true,result:postData[0]});
  }catch(err){
    return json(res,500,{error:"Unexpected server error"});
  }
};
