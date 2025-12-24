import OpenAI from 'openai'

let openaiClient: OpenAI | null = null

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set')
    }
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }
  return openaiClient
}

const MOOD_SYSTEM_PROMPT = `You are an empathetic AI helping to understand the emotional mood of messages in digital bottles.

Your task is to analyze the content of a bottle and generate a concise mood description that captures:
1. The emotional tone and sentiment of the content
2. The mood your girlfriend Lovisa will likely feel when reading this bottle
3. The overall atmosphere and feelings the content evokes

IMPORTANT: Always respond in English, regardless of the input language.

Guidelines:
- Be specific and evocative (e.g., "warm nostalgia tinged with gentle longing" not just "happy")
- Consider both the explicit emotions and the underlying feelings
- Think about how Lovisa will feel receiving this message
- Keep it to 1-2 sentences maximum
- Focus on emotions, not just describing the content
- Use poetic, emotional language that captures the essence
- Write everything in English

Examples of good mood descriptions:
- "Tender affection wrapped in playful warmth, evoking butterflies and gentle smiles"
- "Bittersweet nostalgia mixed with hopeful anticipation, like looking at old photos while planning tomorrow"
- "Pure joy and celebration, radiating excitement and shared happiness"
- "Quiet comfort and deep security, like a warm embrace on a cold day"
- "Romantic longing with hints of desire, sweet and intense"`

import type { BottleContent as BottleContentType } from './types'

export type BottleContent = BottleContentType

/**
 * Generate a mood description from bottle content using GPT-4
 */
export async function generateMoodFromContent(content: BottleContent): Promise<string> {
  // Extract all text content from the bottle
  const textContent = content.blocks
    .map((block) => {
      if (block.type === 'text') {
        return block.content
      }
      if (block.type === 'image' || block.type === 'video') {
        if (block.caption) {
          return `[${block.type}] ${block.caption}`
        }
      }
      return `[${block.type}]`
    })
    .filter(Boolean)
    .join('\n\n')

  const openai = getOpenAIClient()
  const response = await openai.chat.completions.create({
    model: 'gpt-5-mini',
    messages: [
      {
        role: 'system',
        content: MOOD_SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: `Analyze this bottle content and generate a mood description:\n\n${textContent}`,
      },
    ],
  })

  const mood = response.choices[0].message.content?.trim()
  if (!mood) {
    throw new Error('Failed to generate mood from OpenAI')
  }

  return mood
}

/**
 * Generate an embedding vector for the mood string using OpenAI's text-embedding-3-small model
 */
export async function generateMoodEmbedding(mood: string): Promise<number[]> {
  const openai = getOpenAIClient()
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: mood,
    dimensions: 1536,
  })

  return response.data[0].embedding
}

/**
 * Generate both mood description and embedding from bottle content
 */
export async function generateMoodAndEmbedding(
  content: BottleContent,
): Promise<{ mood: string; embedding: number[] }> {
  const mood = await generateMoodFromContent(content)
  const embedding = await generateMoodEmbedding(mood)

  return { mood, embedding }
}

const QUERY_MOOD_SYSTEM_PROMPT = `You are an empathetic AI helping Lovisa find the perfect bottle to open based on her journal entry.

Your task is to analyze Lovisa's journal entry and determine what emotional mood or message she might need or want right now.

IMPORTANT: Always respond in English only, regardless of the input language.

Guidelines:
- Read between the lines - understand her emotional state
- Consider what mood would complement or support how she's feeling
- Think about what kind of message would resonate with her right now
- Output ONLY the mood description in English, nothing else (no other commentary)
- Be specific and evocative (e.g., "warm nostalgia tinged with gentle longing" not just "happy")
- Keep it to 1-2 sentences maximum
- Use poetic, emotional language
- Write everything in English

Examples:
If she writes about missing someone: "Tender affection and warm nostalgia, comforting and sweet"
If she writes about excitement: "Pure joy and celebration, radiating energy and happiness"
If she writes about stress: "Quiet comfort and gentle reassurance, calming and supportive"
If she writes about gratitude: "Deep appreciation mixed with contentment, heartwarming and peaceful"`

const BOTTLE_PICKER_SYSTEM_PROMPT = `You are helping Lovisa choose the perfect bottle to open based on her journal entry.

You will be given:
1. Lovisa's journal entry (may be in any language)
2. A list of bottles (up to 5) with their moods and IDs

Your task is to pick the BEST bottle for her right now by understanding:
- Her current emotional state from the journal
- Which bottle's mood would resonate most with her
- What message would be most meaningful to her at this moment

CRITICAL: You must respond with ONLY a single number indicating which bottle to pick (e.g., "1" or "3").
- Output ONLY the number, nothing else
- No explanations, no extra words, just the number
- The number must be between 1 and the total number of bottles provided

Think carefully about the emotional match, but output only the number.`

/**
 * Generate a mood query from a journal entry
 * AI analyzes the journal and determines what mood Lovisa might need/want
 */
export async function generateMoodQuery(journalText: string): Promise<string> {
  const openai = getOpenAIClient()
  const response = await openai.chat.completions.create({
    model: 'gpt-5-mini',
    messages: [
      {
        role: 'system',
        content: QUERY_MOOD_SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: `Analyze this journal entry and determine what mood Lovisa might need or want right now:\n\n${journalText}`,
      },
    ],
  })

  const moodQuery = response.choices[0].message.content?.trim()
  if (!moodQuery) {
    throw new Error('Failed to generate mood query from OpenAI')
  }

  return moodQuery
}

/**
 * AI picks the best bottle from top 5 candidates
 */
export async function pickBestBottle(
  journalText: string,
  bottles: Array<{ id: number; mood: string; name: string }>,
): Promise<number> {
  if (bottles.length === 0) {
    throw new Error('No bottles provided to pick from')
  }

  const bottleList = bottles
    .map((bottle, index) => `${index + 1}. [ID: ${bottle.id}] "${bottle.name}" - Mood: ${bottle.mood}`)
    .join('\n')

  const openai = getOpenAIClient()
  const response = await openai.chat.completions.create({
    model: 'gpt-5-mini',
    messages: [
      {
        role: 'system',
        content: BOTTLE_PICKER_SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: `Journal entry:\n${journalText}\n\nAvailable bottles:\n${bottleList}\n\nWhich bottle should Lovisa open? Reply with only the number (1-${bottles.length}).`,
      },
    ],
  })

  const choice = response.choices[0].message.content?.trim()
  if (!choice) {
    throw new Error('Failed to get bottle choice from OpenAI')
  }

  // Parse the number - should be 1-5
  const choiceNum = parseInt(choice, 10)
  if (isNaN(choiceNum) || choiceNum < 1 || choiceNum > bottles.length) {
    console.error(`Invalid AI choice: ${choice}, defaulting to first bottle`)
    return bottles[0].id
  }

  // Return the actual bottle ID (choiceNum is 1-indexed)
  return bottles[choiceNum - 1].id
}

/**
 * Generate an embedding for text (mood query or journal entry)
 */
export async function generateTextEmbedding(text: string): Promise<number[]> {
  const openai = getOpenAIClient()
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
    dimensions: 1536,
  })

  return response.data[0].embedding
}
