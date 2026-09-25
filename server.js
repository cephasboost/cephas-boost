const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || "CHANGE-ME";

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const dbFile = path.join(__dirname, "data.json");
function load(){
  if(!fs.existsSync(dbFile)) fs.writeFileSync(dbFile, JSON.stringify({orders:[],payments:[]},null,2));
  const db = JSON.parse(fs.readFileSync(dbFile,"utf8"));
  db.orders ||= []; db.payments ||= [];
  return db;
}
function save(db){fs.writeFileSync(dbFile,JSON.stringify(db,null,2));}
function money(n){return Number(Number(n).toFixed(2));}

// Prix de démonstration. Remplace-les par tes vrais tarifs avant mise en production.
const services = [
 {id:1,platform:"TikTok",category:"Abonnés",name:"TikTok — Promotion abonnés",unit:"100 abonnés",price:2,min:10,max:10000},
 {id:2,platform:"TikTok",category:"J’aime",name:"TikTok — Promotion likes",unit:"100 likes",price:1.5,min:50,max:50000},
 {id:3,platform:"TikTok",category:"Vues",name:"TikTok — Promotion vues",unit:"1000 vues",price:.8,min:1000,max:1000000},
 {id:4,platform:"Instagram",category:"Abonnés",name:"Instagram — Promotion abonnés",unit:"100 abonnés",price:2.5,min:10,max:10000},
 {id:5,platform:"Instagram",category:"J’aime",name:"Instagram — Promotion likes",unit:"100 likes",price:1.2,min:50,max:50000},
 {id:6,platform:"Facebook",category:"Abonnés",name:"Facebook — Promotion abonnés",unit:"100 abonnés",price:3,min:10,max:10000},
 {id:7,platform:"Facebook",category:"J’aime",name:"Facebook — Promotion likes",unit:"100 likes",price:1.5,min:50,max:50000},
 {id:8,platform:"YouTube",category:"Abonnés",name:"YouTube — Promotion abonnés",unit:"100 abonnés",price:5,min:10,max:5000},
 {id:9,platform:"YouTube",category:"Vues",name:"YouTube — Promotion vues",unit:"1000 vues",price:1,min:1000,max:1000000}
];
const operators = [
 {id:"orange",name:"Orange Money",env:"ORANGE"},
 {id:"airtel",name:"Airtel Money",env:"AIRTEL"},
 {id:"mpesa",name:"M-Pesa",env:"MPESA"}
];

app.get("/api/services",(req,res)=>res.json(services));
app.get("/api/payment-methods",(req,res)=>res.json(operators.map(o=>({id:o.id,name:o.name,configured:Boolean(process.env[o.env+"_MERCHANT_ID"])}))));

app.post("/api/orders",(req,res)=>{
 const {serviceId,quantity,target,email,customerName,currency="USD"} = req.body;
 const s=services.find(x=>x.id===Number(serviceId));
 if(!s) return res.status(400).json({error:"Service introuvable"});
 const q=Number(quantity);
 if(!target || !q || q<s.min || q>s.max) return res.status(400).json({error:"Lien ou quantité invalide"});
 const total=money((q/s.min)*s.price);
 const db=load();
 const order={id:"CB-"+Date.now()+"-"+crypto.randomBytes(2).toString("hex").toUpperCase(),service:s.name,serviceId:s.id,quantity:q,target,email:email||"",customerName:customerName||"",currency:currency==="CDF"?"CDF":"USD",total,status:"AWAITING_PAYMENT",createdAt:new Date().toISOString()};
 db.orders.push(order); save(db);
 res.json({order});
});

// Initialise un paiement. Sans identifiants marchands, le serveur reste en mode configuration requise.
app.post("/api/payments/initiate",(req,res)=>{
 const {orderId,operator,phone}=req.body;
 const op=operators.find(x=>x.id===operator);
 if(!op) return res.status(400).json({error:"Opérateur Mobile Money invalide"});
 if(!/^\+?[0-9]{9,15}$/.test(String(phone||"").replace(/\s/g,""))) return res.status(400).json({error:"Numéro de téléphone invalide"});
 const db=load(); const order=db.orders.find(x=>x.id===orderId);
 if(!order) return res.status(404).json({error:"Commande introuvable"});
 if(order.status==="PAID") return res.status(409).json({error:"Commande déjà payée"});
 const configured=Boolean(process.env[op.env+"_MERCHANT_ID"]);
 const payment={id:"PAY-"+Date.now()+"-"+crypto.randomBytes(2).toString("hex").toUpperCase(),orderId,operator,phone:String(phone).replace(/\s/g,""),amount:order.total,currency:order.currency,status:configured?"PENDING_PROVIDER":"CONFIG_REQUIRED",createdAt:new Date().toISOString()};
 db.payments.push(payment); order.paymentId=payment.id; order.paymentMethod=operator; order.status=payment.status==="PENDING_PROVIDER"?"PAYMENT_PENDING":"PAYMENT_CONFIGURATION_REQUIRED"; save(db);
 res.json({payment, message:configured?"Paiement initialisé; validation finale par l'opérateur requise.":"Le compte marchand/API n'est pas encore configuré. Aucun paiement n'a été déclaré comme réussi."});
});

app.get("/api/payments/:id",(req,res)=>{
 const db=load(); const p=db.payments.find(x=>x.id===req.params.id);
 if(!p) return res.status(404).json({error:"Paiement introuvable"});
 res.json({payment:p});
});

// Mode de test manuel uniquement. Ne jamais exposer ADMIN_KEY côté navigateur.
app.post("/api/admin/payments/:id/mark-paid",(req,res)=>{
 if(req.get("x-admin-key")!==ADMIN_KEY) return res.status(401).json({error:"Non autorisé"});
 const db=load(); const p=db.payments.find(x=>x.id===req.params.id);
 if(!p) return res.status(404).json({error:"Paiement introuvable"});
 p.status="PAID"; p.paidAt=new Date().toISOString();
 const o=db.orders.find(x=>x.id===p.orderId); if(o){o.status="PAID";o.paidAt=p.paidAt;}
 save(db); res.json({payment:p,order:o});
});

app.get("/api/admin/orders",(req,res)=>{
 if(req.get("x-admin-key")!==ADMIN_KEY) return res.status(401).json({error:"Non autorisé"});
 res.json({orders:load().orders,payments:load().payments});
});

// Webhook normalisé pour un futur connecteur officiel. Le connecteur réel doit vérifier
// la signature de l'opérateur avant d'appeler cette logique.
app.post("/api/webhooks/:provider",(req,res)=>{
 const provider=req.params.provider.toLowerCase();
 if(!operators.some(x=>x.id===provider)) return res.status(404).json({error:"Fournisseur inconnu"});
 const {paymentId,status,transactionId}=req.body||{};
 const db=load(); const p=db.payments.find(x=>x.id===paymentId);
 if(!p) return res.status(404).json({error:"Paiement introuvable"});
 if(["PAID","FAILED","CANCELLED"].includes(status)){
   p.status=status; if(transactionId)p.transactionId=transactionId;
   if(status==="PAID")p.paidAt=new Date().toISOString();
   const o=db.orders.find(x=>x.id===p.orderId); if(o)o.status=status==="PAID"?"PAID":"PAYMENT_"+status;
   save(db);
 }
 res.json({received:true});
});

app.listen(PORT,()=>console.log(`CEPHAS BOOST running on http://localhost:${PORT}`));
