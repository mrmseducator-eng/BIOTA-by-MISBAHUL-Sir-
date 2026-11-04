# PAPER PRO by MISBAHUL SAKLINE — Full Web App

এই সংস্করণে একই ওয়েবসাইটে রয়েছে: Question Paper Builder, Question Bank, Saved Papers, AI Question Generator, Teacher Email Login, Cloud Sync, Answer Key, Print/Save as PDF এবং Backup/Restore।

## গুরুত্বপূর্ণ: GitHub-এ একটিমাত্র index.html যথেষ্ট নয়

নিরাপদ AI ও Cloud Login চালাতে Repository-তে নিচের ফাইলগুলি রাখতে হবে:

- `index.html`
- `config.js`
- `api/generate.js`
- `supabase/schema.sql`
- `vercel.json`

## ধাপ ১ — GitHub আপডেট

1. তোমার বর্তমান Repository-তে পুরোনো `index.html`-এর জায়গায় এই ZIP-এর নতুন `index.html` আপলোড/replace করো।
2. `config.js` ফাইলটি Repository root-এ যোগ করো।
3. `api` নামে folder তৈরি করে তার মধ্যে `generate.js` যোগ করো।
4. `supabase` নামে folder তৈরি করে তার মধ্যে `schema.sql` যোগ করো।
5. `vercel.json` root-এ যোগ করো।
6. সব ফাইল Commit করো।

## ধাপ ২ — Supabase Cloud Login ও Database

1. https://supabase.com এ গিয়ে account খুলে New project তৈরি করো।
2. Project তৈরি হলে SQL Editor খোলো।
3. এই project-এর `supabase/schema.sql` ফাইলের সম্পূর্ণ SQL কপি করে SQL Editor-এ Run করো।
4. Project Settings → API থেকে Project URL এবং anon/publishable key কপি করো।
5. `config.js`-এ `YOUR_SUPABASE_PROJECT_URL` এবং `YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY`-এর জায়গায় ওই দুটি মান বসাও।
6. Supabase Authentication → URL Configuration-এ Site URL হিসেবে তোমার Vercel domain দাও: `https://biota-by-misbahul-sir-a.vercel.app`। Redirect URL-এ একই domain যোগ করো।
7. Email confirmation চালু থাকলে সাইন-আপের পর ইমেইল verify করতে হবে। Public sign-up চালু করার আগে Supabase Auth-এর email/SMTP settings পরীক্ষা করো।

**সুরক্ষা:** Browser-এ কেবল Supabase anon/publishable key ব্যবহার করবে। `service_role` key কখনো `config.js`, GitHub বা chat-এ দেবে না। RLS policies প্রতিটি শিক্ষককে কেবল নিজের rows ব্যবহারের অনুমতি দেয়।

## ধাপ ৩ — AI Generator চালু

1. OpenAI API account-এ API key তৈরি করো। API usage-এর জন্য billing/credit প্রয়োজন হতে পারে।
2. Vercel → তোমার Project → Settings → Environment Variables খোলো।
3. `OPENAI_API_KEY` নামে variable তৈরি করে secret value বসাও।
4. চাইলে `OPENAI_MODEL` নামে variable `gpt-4.1-mini` value-সহ যোগ করতে পারো।
5. Production, Preview এবং Development প্রয়োজনমতো select করো।
6. Save করে Vercel থেকে নতুন Deployment redeploy করো।

**কখনো OpenAI API key `index.html` বা `config.js`-এ বসাবে না।** API key server-side `api/generate.js`-এ `process.env.OPENAI_API_KEY` দিয়ে পড়া হয়।

## ধাপ ৪ — Vercel settings

- Framework Preset: Other (static HTML + Vercel Functions)
- Root Directory: `.` (repository root)
- Output Directory override: বন্ধ/খালি রাখো
- GitHub production branch: তোমার default branch (সাধারণত `main`)
- Commit করলে Vercel নতুন deployment করবে।

যদি Vercel আগে Vite/React project settings ধরে রাখে, Build Command ও Output Directory override সরিয়ে Framework Preset `Other` করে redeploy করো।

## ব্যবহার ও সীমাবদ্ধতা

- Supabase configure না করলে local browser mode কাজ করবে।
- Supabase configure + email verified teacher login হলে papers এবং question bank cloud-এ sync হবে।
- AI endpoint OpenAI API key ছাড়া কাজ করবে না।
- AI-র প্রশ্ন/উত্তর ভুল হতে পারে। শিক্ষককে পাঠ্যবই ও official syllabus দিয়ে যাচাই করতে হবে।
- PDF browser print engine দিয়ে তৈরি হয়; Print dialog-এ Save as PDF নির্বাচন করো।
- এটি একটি working starter app; launch-এর আগে নিজের account-এ end-to-end test, email confirmation, billing limits, privacy notice, rate limiting/abuse protection এবং security review করো।
- কোনো API key, password বা Supabase service-role secret অন্য কারও সঙ্গে শেয়ার করবে না।
