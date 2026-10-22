// API integration tests against the Express server.
// Needs a FRESH MongoDB database (expects the 26 seed ads) and a backend started with a high AUTH_RATE_MAX
// and, in production mode, INSECURE_COOKIES=1. Usage: BASE_URL=http://localhost:4000 node tests/api.mjs
const B=process.env.BASE_URL??'http://localhost:4000';
let pass=0, fail=0;
const ok=(c,m)=>{c?pass++:fail++; console.log(c?'PASS':'FAIL',m)};
class Client{ cookie=''; async req(m,p,body,headers={}){ const isForm=body instanceof FormData;
  const r=await fetch(B+p,{method:m,headers:{...(body&&!isForm?{'Content-Type':'application/json'}:{}),...(this.cookie?{cookie:this.cookie}:{}),...headers},body:body?(isForm?body:JSON.stringify(body)):undefined,redirect:'manual'});
  const sc=r.headers.getSetCookie?.()||[]; for(const c of sc){ const kv=c.split(';')[0]; this.cookie = kv.endsWith('=')?'':kv; }
  let d=null; try{ d=await r.json() }catch{} return {s:r.status,d,r}; } }
const png=Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000002000001e221bc330000000049454e44ae426082','hex');
const a=new Client(), b=new Client(), anon=new Client();
const u=Date.now();

let r=await anon.req('GET','/api/ads?limit=100'); ok(r.s===200&&r.d.length===26,'seed ads persisted & listed (26)');
r=await anon.req('GET','/api/ads?q=sofa'); ok(r.d.length===1,'search q=sofa');
r=await anon.req('GET','/api/ads?q=%25%25%25'); ok(r.d.length===0,'LIKE wildcard not interpreted (q=%%%)');
r=await anon.req('GET','/api/ads?category=mobiles&max=20000&sort=price-asc'); ok(r.d.length===1,'filter category+max');
r=await anon.req('POST','/api/ads',{title:'x'}); ok(r.s===401,'post ad requires login');
r=await anon.req('GET','/api/favorites'); ok(r.s===401,'favorites requires login');

r=await a.req('POST','/api/auth/register',{name:'Alice',email:`alice${u}@t.com`,phone:'9876543210',password:'short'}); ok(r.s===422&&r.d.fields.password,'weak password rejected');
r=await a.req('POST','/api/auth/register',{name:'Alice',email:`alice${u}@t.com`,phone:'12345',password:'password123'}); ok(r.s===422&&r.d.fields.phone,'bad phone rejected');
r=await a.req('POST','/api/auth/register',{name:'Alice',email:`alice${u}@t.com`,phone:'9876543210',password:'password123'}); ok(r.s===201&&a.cookie.startsWith('ra_session='),'register + session cookie');
const setc=(await fetch(B+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:`alice${u}@t.com`,password:'password123'})})).headers.get('set-cookie');
ok(/HttpOnly/i.test(setc)&&/SameSite=lax/i.test(setc),'cookie HttpOnly + SameSite=Lax');
r=await anon.req('POST','/api/auth/register',{name:'Dup',email:`ALICE${u}@t.com`,phone:'9876543210',password:'password123'}); ok(r.s===409,'duplicate email (case-insens.) rejected');
r=await a.req('GET','/api/auth/me'); ok(r.d.user?.email===`alice${u}@t.com`,'me returns user');
r=await anon.req('POST','/api/auth/login',{email:`alice${u}@t.com`,password:'wrongpass1'}); ok(r.s===401,'wrong password 401');
r=await anon.req('POST','/api/auth/login',{email:'seed@seed.invalid',password:'anything12'}); ok(r.s===401,'seed users cannot log in');
r=await b.req('POST','/api/auth/register',{name:'Bob',email:`bob${u}@t.com`,phone:'9123456780',password:'password123'}); ok(r.s===201,'second user');

