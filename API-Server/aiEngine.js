const MODEL = 'phi3';

async function generateWithTimeout(prompt, timeoutMs = 120000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch('http://127.0.0.1:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        prompt: prompt,
        stream: false,
        format: "json",
        options: {
          temperature: 0.2
        }
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json();
    try {
      return JSON.parse(data.response);
    } catch (e) {
      // If model hallucinates non-JSON despite format: "json"
      return { _raw: data.response };
    }
  } catch (error) {
    clearTimeout(timeoutId);
    console.error("AI Engine Error:", error.message);
    throw new Error('AI Unavailable or timeout');
  }
}

async function analyzeFailure(input) {
  const prompt = `You are a DevOps expert AI. Analyze the following failure data and return ONLY a structured JSON response.
Do NOT include any markdown formatting, just the raw JSON object.
Input Data:
${JSON.stringify(input, null, 2)}

Expected JSON Output:
{
  "root_cause": "The exact technical reason for failure",
  "explanation": "A simple 1-2 sentence explanation",
  "fix": "Actionable steps to fix this issue",
  "severity": "low | medium | high"
}`;
  
  return generateWithTimeout(prompt, 300000); // 300s timeout (5 minutes)
}

async function summarizeLogs(logs) {
   const prompt = `Analyze these application logs and return ONLY a JSON summary. Do NOT include markdown blocks.
Logs:
${logs}

Expected JSON Output:
{
  "total_errors": 0,
  "most_frequent_error": "string",
  "last_critical_error": "string"
}`;
  return generateWithTimeout(prompt, 300000); // 300s timeout
}

module.exports = {
  analyzeFailure,
  summarizeLogs
};
