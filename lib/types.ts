export type BottleBlockType = 'text' | 'image' | 'video' | 'voice'

export interface TextBlock {
  type: 'text'
  content: string
}

export interface ImageBlock {
  type: 'image'
  url: string
  caption?: string
}

export interface VideoBlock {
  type: 'video'
  url: string
  caption?: string
}

export interface VoiceBlock {
  type: 'voice'
  url: string
  duration?: number
}

export type BottleBlock = TextBlock | ImageBlock | VideoBlock | VoiceBlock

export interface BottleContent {
  blocks: BottleBlock[]
}
