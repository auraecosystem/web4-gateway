import {timingSafeEqual} from "node:crypto";
export function authenticateRequest(req,token){const h=req.headers.authorization??"";if(!h.startsWith("Bearer "))return null;const a=Buffer.from(h.slice(7)),b=Buffer.from(token);if(a.length!==b.length||!timingSafeEqual(a,b))return null;return Object.freeze({id:"gateway-client",method:"bearer",scopes:["gateway:connect","gateway:route"]});}
export const requirePrincipal=token=>(req,res,next)=>{const p=authenticateRequest(req,token);if(!p)return res.status(401).json({error:"UNAUTHENTICATED"});req.principal=p;next();};
