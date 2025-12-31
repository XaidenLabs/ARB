/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fileUrl, fileSnippet: initialFileSnippet, fileName, datasetId } = body;

    // We accept either a direct snippet or a URL to fetch
    if (!fileUrl && !initialFileSnippet) {
      return NextResponse.json({ error: "Missing fileUrl or fileSnippet" }, { status: 400 });
    }

    console.log("🔍 Starting AI analysis for:", fileName, fileUrl);

    // 🔹 Try downloading file content (for real inspection)
    let fileSnippet = initialFileSnippet || "";
    if (fileUrl && !initialFileSnippet) {
      try {
        const res = await fetch(fileUrl);
        const blob = await res.blob();
        const text = await blob.text();
        // Limit to first 3000 chars to avoid token limits
        fileSnippet = text.slice(0, 3000);
      } catch (fetchErr) {
        console.warn("⚠️ Could not fetch file content:", fetchErr);
        fileSnippet = "File content unavailable. Only metadata was analyzed.";
      }
    }

    // 🔹 Initialize OpenAI Client for GitHub Models
    const token = process.env.GITHUB_MODELS_TOKEN;
    const client = new OpenAI({
      baseURL: "https://models.inference.ai.azure.com",
      apiKey: token,
    });

    // 🔹 Construct Prompt
    const prompt = `
You are an AI data quality analyst for a research platform.
Analyze the following dataset snippet and metadata to detect spam, gibberish, or low-quality content.

Dataset Name: ${fileName}
Dataset URL: ${fileUrl}

DATA SAMPLE (first lines):
"""
${fileSnippet}
"""

Instructions:
1. Check if the content is "Gibberish" (random text), "Spam" (promotional/irrelevant), or "Empty/Low Effort".
2. Evaluate structure, consistency, and scientific/research value.
3. Assign a "score" (0-100). Files with gibberish or spam MUST have a score < 10.
4. Set "is_spam" to true if the content is invalid, gibberish, or not useful data.

Output EXACTLY this JSON format (no markdown code blocks):
{
  "score": number,
  "is_spam": boolean,
  "reason": "Short summary of your assessment"
}
`;

    // 🔹 Generate Content
    const response = await client.chat.completions.create({
      messages: [
        { role: "system", content: "You are a helpful data analyst." },
        { role: "user", content: prompt },
      ],
      model: "gpt-4o", // Supporting GitHub Models free tier
      temperature: 1,
      max_tokens: 1000,
      top_p: 1,
    });

    const outputText = response.choices[0].message.content || "{}";

    // Clean potential markdown blocks if AI adds them
    const cleanJson = outputText.replace(/```json/g, "").replace(/```/g, "").trim();

    let aiResult = { score: 0, is_spam: false, reason: "Analysis failed" };
    try {
      aiResult = JSON.parse(cleanJson);
    } catch (parseError) {
      console.warn("Failed to parse AI JSON, falling back to regex", parseError);
      // Fallback regex extraction
      const matchScore = outputText.match(/"score":\s*(\d+)/);
      const matchSpam = outputText.match(/"is_spam":\s*(true|false)/);
      if (matchScore) aiResult.score = parseInt(matchScore[1]);
      if (matchSpam) aiResult.is_spam = matchSpam[1] === "true";
    }

    console.log("✅ AI Analysis Result:", aiResult);

    const isRejected = aiResult.is_spam || aiResult.score < 30;
    const finalStatus = isRejected ? "rejected" : "ai_verified";
    const finalScore = isRejected ? 0 : aiResult.score;

    // 🔹 Save AI results to Supabase
    if (datasetId) {
      const { error: updateError } = await supabase
        .from("datasets")
        .update({
          ai_confidence_score: finalScore,
          ai_analysis: aiResult.reason,
          ai_verified_at: new Date().toISOString(),
          status: finalStatus
        })
        .eq("id", datasetId);

      if (updateError)
        console.error("❌ Supabase update error:", updateError.message);
    }

    return NextResponse.json({
      success: true,
      ai_confidence_score: finalScore,
      ai_analysis: aiResult.reason,
      status: finalStatus,
      message: isRejected ? "Dataset rejected by AI analysis." : "AI analyzed dataset successfully.",
    });

  } catch (error: any) {
    console.error("💥 AI analysis error:", error.message);
    return NextResponse.json(
      {
        error: "AI analysis failed.",
        details: error.message,
      },
      { status: 500 }
    );
  }
}