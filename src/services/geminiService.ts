import { GoogleGenAI, Type, Modality } from "@google/genai";
import { LessonData } from "../types";
import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

// Export the AI instance for use in Live components
export const genAIClient = ai;

// Helper to validate API key
const validateApiKey = (customKey?: string) => {
  const apiKey = customKey || process.env.API_KEY || '';
  if (!apiKey || apiKey === 'PLACEHOLDER_API_KEY') {
    throw new Error("Gemini API Key is missing or set to placeholder. Please update .env.local.");
  }
  return apiKey;
};

// Helper to strip markdown code blocks if present
const cleanJSON = (text: string) => {
  const match = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/);
  return match ? match[1] : text;
};

// Retry helper for heavy operations
const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 2000
): Promise<T> => {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      // Check for rate limit / quota errors / overload
      const isRateLimit =
        error.code === 429 ||
        error.status === 429 ||
        error.message?.includes('429') ||
        error.message?.toLowerCase().includes('quota') ||
        error.message?.includes('RESOURCE_EXHAUSTED') ||
        error.message?.includes('overloaded');

      if (i === maxRetries || !isRateLimit) {
        throw error;
      }

      const delay = baseDelay * Math.pow(2, i);
      console.warn(`Gemini API Quota/Overload hit. Retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error("Operation failed after retries");
};

export const generateLessonPlan = async (topic: string, level: string, language: string = 'English', apiKey?: string): Promise<LessonData> => {
  const effectiveKey = validateApiKey(apiKey);

  // 1. Check Firestore Cache first to save API Quota
  try {
    const cacheKey = `lesson_${topic.toLowerCase().trim()}_${level.toLowerCase().trim()}_${language.toLowerCase().trim()}`.replace(/[^a-z0-9]/g, '_');
    const docRef = doc(db, 'lessonCache', cacheKey);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      console.log('Serving lesson plan from Firestore cache:', cacheKey);
      return docSnap.data() as LessonData;
    }
  } catch (err) {
    console.warn("Cache read failed, falling back to API:", err);
  }

  const localAi = new GoogleGenAI({ apiKey: effectiveKey });

  // ONLY gemini-2.5-flash is available for this key. 
  // No fallback to 1.5 is possible. We must rely on retries.
  const lessonPlan = await retryOperation(async () => {
    return await _generateWithModel(localAi, "gemini-2.5-flash", topic, level, language);
  }, 4, 3000); // Increased retries to 4, base delay to 3s (3, 6, 12, 24 seconds)

  // 2. Save generated plan to Cache for future requests
  try {
    const cacheKey = `lesson_${topic.toLowerCase().trim()}_${level.toLowerCase().trim()}_${language.toLowerCase().trim()}`.replace(/[^a-z0-9]/g, '_');
    await setDoc(doc(db, 'lessonCache', cacheKey), lessonPlan);
  } catch (err) {
    console.warn("Cache write failed:", err);
  }

  return lessonPlan;
};

export const generateLessonSummaryStream = async (topic: string, level: string, language: string, onChunk: (text: string) => void, apiKey?: string): Promise<string> => {
  const effectiveKey = validateApiKey(apiKey);
  const localAi = new GoogleGenAI({ apiKey: effectiveKey });

  const prompt = `Create a highly detailed and comprehensive lesson guide for a ${level} student about "${topic}" in the language "${language}". 
    Do NOT just provide a short definition. The response MUST be a deep-dive, detailed explanation covering all core topics, fundamentals, background context, and essential concepts. It should be formatted in polished Markdown (with suitable paragraph breaks, bold text, or lists if needed) so it reads like a proper textbook chapter.
    Note: Do not include a quiz or diagram prompt in this text. Just the comprehensive educational content.`;

  try {
    const responseStream = await localAi.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    let fullText = '';
    for await (const chunk of responseStream) {
      if (chunk.text) {
        fullText += chunk.text;
        onChunk(fullText); // Send cumulative text to UI to simulate typing
      }
    }
    return fullText;
  } catch (error: any) {
    if (error.message?.includes('429') || error.message?.includes('quota')) {
      throw new Error("⚠️ High Traffic: The AI server is currently busy. Please wait 10-20 seconds and try again.");
    }
    throw error;
  }
};

export const generateLessonMetadata = async (topic: string, level: string, language: string, summaryText: string, apiKey?: string): Promise<Omit<LessonData, 'topic' | 'level' | 'summary' | 'sessionId' | 'timestamp' | 'teacherName' | 'videoUrl' | 'imageUrl' | 'audioUrl'>> => {
  const effectiveKey = validateApiKey(apiKey);
  const localAi = new GoogleGenAI({ apiKey: effectiveKey });

  const prompt = `Based on the following lesson summary about "${topic}" for a ${level} student (Language: ${language}):
   
   SUMMARY:
   ${summaryText.substring(0, 3000)}...

   Please extract/generate the following:
   1. 3-5 key learning points.
   2. A detailed English prompt describing an educational image/diagram that represents this topic.
   3. A short quiz with 3 multiple choice questions (with hints for each).
   Ensure the questions and key points are in ${language}.`;

  return await retryOperation(async () => {
    const response = await localAi.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
            imagePrompt: { type: Type.STRING, description: "A detailed prompt in English to generate an educational diagram." },
            quiz: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctAnswer: { type: Type.INTEGER, description: "Index of the correct option (0-based)" },
                  hint: { type: Type.STRING, description: "A helpful hint if the student gets it wrong." }
                },
                required: ["question", "options", "correctAnswer", "hint"]
              }
            }
          },
          required: ["keyPoints", "imagePrompt", "quiz"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No metadata response");
    return JSON.parse(cleanJSON(text));
  });
};

const _generateWithModel = async (aiInstance: GoogleGenAI, model: string, topic: string, level: string, language: string): Promise<LessonData> => {
  const prompt = `Create a highly detailed and comprehensive lesson guide for a ${level} student about "${topic}" in the language "${language}". 
    Do NOT just provide a short definition. The 'summary' field MUST be a deep-dive, detailed explanation covering all core topics, fundamentals, background context, and essential concepts. It should be formatted in polished Markdown (with suitable paragraph breaks, bold text, or lists if needed) so it reads like a proper textbook chapter.
    Include 3-5 key learning points, a prompt for a descriptive diagram/image that would help explain the concept, 
    and a short quiz with 3 multiple choice questions (with hints for each).
    Ensure all content (summary, questions, options, hints) is in ${language}.`;

  const response = await aiInstance.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          topic: { type: Type.STRING },
          level: { type: Type.STRING },
          summary: { type: Type.STRING },
          keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
          imagePrompt: { type: Type.STRING, description: "A detailed prompt in English to generate an educational diagram or illustration." },
          quiz: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctAnswer: { type: Type.INTEGER, description: "Index of the correct option (0-based)" },
                hint: { type: Type.STRING, description: "A helpful hint if the student gets it wrong." }
              },
              required: ["question", "options", "correctAnswer", "hint"]
            }
          }
        },
        required: ["topic", "summary", "keyPoints", "imagePrompt", "quiz"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error(`No response from AI (${model})`);

  try {
    return JSON.parse(cleanJSON(text)) as LessonData;
  } catch (e) {
    console.error(`Failed to parse lesson plan JSON from ${model}`, e);
    throw new Error(`Invalid response format from AI (${model})`);
  }
};

export const generateLessonImage = async (prompt: string, apiKey?: string): Promise<string> => {
  const effectiveKey = validateApiKey(apiKey);
  const localAi = new GoogleGenAI({ apiKey: effectiveKey });

  return await retryOperation(async () => {
    // specific model for image generation
    const model = "imagen-3.0-generate-001";

    try {
      const response = await localAi.models.generateImages({
        model,
        prompt: `Educational diagram: ${prompt}`,
        config: {
          numberOfImages: 1,
          aspectRatio: '16:9',
          outputMimeType: 'image/jpeg'
        }
      });

      const base64 = response.generatedImages?.[0]?.image?.imageBytes;
      if (!base64) throw new Error("No image generated.");

      return `data:image/jpeg;base64,${base64}`;
    } catch (error: any) {
      console.warn("Imagen generation failed, falling back to Pollinations.ai:", error.message);
      // Fallback to Pollinations.ai (Free, valid for educational demos)
      const encodedPrompt = encodeURIComponent(prompt.substring(0, 100)); // Truncate for URL safety
      return `https://pollinations.ai/p/${encodedPrompt}?width=1280&height=720&nologo=true&seed=${Math.floor(Math.random() * 1000)}`;
    }
  });
};

