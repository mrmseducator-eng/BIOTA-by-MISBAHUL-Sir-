
const requestWindows = new Map();

const ALLOWED_TYPES = new Set([
  "MCQ",
  "Very Short Answer",
  "Short Answer",
  "Long Answer",
  "True / False",
  "Fill in the Blanks",
  "Match the Following",
  "Assertion–Reason",
  "Numerical",
  "Diagram-based"
]);

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const authHeader = req.headers.authorization || "";
    const accessToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : "";

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!accessToken) {
      return res.status(401).json({
        error: "Please sign in with your teacher account before using AI generation."
      });
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(503).json({
        error: "AI authentication is not configured. Add SUPABASE_URL and SUPABASE_ANON_KEY in Vercel."
      });
    }

    const authResponse = await fetch(
      `${supabaseUrl.replace(/\/$/, "")}/auth/v1/user`,
      {
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    if (!authResponse.ok) {
      return res.status(401).json({
        error: "Your teacher session is invalid or expired. Please sign in again."
      });
    }

    const teacher = await authResponse.json();
    const userId = teacher && teacher.id;

    if (!userId) {
      return res.status(401).json({
        error: "Could not verify your teacher account."
      });
    }

    const now = Date.now();
    const windowData = requestWindows.get(userId) || {
      start: now,
      count: 0
    };

    if (now - windowData.start > 60000) {
      windowData.start = now;
      windowData.count = 0;
    }

    windowData.count += 1;
    requestWindows.set(userId, windowData);

    if (windowData.count > 10) {
      return res.status(429).json({
        error: "AI usage limit reached for this minute. Please wait and try again."
      });
    }

    const key = process.env.OPENAI_API_KEY;

    if (!key) {
      return res.status(503).json({
        error: "AI is not configured yet. Add OPENAI_API_KEY in Vercel Environment Variables and redeploy."
      });
    }

    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : (req.body || {});

    const topic = String(body.topic || "").trim().slice(0, 500);
    const count = Math.max(1, Math.min(20, Number(body.count) || 5));
    const board = String(body.board || "Other").slice(0, 40);
    const className = String(body.className || "Class 10").slice(0, 30);
    const subject = String(body.subject || "General").slice(0, 80);
    const language = String(body.language || "English").slice(0, 30);
    const difficulty = String(body.difficulty || "Balanced").slice(0, 30);

    const types = Array.isArray(body.types)
      ? body.types
          .map(x => String(x))
          .filter(x => ALLOWED_TYPES.has(x))
          .slice(0, 6)
      : [];

    if (!topic) {
      return res.status(400).json({
        error: "Please provide a chapter or topic."
      });
    }

    const chosenTypes = types.length
      ? types
      : ["MCQ", "Short Answer"];

    const prompt = `Create exactly ${count} original school examination questions for ${className}, board ${board}, subject ${subject}, on this topic: ${topic}. Language: ${language}. Difficulty: ${difficulty}. Question types to use: ${chosenTypes.join(", ")}. Return valid JSON only with this shape: {"questions":[{"type":"MCQ|Very Short Answer|Short Answer|Long Answer|True / False|Fill in the Blanks|Match the Following|Assertion–Reason|Numerical|Diagram-based","text":"question text","options":["A","B","C","D"],"marks":1,"answer":"correct or expected answer","explanation":"brief explanation"}]}. For non-MCQ questions options must be []. For MCQ include exactly four plausible options and identify the correct option in answer (e.g. A) with explanation. Do not invent board-specific syllabus claims; keep questions age-appropriate, factually careful and unambiguous. If the requested language is Bengali, write Bengali; if Bilingual, provide Bengali and English together. Never claim the output is officially approved.`;

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
          temperature: 0.4,
          response_format: {
            type: "json_object"
          },
          messages: [
            {
              role: "system",
              content: "You are a careful school examination question writer. Output valid JSON only. Accuracy matters; do not fabricate facts."
            },
            {
              role: "user",
              content: prompt
            }
          ]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const message =
        data && data.error && data.error.message
          ? data.error.message
          : "AI provider request failed.";

      return res
        .status(response.status === 429 ? 429 : 502)
        .json({ error: message });
    }

    const raw = data.choices?.[0]?.message?.content;

    if (!raw) {
      return res.status(502).json({
        error: "The AI provider returned an empty response."
      });
    }

    const parsed = JSON.parse(raw);

    const questions = Array.isArray(parsed.questions)
      ? parsed.questions
          .slice(0, count)
          .map(q => ({
            type: ALLOWED_TYPES.has(q.type)
              ? q.type
              : "Short Answer",
            text: String(q.text || "").slice(0, 3000),
            options: Array.isArray(q.options)
              ? q.options.slice(0, 4).map(x => String(x).slice(0, 500))
              : [],
            marks: Math.max(
              0,
              Math.min(100, Number(q.marks) || 1)
            ),
            answer: String(q.answer || "").slice(0, 2000),
            explanation: String(q.explanation || "").slice(0, 3000)
          }))
          .filter(q => q.text)
      : [];

    if (!questions.length) {
      return res.status(502).json({
        error: "No valid questions could be generated. Try another topic."
      });
    }

    return res.status(200).json({ questions });

  } catch (error) {
    console.error("Question generation error:", error);

    return res.status(500).json({
      error: "Could not generate questions. Please try again."
    });
  }
};
