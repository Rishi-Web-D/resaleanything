// Browser flow tests (needs: npm i -D playwright). Same server requirements as tests/api.mjs.
// Usage: BASE_URL=http://localhost:3000 node tests/ui.mjs [scratch-dir]
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
const B=process.env.BASE_URL??'http://localhost:3000', dir=process.argv[2]??process.env.TMPDIR??'/tmp';
const png=Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000002000001e221bc330000000049454e44ae426082','hex');
writeFileSync(dir+'/pic.png',png);
const b=await chromium.launch({args:['--no-sandbox']});
const ok=(c,m)=>console.log(c?'PASS':'FAIL',m);
const mk=async()=> (await b.newContext({viewport:{width:1200,height:900}})).newPage();
const u=Date.now();
const seller=await mk(), buyer=await mk();
async function signup(p,name,email,phone){ await p.goto(B+'/register'); await p.fill('[name=name]',name); await p.fill('[name=email]',email); await p.fill('[name=phone]',phone); await p.fill('[name=password]','password123'); await p.click('button:has-text("Sign up")'); await p.waitForURL(B+'/'); }
await seller.goto(B+'/post'); await seller.waitForURL(/\/login\?next=\/post/,{timeout:8000}).then(()=>ok(true,'/post redirects anonymous to login'),()=>ok(false,'/post redirects anonymous to login'));
await signup(seller,'Sally Seller',`sally${u}@t.com`,'9876500001');
await seller.waitForSelector('text=Hi, Sally'); ok(true,'header shows logged-in user');
await seller.goto(B+'/post');
await seller.fill('[name=title]','UI test camera lens'); await seller.selectOption('main [name=category]','electronics'); await seller.selectOption('main [name=condition]','good');
await seller.fill('textarea[name=description]','Sharp 50mm prime lens, hardly used at all.'); await seller.fill('[name=price]','7000'); await seller.selectOption('main [name=city]','Delhi');
await seller.setInputFiles('[name=images]',dir+'/pic.png'); await seller.click('button:has-text("Post now")');
await seller.waitForSelector('h1:text-is("UI test camera lens")',{timeout:8000}); ok(true,'ad posted with photo');
ok(await seller.locator('img[src^="/api/uploads/"]').count()>=1,'uploaded photo rendered'); 
const adUrl=seller.url();
ok(await seller.getByRole('button',{name:'Mark as sold'}).count()===1,'owner sees manage controls');
await signup(buyer,'Bob Buyer',`bob${u}@t.com`,'9876500002');
await buyer.goto(adUrl); ok(await buyer.getByRole('button',{name:'Mark as sold'}).count()===0,'buyer has no manage controls');
await buyer.getByRole('button',{name:'Show phone number'}).click(); await buyer.waitForSelector('text=📞 9876500001'); ok(true,'buyer reveals seller phone');
await buyer.getByRole('button',{name:'Add favourite'}).first().click(); await buyer.waitForSelector('[aria-label="Remove favourite"]'); 
await buyer.goto(B+'/favorites'); await buyer.waitForSelector('text=UI test camera lens'); ok(true,'favourite shown on server-backed favourites page');
await buyer.goto(adUrl); await buyer.getByRole('button',{name:/Chat with/}).click(); await buyer.waitForURL(/\/messages\/\d+/);
await buyer.fill('input[placeholder="Type a message"]','Is the lens still available?'); await buyer.click('button:has-text("Send")'); await buyer.waitForSelector('text=Is the lens still available?'); ok(true,'buyer sends chat message');
await seller.goto(B+'/messages'); await seller.waitForSelector('text=Is the lens still available?'); await seller.click('text=Bob Buyer'); await seller.waitForURL(/\/messages\/\d+/);
await seller.fill('input[placeholder="Type a message"]','Yes, come pick it up.'); await seller.click('button:has-text("Send")');
await buyer.waitForSelector('text=Yes, come pick it up.',{timeout:8000}); ok(true,'reply arrives at buyer via polling');
await seller.goto(adUrl); await seller.getByRole('button',{name:'Mark as sold'}).click(); await seller.waitForSelector('text=Mark as available'); ok(true,'seller marks ad sold');
await seller.goto(B+'/my-ads'); await seller.waitForSelector('text=SOLD'); ok(true,'my-ads shows sold badge');
await buyer.getByRole('button',{name:'Logout'}).click(); await buyer.waitForSelector('text=Login'); ok(true,'logout');
await seller.screenshot({path:dir+'/myads.png'});
await b.close();