export const generateLessonVideo = async (prompt: string, apiKey?: string): Promise<string> => {
  const effectiveKey = validateApiKey(apiKey);

  // Note: Veo access is restricted.
  const veoAi = new GoogleGenAI({ apiKey: effectiveKey });

  try {
    let operation = await veoAi.models.generateVideos({
      model: 'veo-2.0-generate-001', // Updated to latest Veo model if available, or fallback to veo-1.0-generate-001
      prompt: `Educational video, high quality, clear visualization: ${prompt}`,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '16:9'
      }
    });

    // Polling for video completion
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await veoAi.operations.getVideosOperation({ operation: operation });
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) throw new Error("Video generation failed: No URI returned.");

    // The URI is usually a GCS path or similar that requires authentication. 
    // For this demo, we might need a signed URL or proxy. 
    // However, the SDK usually handles this if we use the right access method.
    // If 'videoUri' is not directly fetchable, we might simply return it and let the frontend handle it 
    // (though the frontend expects a blob/url).

    // Attempt to fetch if it's a public/accessible URL
    const vidResponse = await fetch(`${videoUri}&key=${process.env.API_KEY}`);
    if (!vidResponse.ok) throw new Error("Failed to fetch generated video content.");
    const blob = await vidResponse.blob();
    return URL.createObjectURL(blob);

  } catch (error: any) {
    console.error("Video generation error:", error);
    if (error.message?.includes('403') || error.message?.includes('permission') || error.message?.includes('404')) {
      // Return a special flag or handle in UI. 
      // For now, rethrow so UI can show the specific message.
      throw new Error("Veo video generation is restricted. Please contact Google for access.");
    }
    throw error;
  }
};

