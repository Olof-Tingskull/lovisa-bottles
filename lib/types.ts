// Re-export types from schemas for backward compatibility
// These types are now inferred from Zod schemas to ensure validation and types stay in sync
export type {
  TextBlock,
  ImageBlock,
  VideoBlock,
  VoiceBlock,
  BottleBlock,
  BottleContent,
} from './schemas'

export type BottleBlockType = 'text' | 'image' | 'video' | 'voice'