const f=new FormData(); f.set('title','Alice test bike'); f.set('description','A very nice bicycle in great shape.'); f.set('price','4500'); f.set('category','vehicles'); f.set('condition','good'); f.set('city','Pune');
f.append('images',new Blob([png],{type:'image/png'}),'a.png');
r=await a.req('POST','/api/ads',f); ok(r.s===201&&r.d.images.length===1,'create ad with image');
const adId=r.d.id; const img=r.d.images[0];
const ir=await fetch(`${B}/api/uploads/${img}`); ok(ir.status===200&&ir.headers.get('content-type')==='image/png','serve uploaded image');
ok((await fetch(`${B}/api/uploads/..%2F..%2Fpackage.json`)).status===404,'upload path traversal blocked');
const bad=new FormData(); for(const [k,v] of f.entries()) if(k!=='images') bad.set(k,v); bad.append('images',new Blob(['<script>alert(1)</script>'],{type:'image/png'}),'x.png');
r=await a.req('POST','/api/ads',bad); ok(r.s===422&&r.d.fields.images,'non-image upload rejected (magic bytes)');
r=await a.req('POST','/api/ads',{...Object.fromEntries([...f.entries()].filter(([k])=>k!=='images')),price:'-5'}); ok(r.s===422&&r.d.fields.price,'negative price rejected');
r=await a.req('POST','/api/ads',Object.fromEntries([...f.entries()].filter(([k])=>k!=='images')),{origin:'https://evil.example'}); ok(r.s===403,'cross-origin POST blocked');

r=await anon.req('GET',`/api/ads/${adId}/phone`); ok(r.s===401,'phone hidden from anonymous');
r=await b.req('GET',`/api/ads/${adId}/phone`); ok(r.d.phone==='9876543210','phone shown to logged-in user');
r=await b.req('PATCH',`/api/ads/${adId}`,{status:'sold'}); ok(r.s===403,"can't edit someone else's ad");
r=await b.req('DELETE',`/api/ads/${adId}`); ok(r.s===403,"can't delete someone else's ad");
r=await a.req('PATCH',`/api/ads/${adId}`,{price:4000,status:'sold'}); ok(r.s===200&&r.d.price===4000&&r.d.status==='sold','owner edits price + marks sold');
r=await anon.req('GET','/api/ads?q=Alice test bike'); ok(r.d.length===0,'sold ads hidden from search');

r=await b.req('PUT',`/api/favorites/${adId}`); ok(r.s===200,'favourite added');
r=await b.req('PUT',`/api/favorites/000000000000000000000000`); ok(r.s===404,'favourite on missing ad 404');
r=await b.req('GET','/api/favorites'); ok(r.d.ids.includes(adId)&&r.d.ads.length===1,'favourites persisted');
r=await b.req('DELETE',`/api/favorites/${adId}`); r=await b.req('GET','/api/favorites'); ok(r.d.ids.length===0,'favourite removed');

r=await a.req('POST','/api/conversations',{adId}); ok(r.s===400,"can't chat with yourself");
r=await b.req('POST','/api/conversations',{adId}); ok(r.s===201,'buyer starts conversation'); const cid=r.d.id;
r=await b.req('POST','/api/conversations',{adId}); ok(r.d.id===cid,'conversation is idempotent per ad+buyer');
r=await b.req('POST',`/api/conversations/${cid}/messages`,{body:'Is it available?'}); ok(r.s===201,'buyer sends message');
r=await b.req('POST',`/api/conversations/${cid}/messages`,{body:'   '}); ok(r.s===422,'empty message rejected');
r=await a.req('GET',`/api/conversations/${cid}/messages`); ok(r.d.length===1&&r.d[0].body==='Is it available?','seller reads message');
r=await a.req('POST',`/api/conversations/${cid}/messages`,{body:'Yes!'}); const m2=r.d.id;
r=await b.req('GET',`/api/conversations/${cid}/messages?after=${m2-1}`); ok(r.d.length===1&&r.d[0].body==='Yes!','polling with ?after');
const eve=new Client(); await eve.req('POST','/api/auth/register',{name:'Eve',email:`eve${u}@t.com`,phone:'9000000001',password:'password123'});
r=await eve.req('GET',`/api/conversations/${cid}/messages`); ok(r.s===404,'outsider cannot read conversation');
r=await eve.req('POST',`/api/conversations/${cid}/messages`,{body:'hi'}); ok(r.s===404,'outsider cannot post');
r=await a.req('GET','/api/conversations'); ok(r.d.length===1&&r.d[0].other==='Bob','seller inbox lists chat');