export const generateLessonAudio = async (text: string, apiKey?: string): Promise<string> => {
  const effectiveKey = validateApiKey(apiKey);
  const localAi = new GoogleGenAI({ apiKey: effectiveKey });

  return await retryOperation(async () => {
    const response = await localAi.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: [{ text: text.substring(0, 500) }] },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
        }
      }
    });

    const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64) throw new Error("Audio generation failed");
    return base64;
  });
};

export const analyzeStudentAttention = async (imageBase64: string, apiKey?: string): Promise<{ status: 'focused' | 'distracted' | 'confused' | 'away', confidence: number }> => {
  const effectiveKey = validateApiKey(apiKey);
  const localAi = new GoogleGenAI({ apiKey: effectiveKey });

  const model = "gemini-2.5-flash";
  const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;

  const response = await localAi.models.generateContent({
    model,
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
        { text: "Analyze the student's facial expression and posture in this webcam frame. Are they 'focused' (looking directly at screen/camera, attentive), 'distracted' (looking significantly away, using a phone, talking to someone else), 'confused' (frowning, scratching head, squinting), or 'away' (no person visible in frame)? Return JSON with 'status' (strictly one of these 4 words) and 'confidence' (0 to 1). Be highly sensitive to 'away' if no face is visible." }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          status: { type: Type.STRING, enum: ['focused', 'distracted', 'confused', 'away'] },
          confidence: { type: Type.NUMBER }
        }
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("No attention analysis response");

  try {
    const result = JSON.parse(cleanJSON(text));
    // Ensure the status strictly matches the UI types
    if (!['focused', 'distracted', 'confused', 'away'].includes(result.status)) {
      result.status = 'focused';
    }
    return result;
  } catch (e) {
    console.error("Failed to parse attention analysis", e);
    return { status: 'focused', confidence: 0 };
  }
};

export const chatWithTutor = async (history: { role: string, parts: any[] }[], message: string, context: string, imageBase64?: string, apiKey?: string) => {
  const effectiveKey = validateApiKey(apiKey);
  const localAi = new GoogleGenAI({ apiKey: effectiveKey });

  const model = "gemini-2.5-flash";

  const systemInstruction = `You are a friendly and adaptive Virtual Teaching Assistant (VTA). 
  The student is currently learning about this content: ${context}.
  
  Your goal is to guide the student. 
  - If they upload an image, analyze it to help them.
  - If they ask a direct question, answer clearly but encourage critical thinking.
  - If they seem stuck, provide a scaffolded hint.
  - If the student explicitly asks to generate a diagram, image, or picture, DO NOT describe it in text. Instead, reply ONLY with this exact format: [GENERATE_IMAGE: <detailed description of the image to generate>].
  - Keep responses concise (under 100 words) unless explaining a complex concept.`;

  const chat = localAi.chats.create({
    model,
    config: { systemInstruction },
    history: history
  });

  const parts: any[] = [{ text: message }];
  if (imageBase64) {
    const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
    parts.unshift({ inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } });
  }

  const response = await chat.sendMessage({ message: parts });
  if (!response.text) throw new Error("No chat response");
  return response.text;
};
export const searchRelatedResources = async (topic: string, level: string, query?: string, apiKey?: string) => {
  const effectiveKey = validateApiKey(apiKey);
  const searchQuery = query ? `${query} related to ${topic}` : topic;

  // 1. Check Firestore Cache first
  try {
    const cacheKey = `search_${searchQuery.toLowerCase().trim()}_${level.toLowerCase().trim()}`.replace(/[^a-z0-9]/g, '_');
    const docRef = doc(db, 'resourceCache', cacheKey);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      console.log('Serving search resources from cache:', cacheKey);
      return docSnap.data().results;
    }
  } catch (err) {
    console.warn("Resource cache read failed:", err);
  }

  const localAi = new GoogleGenAI({ apiKey: effectiveKey });
  const model = "gemini-2.5-flash";

  const prompt = `Act as an educational resource curator for a ${level} student. 
  Find 4-5 high-quality related resources for the topic: "${searchQuery}".
  Provide a mix of:
  - YouTube search links (type: 'video')
  - Wikipedia or Educational site links (type: 'article')
  - Specific sub-topics to explore (type: 'topic')
  
  For each resource, include a helpful 1-sentence description.
  Return the results in a JSON array format.`;

  return await retryOperation(async () => {
    const response = await localAi.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              url: { type: Type.STRING },
              type: { type: Type.STRING, enum: ['video', 'article', 'topic'] }
            },
            required: ["title", "description", "url", "type"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No search results response");

    try {
      const results = JSON.parse(cleanJSON(text));
      // 2. Save generated resources to Cache
      try {
        const cacheKey = `search_${searchQuery.toLowerCase().trim()}_${level.toLowerCase().trim()}`.replace(/[^a-z0-9]/g, '_');
        await setDoc(doc(db, 'resourceCache', cacheKey), { results });
      } catch (err) {
        console.warn("Resource cache write failed:", err);
      }
      return results;
    } catch (e) {
      throw new Error("Failed to parse search results");
    }
  }).catch((e) => {
    console.warn("API Quota exceeded or error in searchRelatedResources. Generating fallback offline resources.", e);
    // Provide an offline fallback so the UI never appears broken during strict quota limits (15 RPM)
    return [
      {
        title: `Khan Academy: ${topic}`,
        description: `Explore free comprehensive video courses and interactive exercises on ${topic}.`,
        url: `https://www.khanacademy.org/search?page_search_query=${encodeURIComponent(topic)}`,
        type: 'video'
      },
      {
        title: `Wikipedia: ${topic}`,
        description: `Read the detailed Wikipedia encyclopedia entry for ${topic}.`,
        url: `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(topic)}`,
        type: 'article'
      },
      {
        title: `Coursera: Deep Dive into ${topic}`,
        description: `Search for university-level certificate programs related to ${topic}.`,
        url: `https://www.coursera.org/search?query=${encodeURIComponent(topic)}`,
        type: 'topic'
      },
      {
        title: `YouTube: ${topic} Crash Course`,
        description: `Find highly-rated crash courses and visual explainers on YouTube.`,
        url: `https://www.youtube.com/results?search_query=${encodeURIComponent(topic)}+crash+course`,
        type: 'video'
      }
    ];
  });
};

export const generatePracticeExam = async (topic: string, level: string, type: 'theory' | 'practical' | 'both', totalMarks: number, apiKey?: string): Promise<string> => {
  const effectiveKey = validateApiKey(apiKey);

  // 1. Check Firestore Cache
  try {
    const cacheKey = `exam_${topic.toLowerCase().trim()}_${level.toLowerCase().trim()}_${type}_${totalMarks}`.replace(/[^a-z0-9]/g, '_');
    const docRef = doc(db, 'examCache', cacheKey);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      console.log('Serving practice exam from cache:', cacheKey);
      return docSnap.data().content;
    }
  } catch (err) {
    console.warn("Exam cache read failed:", err);
  }

  const localAi = new GoogleGenAI({ apiKey: effectiveKey });

  return await retryOperation(async () => {
    const prompt = `Create a highly professional academic Practice Exam Paper on the topic "${topic}" for a ${level} level student.
    
    Requirements:
    - Exam Type: ${type.toUpperCase()} (If 'both', include a balanced mix of theoretical and practical/numerical questions)
    - Total Marks exactly: ${totalMarks}
    
    Provide the output beautifully formatted in Markdown.
    Structure the paper properly with standard sections like "Instructions", "Section A", etc.
    Include the marks distribution next to each question strictly, ensuring they mathematically sum up exactly to ${totalMarks}, e.g. [5 Marks].
    Do NOT include the answers in the main paper.
    At the very bottom of the generated paper, provide a brief "Marking Scheme" section outlining the key points expected for full marks.`;

    const response = await localAi.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: [{ text: prompt }] },
      config: {
        temperature: 0.7,
      }
    });

    if (!response.text) throw new Error("Failed to generate exam paper.");

    // Save to Cache before returning
    try {
      const cacheKey = `exam_${topic.toLowerCase().trim()}_${level.toLowerCase().trim()}_${type}_${totalMarks}`.replace(/[^a-z0-9]/g, '_');
      await setDoc(doc(db, 'examCache', cacheKey), { content: response.text });
    } catch (err) {
      console.warn("Exam cache write failed:", err);
    }

    return response.text;
  });
};