r=await a.req('POST','/api/auth/logout'); r=await a.req('GET','/api/auth/me'); ok(r.d.user===null,'logout invalidates session');
r=await b.req('DELETE',`/api/ads/${adId}`); r=await a.req('POST','/api/auth/login',{email:`alice${u}@t.com`,password:'password123'});
r=await a.req('DELETE',`/api/ads/${adId}`); ok(r.s===200,'owner deletes ad');
ok((await fetch(`${B}/api/uploads/${img}`)).status===404,'image file removed with ad');
r=await b.req('GET',`/api/conversations/${cid}/messages`); ok(r.s===404,'conversation cascaded on ad delete');

// --- Express-level behaviour ---
r=await anon.req('GET','/api/nope'); ok(r.s===404&&r.d?.error==='Not found','unknown API route returns JSON 404');
r=await anon.req('GET','/api/ads/abc'); ok(r.s===404,'non-numeric ad id 404');
{ const raw=await fetch(B+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:'{bad json'}); ok(raw.status===400,'malformed JSON -> 400'); }
{ const h=await fetch(B+'/api/health'); ok(h.headers.get('x-content-type-options')==='nosniff'&&!h.headers.get('x-powered-by'),'security headers set, x-powered-by removed'); }

// --- MongoDB-specific behaviour ---
r=await anon.req('GET','/api/ads?category[$ne]=x&q[$regex]=.*'); ok(r.s===200&&r.d.length===26,'query-string operators are ignored (no NoSQL injection)');
r=await anon.req('POST','/api/auth/login',{email:{$gt:''},password:{$gt:''}}); ok(r.s===401,'login with operator objects rejected');
r=await anon.req('GET','/api/ads?q=.*'); ok(r.d.length===0,'regex characters in search are literal (q=.*)');
r=await anon.req('GET','/api/ads/123456789012'); ok(r.s===404,'12-char non-hex id rejected');
r=await anon.req('GET','/api/ads/000000000000000000000000'); ok(r.s===404,'well-formed but unknown id 404');
{ const dup=await Promise.all([1,2,3,4].map(()=>new Client().req('POST','/api/auth/register',{name:'Race',email:`race${u}@t.com`,phone:'9876543210',password:'password123'})));
  ok(dup.filter(x=>x.s===201).length===1&&dup.filter(x=>x.s===409).length===3,'concurrent signups with one email: exactly one wins'); }
{ const cc=new Client(); await cc.req('POST','/api/auth/register',{name:'Carl',email:`carl${u}@t.com`,phone:'9000000002',password:'password123'});
  const seller=new Client(); await seller.req('POST','/api/auth/register',{name:'Sam',email:`sam${u}@t.com`,phone:'9000000003',password:'password123'});
  const f2=new FormData(); f2.set('title','Concurrency test item'); f2.set('description','Used to test concurrent chat messages.'); f2.set('price','100'); f2.set('category','books'); f2.set('condition','good'); f2.set('city','Pune');
  const ad2=(await seller.req('POST','/api/ads',f2)).d.id; const conv=(await Promise.all([cc.req('POST','/api/conversations',{adId:ad2}),cc.req('POST','/api/conversations',{adId:ad2})])).map(x=>x.d.id);
  ok(conv[0]===conv[1],'concurrent conversation start converges on one thread');
  await Promise.all(Array.from({length:10},(_,i)=>cc.req('POST',`/api/conversations/${conv[0]}/messages`,{body:'m'+i})));
  const all=(await cc.req('GET',`/api/conversations/${conv[0]}/messages`)).d; const seqs=all.map(m=>m.id);
  ok(all.length===10&&new Set(seqs).size===10&&seqs.every((v,i)=>v===i+1),'10 concurrent messages get unique, ordered sequence ids');
  r=await cc.req('GET','/api/conversations'); ok(r.d.length===1&&r.d[0].lastMessage&&r.d[0].other==='Sam','inbox shows last message and counterpart');
  await seller.req('DELETE',`/api/ads/${ad2}`); r=await cc.req('GET',`/api/conversations/${conv[0]}/messages`); ok(r.s===404,'deleting an ad removes its conversations and messages'); }
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail?1:0);
